(function () {
    var express = require('express'),
		url = require('url'),
		path = require('path'),
		fs = require('fs'),
		util = require('util'),
		sys = require('sys'),
		ID3 = require('id3'),
		mysql = require('mysql'),
		crypto = require('crypto'),
        metalminer = require('metalminer');

    var options = {
        musicDir: "E:\\Musik\\Annat",
        //musicDir: "C:\\aaa\\music",
        baseDirId: 1,
        extensions: [
            { extension: "", contenttype: "" },
            { extension: ".mp3", contenttype: "audio/mpeg" },
            { extension: ".ogg", contenttype: "audio/ogg" },
            { extension: ".oga", contenttype: "audio/ogg" }
        ],
        pictureExtensions: [".jpg", ".png", ".gif"],
        dbConnection: {
            host: 'localhost',
            user: 'root',
            password: 'sjaak',
            charset: 'utf8',
            database: 'jplay',
            multipleStatements: true
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
        var id = req.query.id;
        var connection = mysql.createConnection(options.dbConnection);
        connection.query("SELECT * FROM songs WHERE id = ?", id, function (err, data) {
            if (err) throw err;
            connection.end();
            if (data.length < 1) {
                sys.error("Error serving file.");
                res.writeHead(500, "Invalid song.");
                res.end();
                return;
            }
            var filesize = data[0].filesize;
            var filename = data[0].filename;
            var fullpath = path.join(data[0].dir, filename);
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
            util.pump(readStream, res, function (err) { });
        });
    }

    module.exports.getRandomSongs = function (req, res) {
        var count = isNaN(req.query.counter - 0) || req.query.counter === undefined ? 1 : req.query.counter;
        console.log(count);
        var connection = mysql.createConnection(options.dbConnection);
        var qry = connection.query("SELECT * FROM SONGS AS r1 JOIN (SELECT (RAND() * " +
            "(SELECT MAX(id) FROM songs)) AS id) AS r2 WHERE r1.id >= r2.id ORDER BY " +
            "r1.id ASC LIMIT " + count + ";", function (err, data) {
                connection.end();
                console.log(qry.sql);
                res.send(data);
            });
    }

    module.exports.getLyrics = function (req, res) {
        var lyrics = metalminer.getMetalLyrics(req.query, function (err, data) {
            if (!err) {
                res.send(data);
            } else {
                res.send("Lyrics not found: " + err);
            }
        });
    }

    module.exports.getImage = function (req, res, next) {
        var id = req.query.id;
        var connection = mysql.createConnection(options.dbConnection);
        connection.query("SELECT cover, dirname FROM dirs WHERE id = ?", id, function (err, data) {
            if (err) throw err;
            connection.end();
            if (data.length < 1 || !data[0].cover) {
                res.sendfile("./public/img/blank.png");
                return;
            }
            var fullpath = path.join(data[0].dirname, data[0].cover);
            fullpath = path.normalize(fullpath);
            if (fs.existsSync(fullpath)) {
                res.sendfile(path.normalize(fullpath));
            } else {
                res.sendfile("./public/img/blank.png");
            }
        });
    }

    module.exports.getMusic = function (req, res) {
        var qry = "SELECT dir, filename, filesize from songs WHERE id = ?";
        var connection = mysql.createConnection(options.dbConnection);
        var query = connection.query(qry, req.query.id, function (err, data) {
            var fullpath, filesize, parts, start, end, contentType, i, readStream;
            if (err) throw err;
            connection.end();
            if (data.length < 1) return;
            fullpath = path.join(data[0].dir, data[0].filename);
            if (!fs.existsSync(fullpath)) {
                sys.error("Error serving " + fullpath);
                res.writeHead(500, "Could not find requested file.");
                res.end();
                return;
            }
            filesize = data[0].filesize;
            if (req.headers.range == undefined)
                req.headers.range = "-";
            parts = req.headers.range.replace(/bytes=/, "").split("-");
            start = parts[0] ? parseInt(parts[0], 10) : 0;
            end = parts[1] ? parseInt(parts[1], 10) : (data[0].filesize ? data[0].filesize - 1 : 0);
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
            util.pump(readStream, res, function (err) { });
        });
    }
    module.exports.dirtree = function (req, res) {
        getFiles_db(req.query.path, function (err, results) {
            if (err) {
                sys.error("> Error in dirtree serving " + req + " - " + err.message);
                res.writeHead(500, "Wrong URL");
                res.end();
            } else {
                res.writeHead(200, { 'Content-Type': 'text/json' });
                res.write(JSON.stringify(results).toString('utf8'));
                res.end();
            }
        });
    }
    module.exports.searchFile = function (req, res) {
        var needle = req.query.needle;
        var searchsettings = req.query.options;
        if (!searchsettings ||
			(searchsettings.artist !== "true" &&
			searchsettings.title !== "true" &&
			searchsettings.album !== "true")) {
            res.send({});
            return;
        }
        var artist = (searchsettings.artist === "true") ? "artist LIKE '%" + [needle] + "%' " : null;
        var album = (searchsettings.album === "true") ? "album LIKE '%" + [needle] + "%' " : null;
        var title = (searchsettings.title === "true") ? "title LIKE '%" + [needle] + "%' " : null;
        var all = [title, artist, album].filter(function (val) { return val !== null; }).join("OR ");
        var qry = "SELECT * FROM songs WHERE " + all + "LIMIT 20;";
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var query = connection.query(qry, function (err, data) {
            if (err) throw err;
            if (searchsettings.artist || searchsettings.album) {
                qry = "SELECT * FROM dirs WHERE dirname LIKE '%" + [needle] + "%' LIMIT 20";
                connection.query(qry, function (err, data2) {
                    if (err) throw err;
                    connection.end();
                    if (data2) {
                        data2 = data2.concat(data);
                    } else {
                        data2 = data;
                    }
                    res.send(data2);
                });
            } else {
                connection.end();
                res.send(data);
            }
        });
    }
    module.exports.getIdArray = function (req, res) {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = "";
        if (req.query.isdir == true) {
            connection.query("SELECT ancestors FROM dirs WHERE id = ?", req.query.id, function (err, data) {
                if (err) throw err;
                connection.end();
                res.send(data[0].ancestors);
            });
        } else {
            connection.query("SELECT dirid FROM songs WHERE id = ?", req.query.id, function (err, dirid) {
                if (err) throw err;
                var query = connection.query("SELECT ancestors FROM dirs WHERE id = ?", dirid[0].dirid, function (err, data) {
                    if (err) throw err;
                    connection.end();
                    var result = data[0].ancestors + "," + dirid[0].dirid.toString();
                    res.send(result);
                });
            });
        }
    }
    module.exports.getSongInfo = function (req, res) {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        connection.query("SELECT * FROM songs WHERE id = ?", req.query.id, function (err, data) {
            if (err) throw err;
            connection.end();
            res.send(data);
        });
    }
    module.exports.addDir = function (req, res) {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        connection.query("SELECT * FROM songs WHERE dirid = ?", req.query.id, function (err, data) {
            if (err) throw err;
            connection.query("SELECT * FROM dirs WHERE parent_id = ?", req.query.id, function (err, data2) {
                if (err) throw err;
                connection.end();
                res.send(data.concat(data2));
            });
        });
    }
    module.exports.setBaseDirId = function () {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = "SELECT id FROM dirs WHERE dirname = ?";
        var query = connection.query(qry, options.musicDir, function (err, data) {
            if (err) { throw err; }
            connection.end();
            options.baseDirId = data[0].id;
        });
    }
    var getFiles_db = function (dir, callback) {
        getSongs(dir, function (res_songs) {
            getDirs(dir, function (res_dirs) {
                var res = res_dirs.concat(res_songs);
                callback(null, res);
            });
        });
    }
    var getSongs = function (dir, callback) {
        dir = dir ? dir : options.baseDirId;
        var qry = "SELECT * FROM songs WHERE songs.dirid = " + dir + " ORDER BY filename;";
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var query = connection.query(qry, function (err, data) {
            if (err) throw err;
            connection.end();
            var returnObj = [];
            for (var i = 0; i < data.length; i++) {
                var entry = data[i];
                returnObj[i] = {
                    "data": {
                        title: entry.title,
                        icon: entry.isdir ? "/img/foldericon.png" : "/img/playbutton.png"
                    },
                    "attr": {
                        "id": "snode_" + entry.id,
                        "href": "#"
                    },
                    "metadata": entry
                }
            }
            callback(returnObj);
        });
    }
    var getDirs = function (dir, callback) {
        dir = dir ? dir : options.baseDirId;
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = "SELECT * FROM dirs WHERE dirs.parent_id = " + dir + " ORDER BY dirname;";
        var query = connection.query(qry, function (err, data) {
            if (err) throw err;
            connection.end();
            var returnObj = [];
            for (var i = 0; i < data.length; i++) {
                var entry = data[i];
                returnObj[i] = {
                    "data": {
                        title: path.basename(entry.dirname),
                        icon: entry.isdir ? "/img/foldericon.png" : "/img/playbutton.png"
                    },
                    "attr": {
                        "id": "node_" + entry.id,
                        "href": "#"
                    },
                    "metadata": entry,
                    "state": "closed"
                }
            }
            callback(returnObj);
        });
    }
})();