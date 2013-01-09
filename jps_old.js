(function () {
	var express = require('express'),
		url = require('url'),
		path = require('path'),
		fs = require('fs'),
		util = require('util'),
		sys = require('sys'),
		ID3 = require('id3'),
		mysql = require('mysql');
	
    var options = {
		musicDir: "E:/Musik",
		//musicDir: "C:/aaa/music",
        extensions: [
            { extension: "", contenttype: "" },
            { extension: ".mp3", contenttype: "audio/mpeg" },
            { extension: ".ogg", contenttype: "audio/ogg" },
            { extension: ".oga", contenttype: "audio/ogg" }
        ],
		connection: {
			  host     : 'localhost',
			  user     : 'root',
			  password : 'sjaak',
			  charset  : 'utf8',
			  database : 'jplay'
		}
	}

	module.exports.configure = function (options) {
		
	}
	
    var getID3size = function (filename) {
        // var fd, buffer;
        var fd = fs.openSync(filename, "r");
        var buffer = new Buffer(4);
        fs.readSync(fd, buffer, 0, 4, 6);
        fs.closeSync(fd);
        return buffer[3] & 0x7f |
        ((buffer[2] & 0x7f) << 7) |
        ((buffer[1] & 0x7f) << 14) |
        ((buffer[0] & 0x7f) << 21);
    }

    var readTag = function (filename) {
        //var buffer, fd;
        if (fs.existsSync(filename)) {
            var size = getID3size(filename);
            if (size < 227) size = 227;
            if (size < 1) return false;
            var buffer = new Buffer(size, "utf8");
            var fd = fs.openSync(filename, "r");
            fs.readSync(fd, buffer, 0, size, 0);
            fs.close(fd);
            return buffer;
        } else return false;
    }


    module.exports.downloadSong = function (req, res) {
        var dir = req.query.dir.replace(/amp;/g, "&");
        var filename = req.query.name.replace(/amp;/g, "&");
        var fullpath = path.join(options.musicDir, dir, filename);
        if (!fs.existsSync(fullpath)) {
            sys.error("Error serving " + fullpath);
            res.writeHead(500, "Invalid song. Re-add song to playlist.");
            res.end();
            return;
        }
        var filesize = fs.statSync(fullpath).size;
        if (req.headers.range == undefined)
            req.headers.range = "-";
        var parts = req.headers.range.replace(/bytes=/, "").split("-");
        var start = parts[0] ? parseInt(parts[0], 10) : 0;
        var end = parts[1] ? parseInt(parts[1], 10) : (filesize ? filesize - 1 : 0);
        res.writeHead(206, {
            'Content-Disposition': 'attachment; filename=' + filename,
            'Content-Type': 'audio/mpeg',
            'Content-length': (end - start) + 1,
            "Connection": "keep-alive",
            "Accept-Ranges": "bytes",
            "Content-Range": "bytes " + start + "-" + end + "/" + (filesize - 1)
        });
        var readStream = fs.createReadStream(fullpath, { start: start, end: end });
        util.pump(readStream, res, function (err) {
        });
    }


    module.exports.getImage = function (req, res, next) {
        var fullpath = path.join(options.musicDir, req.query.dir.replace(/amp;/g, "&"), req.query.file.replace(/amp;/g, "&"));
        if (!fs.existsSync(fullpath)) {
            sys.error("> Error serving " + fullpath + ". File does not exist.");
            res.writeHead(500, "Invalid image. Clear your playlist.");
            res.end();
            return;
        }
        res.sendfile(fullpath);
    }

    module.exports.getMusic = function (req, res) {
        var fullpath, filesize, parts, start, end, contentType, i, readStream;
        fullpath = path.join(options.musicDir, req.query.dir.replace(/amp;/g, "&"), req.query.file.replace(/amp;/g, "&"));
        if (!fs.existsSync(fullpath)) {
            sys.error("Error serving " + fullpath);
            res.writeHead(500, "Could not find requested file.");
            res.end();
            return;
        }
        filesize = fs.statSync(fullpath).size;
        if (req.headers.range == undefined)
            req.headers.range = "-";
        parts = req.headers.range.replace(/bytes=/, "").split("-");
        start = parts[0] ? parseInt(parts[0], 10) : 0;
        end = parts[1] ? parseInt(parts[1], 10) : (filesize ? filesize - 1 : 0);
        for (i = 0; i < options.extensions.length; i++) {
            if (path.extname(fullpath) === options.extensions[i].extension) {
                contentType = options.extensions[i].contenttype;
                break;
            }
        }
        res.writeHead(206, {
            'Content-Type': contentType,
            'Content-length': (end - start) + 1,
            "Connection": "keep-alive",
            "Accept-Ranges": "bytes",
            "Content-Range": "bytes " + start + "-" + end + "/" + filesize
        });
        readStream = fs.createReadStream(fullpath, { start: start, end: end });
        util.pump(readStream, res, function (err) {
        });
    }

    module.exports.dirtree = function (req, res) {
        getFiles(req.query.path, function (err, results) {
            if (err) {
                sys.error("> Error in dirtree serving " + req + " - " + err.message);
                res.writeHead(500, "Wrong URL");
                res.end();
            } else {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.write(results.toString('utf8'));
                res.end();
            }
        });
    }

    var getFiles = function (dir, done) {
        var dir2 = path.join(options.musicDir, dir);
        fs.readdir(dir2, function (err, files) {
            //var results, pending, cover;
            if (err) return done(err);
            var results = [];
            var pending = files.length;
            if (pending == 0) done(null, results);
            var cover = null;
            files.forEach(function (file) {
                var fullPath = new Buffer(path.join(dir2, file), "utf8").toString("utf8").toLowerCase();
                if (path.extname(fullPath) == ".png" ||
                path.extname(fullPath) == ".jpg" ||
                path.extname(fullPath) == ".jpeg") {
                    cover = file;
                    return;
                }
            });
            files.forEach(function (file) {
                //var fullPath, stat, isDir, id, result, id3, title;
                var fullPath = new Buffer(path.join(dir2, file), "utf8").toString("utf8");
                --pending;
                approvedExt = false;
                for (var i = 0; i < options.extensions.length; i++) {
                    if (options.extensions[i].extension === path.extname(fullPath)) {
                        approvedExt = true;
                        break;
                    }
                }
                if (fs.existsSync(fullPath) &&
                    approvedExt) {
                    var stat = fs.statSync(fullPath);
                    if (stat) {
                        var isDir = stat.isDirectory(stat);
                        var id = toId(file);
                        var result = {
                            "data": {
                                title: file,
                                icon: isDir ? "/img/foldericon.png" : "/img/playbutton.png"
                            },
                            "attr": {
                                "id": id,
                                "rel": isDir ? "dir" : "song",
                                "href": "#"
                            },
                            "metadata": {
                                "id": id,
                                "name": file,
                                "dir": dir,
                                "fullPath": dir + "/" + file,
                                "filesize": stat.size,
                                "isDir": isDir,
                                "cover": cover
                            }
                        };
                        if (!isDir) {
                            var id3 = new ID3(readTag(fullPath));
                            id3.parse();
                            var title = id3.get("title");
                            if (title) {
                            result.data.title = title;
                            result.metadata.title = title;
                            }
                            result.metadata.artist = id3.get("artist");
                            result.metadata.year = id3.get("year");
                            result.metadata.album = id3.get("album");
                        } else { result.state = "closed"; }
                        results.push(result);
                    }
                }
                if (!pending) {
                    done(null, JSON.stringify(results));
                }
            });
        });
    }

    function toId(str) {
        if (str == undefined) return;
        return "node_" + str.replace(path.extname(str), "").replace(/[\[\]\(\)\.&,\']/g, "").replace(/ /g, "_").toLowerCase();
    }

    module.exports.refreshSearchtree = function (req, res) {
        walk(options.musicDir, function (err, result, acres) {
            var text = "jplay.searchfn.array = " + JSON.stringify(result) + ";\n";
            text += "jplay.searchfn.autocompletearray = " + JSON.stringify(acres) + ";";
            fs.writeFile("./public/search.js", text, function (err) {
                console.log("Refresh done!");
                res.send(JSON.stringify(result) + "\n" + JSON.stringify(acres));
            });
        });
    }

    var walk = function (dir, done) {
        var results = [];
        var autocompleteresults = [];
        fs.readdir(dir, function (err, list) {
            if (err) return done(err);
            var i = 0;
            (function next() {
                var file = list[i++];
                if (!file) return done(null, results, autocompleteresults);
                file = dir + '/' + file;
                fs.stat(file, function (err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function (err, res, acres) {
                            //var ids, i;
                            var ids = file.replace(options.musicDir, "").split("/").filter(String);
                            for (var i = 0; i < ids.length; i++) {
                                ids[i] = toId(ids[i]);
                            };
                            var result = {
                                "text": (file.split("/"))[file.split("/").length - 1],
                                "ids": ids
                            }
                            results.push(result);
                            results = results.concat(res);
                            acresult = (file.split("/"))[file.split("/").length - 1];
                            autocompleteresults.push(acresult);
                            autocompleteresults = autocompleteresults.concat(acres);
                            next();
                        });
                    } else {
                        //results.push(file);
                        next();
                    }
                });
            })();
        });
    };
    module.exports.dbDoStuff = function () {
        //dbCreateDirs();
		//dbCreateSongs();
		/*var connection = mysql.createConnection(options.connection);
        connection.connect();*/
        /*_dbPopulateSongs(null, connection, function () {
			console.log("songs done");
        });
        _dbPopulateDirs(null, connection, function () {
			console.log("dirs done");
        });*/
        //_dbAddDirRefs(connection, function () {console.log("refs done");});
    }
    var _dbAddDirRefs = function (connection, callback) {
        connection.query("SELECT songs.id AS songid, dirs.id AS dirid FROM songs, dirs WHERE songs.dir = dirs.dirname;", function (err, data) {
            if (err) throw err;
            //console.log("DATA: " + data.length);
            for (var i = 0; i < data.length; i++) {
                var qry = "UPDATE songs SET dirid = " + data[i].dirid + " WHERE id = " + data[i].songid + ";";
                connection.query(qry, function (err, data) {
                    if (err) throw err;
                });
            }
            if (callback) callback();
        });
    }
    var _dbPopulateDirs = function (dir, connection, callback) {
        var queue = 0;
        dir = dir ? dir : options.musicDir;
        fs.readdir(dir, function (err, list) {
            if (err) throw err;
            var i = 0;
            (function next() {
                var file = list[i++];
                if (!file) {
                    if (callback) callback();
                    return;
                }
                file = path.join(dir, file);
                fs.stat(file, function (err, stat) {
                    if (err) throw err;
                    if (stat.isDirectory()) {
                        _dbPopulateDirs(file, connection);
                        insertobj = {};
                        insertobj.dirname = file;
                        var query = connection.query("INSERT INTO dirs SET ?", insertobj, function (err) {
                            if (err) throw err;
                            next();
                        });
                    } else {
                        next();
                    }
                });
            })();
        });
    }
    var _dbPopulateSongs = function (dir, connection, callback) {
        dir = dir ? dir : options.musicDir;
        fs.readdir(dir, function (err, list) {
            if (err) throw err;
            var i = 0;
            (function next() {
                var file = list[i++];
                if (!file) { if (callback) { callback(); } return null; }
                file = path.join(dir, file);
                // console.log("FILE: " + file);
                fs.stat(file, function (err, stat) {
                    if (err) throw err;
                    if (!stat.isDirectory()) {
                        if (isMusic(file)) {
                            var insertobj = {};
                            var id3 = new ID3(readTag(file));
                            id3.parse();
                            var title = id3.get("title"),
                                artist = id3.get("artist"),
                                year = id3.get("year"),
                                album = id3.get("album");
                            title = title ? title : "";
                            artist = artist ? artist : "";
                            year = year ? year : 0;
                            album = album ? album : "";
                            insertobj.filename = path.basename(file);
                            insertobj.dir = path.dirname(file);
                            insertobj.filesize = stat.size;
                            insertobj.title = title;
                            insertobj.artist = artist;
                            insertobj.year = year;
                            insertobj.album = album;
                            //console.log("UNDEFINED: " + (typeof connection === 'undefined'));
                            var query = connection.query("INSERT INTO songs SET ?", insertobj, function (err) {
                                if (err) { console.log(query.sql); throw err; }
                                //console.log("INSERT INTO songs");
                                next();
                            })
                        }
                    } else {
                        _dbPopulateSongs(file, connection);
                        next();
                    }
                });
            })();
        });
    }
    var isMusic = function (filename) {
        var extname = path.extname(filename);
        for (var i = 0; i < options.extensions.length; i++) {
            var currext = options.extensions[i].extension;
            if (extname === currext) {
                return true;
            }
        }
        return false;
    }
    var dbCreateSongs = function () {
        var connection = mysql.createConnection(options.connection),
            qry = "CREATE TABLE songs (" +
            "id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
            "last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
            "filename VARCHAR(255), " +
            "dir VARCHAR(2000), " +
            "filesize INT, " +
            "title VARCHAR(255)," +
            "artist VARCHAR(50)," +
            "year VARCHAR(100)," +
            "album VARCHAR(100)," +
            "dirid INT);";
        connection.query(qry, function (err) { if (err) throw err; });
        connection.end();
    };
    var dbCreateDirs = function () {
        var connection = mysql.createConnection(options.connection),
            qry = "CREATE TABLE dirs (" +
                "id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
                "last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                "dirname VARCHAR(2000));";
        connection.query(qry, function (err) { if (err) throw err; });
        connection.end();
    } 
})();