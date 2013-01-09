var url = require('url'),
	path = require('path'),
	fs = require('fs'),
	ID3 = require('id3'),
	mysql = require('mysql'),
	crypto = require('crypto'),
	async = require('async');    

var db = exports = module.exports = {};

var options = {
    musicDir: "E:\\Musik\\Osorterat",
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
};

db.build = function () {
    var connection = mysql.createConnection(options.dbConnection);
    connection.connect();
	async.series([
		function (callback) { console.log("Destroying tables..."); callback(null, '1'); },
		tables.dropAll(connection, callback),
        function (callback) { console.log("Tables destroyed. Creating tables..."); callback(null, '2'); },
		//tables.createAll(connection),
        function (callback) { console.log("Tables created. Populating..."); callback(null, '3'); },
		//populate(undefined, connection),
        function (callback) { console.log("Population done. Creating index..."); callback(null, '4'); },
        //createIndex(connection),
        function (callback) { console.log("Index created. Adding dir references..."); callback(null, '5'); },
		//addDirRefsToDirs(connection),
        function (callback) { console.log("Dir refs added. Adding song references..."); callback(null, '6'); },
		//addDirRefsToSongs(connection)
	], function (err, results) {
		console.log("Song refs added.");
		console.log("Database complete!");
		connection.end();
	});
    /*tables.dropAll(connection, function () {
        console.log("Tables destroyed. Creating tables...");
        tables.createAll(connection, function () {
            console.log("Tables created. Populating...");
            populate(undefined, connection, function () {
                console.log("Population done. Creating index...");
                createIndex(connection, function () {
                    console.log("Index created. Adding dir references...");
                    addDirRefsToDirs(connection, function () {
                        console.log("Dir refs added. Adding song references...");
                        addDirRefsToSongs(connection, function () {
                            console.log("Song refs added.");
                            console.log("Database complete!");
                            connection.end();
                        });
                    });
                });
            });
        });
    });*/
};

db.update = function () {
    var connection = mysql.createConnection(options.dbConnection);
    connection.connect();
	console.log("Updating database...");
	async.series([
		function () { console.log("Removing unused dirs...") },
		removeUnusedDirs(options.musicDir, connection),
		function () { console.log("Unused dirs removed. Removing unused songs...") },
		removeUnusedSongs(options.musicDir, connection),
		function () { console.log("Unused songs removed. Inserting new entries...") },
		insertNew(options.musicDir, connection),
		function () { console.log("New entries inserted.") }
	], function (err, results) {
		console.log("Everything updated.");
		connection.end();
	});
    /*updateAll(options.musicDir, connection, function () {
        console.log("Everything updated.");
		connection.end();
    });*/
};

/*var updateAll = function (dir, connection, callback) {
	async.series([
		console.log("Removing unused dirs...");
		removeUnusedDirs(dir, connection),
		console.log("Unused dirs removed. Removing unused songs...");
		removeUnusedSongs(dir, connection),
		console.log("Unused songs removed. Inserting new entries..."),
		insertNew(options.musicDir, connection),
		console.log("New entries inserted.")			
	], callback);
	removeUnused(dir, connection, function () {
		console.log("Unused entries removed. Inserting new entries...");
		insertNew(options.musicDir, connection, function () {
			console.log("New entries inserted.");
			if ((typeof callback) === "function") callback();
		});
	});
};*/

/*var removeUnused = function (dir, connection, callback) {
	async.series([
		console.log("Removing unused dirs...");
		removeUnusedDirs(dir, connection),
		console.log("Unused dirs removed. Removing unused songs...");
		removeUnusedSongs(dir, connection)
		console.log("Unused songs removed.");
	], callback);
	removeUnusedDirs(dir, connection, function () {
		removeUnusedSongs(dir, connection, function () {
			if ((typeof callback) === "function") callback();
		});
	});
};*/

var removeUnusedDirs = function (dir, connection, callback) {
	var qry = "SELECT dirname FROM dirs";
    connection.query(qry, function (err, res) {
        if (err) throw err;
        for (var i = 0, endi = res.length; i < endi; i++) {
            var dirname = res[i].dirname;
            if (!fs.existsSync(dirname)) {
				console.log("Deleting dir: " + dirname);
                connection.query("DELETE FROM dirs WHERE dirname = ?", dirname, function (err) {
                    if (err) throw err;
                });
            }
        }
		if ((typeof callback) === "function") callback();
    });
};

var removeUnusedSongs = function (dir, connection, callback) {
    var qry = "SELECT id, dir, filename FROM songs";
    connection.query(qry, function (err, res) {
        if (err) throw err;
        for (var i = 0, endi = res.length; i < endi; i++) {
            var dir = res[i].dir;
            var filename = res[i].filename;
            var id = res[i].id;
            var fullpath = path.join(dir, filename);
            if (!fs.existsSync(fullpath)) {
                console.log("Removing hash for song: " + id);
                connection.query("DELETE from hashes WHERE song_id = ?", id, function (err) {
                    if (err) throw err;
                });
				console.log("Removing song for song: " + id);
				connection.query("DELETE from songs WHERE id = ?", id, function (err) {
					if (err) throw err;
				});
            }
        }
		if ((typeof callback) === "function") callback();
    });	
};

var updateDepth = 0;
var insertNew = function (dir, connection, callback) {
    updateDepth++;
    fs.readdir(dir, function (err, list) {
        if (err) throw err;
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) {
                console.log(updateDepth);
                if (--updateDepth === 0 && (typeof callback) === "function") {
                    callback();
                }
                return;
            }
            var fullpath = new Buffer(path.join(dir, file), "utf8").toString("utf8");
            fs.stat(fullpath, function (err, stat) {
                if (err) throw err;
                var qry;
                if (stat.isDirectory()) {
                    insertNew(fullpath, connection, callback);
                    qry = "SELECT * FROM dirs WHERE dirname = ?";
                    connection.query(qry, fullpath, function (err, results) {
                        if (err) throw err;
                        if (results.length === 0) {
                            console.log("inserting dir: " + fullpath);
                            insertDir(fullpath, stat, connection, next);
                        } else next();
                    });
                } else if (stat.size < 1) {
                    next();
                } else if (_isPicture(fullpath)) {
                    insertCover(fullpath, connection, next);
                } else if (_isMusic(fullpath)) {
                    var hash = getHash(fullpath);
                    qry = "SELECT id FROM hashes WHERE hash = ?";
                    connection.query(qry, hash, function (err, results) {
                        if (err) throw err;
                        if (results.length === 0) {
                            insertSong(fullpath, stat, connection, function (id) {
                                insertHash(fullpath, id, connection, next);
                            });
                        } else {
                            // FIXME: UPDATE hashes SET somethingsomething. Or?
                            /*connection.query("UPDATE hashes SET ? WHERE hash", function (err) {
                                if (err) throw err;
                                next();
                            });*/
							next();
                        }
                    });
                } else {
                    next();
                }
            });
        } ());
    });
};

var depth = 0;
var populate = function (dir, connection, callback) {
    depth++;
    console.log("Depth: " + depth);
    if (!dir) {
        dir = options.musicDir;
        var insertobj = { last_modified: fs.statSync(dir).mtime, dirname: dir, isdir: true };
        connection.query("INSERT INTO dirs SET ?", insertobj, function (err) { if (err) { throw err; } });
    }
    fs.readdir(dir, function (err, list) {
        if (err) throw err;
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) {
                if (--depth === 0 && (typeof callback) === "function") {
                    callback();
                }
                return;
            }
            file = new Buffer(path.join(dir, file), "utf8").toString("utf8");
            fs.stat(file, function (err, stat) {
                if (err) throw err;
                if (stat.isDirectory()) {
                    populate(file, connection, callback);
                    insertDir(file, stat, connection, next);
                } else if (stat.size < 1) {
                    next();
                } else if (_isPicture(file)) {
                    insertCover(file, connection, next);
                } else if (_isMusic(file)) {
                    insertSong(file, stat, connection, function (id) {
                        insertHash(file, id, connection, next);
                    });
                } else {
                    next();
                }
            });
        })();
    });
};

var insertDir = function (file, stat, connection, callback) {
    var insertobj = {
        last_modified: stat.mtime,
        dirname: file,
        isdir: true
    };
    var query = connection.query("INSERT INTO dirs SET ?", insertobj, function (err) {
        if (err) throw err;
        if ((typeof callback) === "function") callback();
    });
};

var insertCover = function (file, connection, callback) {
    var dir = path.dirname(file);
    var filename = path.basename(file);
    connection.query("SELECT id FROM dirs WHERE dirname = ?", dir, function (err, data) {
        if (err) throw err;
        var id = data[0].id;
        connection.query("UPDATE dirs SET cover = '" + filename + "' WHERE id = " + id, function (err, result) {
            if (err) throw err;
            if ((typeof callback) === "function") callback();
        });
    });
};

var getHash = function (file) {
    var size = getID3size(file);
    if (size < 227) size = 227;
    var fd = fs.openSync(file, "r");
    var buffer = new Buffer(2048);
    //fs.readSync(fd, buffer, offset, length, position)
    fs.readSync(fd, buffer, 0, 2048, size);
    fs.closeSync(fd);
    return crypto.createHash('sha1').update(buffer).digest('base64');
};

var insertHash = function (file, id, connection, callback) {
    var sum = getHash(file);
    var insertobj = {
        hash: sum,
        song_id: id
    };
    connection.query("INSERT INTO hashes SET ?", insertobj, function (err) {
        if (err) throw err;
        if ((typeof callback) === "function") callback();
    });
};

var insertSong = function (file, stat, connection, callback) {
    var insertobj = {};
    var id3 = new ID3(readTag(file));
    id3.parse();
    var title = id3.get("title"),
		artist = id3.get("artist"),
		year = id3.get("year"),
		album = id3.get("album");
    var ext = path.extname(file).toLowerCase();
    var contenttype = "";
    for (var i = 0; i < options.extensions; i++) {
        if (options.extensions[i].extension === ext) {
            contenttype = options.extensions[i];
            break;
        }
    }
    insertobj = {
        last_modified: stat.mtime,
        filename: path.basename(file),
        dir: path.dirname(file),
        filesize: stat.size,
        contenttype: contenttype,
        title: title ? title : "",
        artist: artist ? artist : "",
        year: year ? year : 0,
        album: album ? album : "",
        isdir: false
    };
    var query = connection.query("INSERT INTO songs SET ?", insertobj, function (err, result) {
        if (err) throw err;
        callback(result.insertId);
    });
};

// Vid problem: Klaga på Simon
var addDirRefsToSongs = function (connection, callback) {
    var qry = "UPDATE songs us INNER JOIN (SELECT d.id did, s.id sid FROM " +
			"dirs d, songs s WHERE s.dir = d.dirname) x ON x.sid = us.id SET " +
			"us.dirid = x.did";
    connection.query(qry, function (err) {
        if (err) throw err;
        callback();
    });
};
var addDirRefsToDirs = function (connection, callback) {
    connection.query("SELECT id, dirname FROM dirs", function (err, data) {
        if (err) { throw err; }
        var ids = [];
        var k = 0;
        for (var i = 0; i < data.length; i++) {
            ids.push(data[i].id);
            getAncestors(data[i], connection, function (idarr, data) {
                var parent = data.dirname.split(path.sep);
                parent = parent.splice(0, parent.length - 1).join(path.sep);
                connection.query("SELECT id FROM dirs WHERE dirname = ?", parent, function (err, data2) {
                    var dataidlocal = ids[k++];
                    if (err) { throw err; };
                    if (data2.length !== 1) return;
                    var qry = "UPDATE dirs SET parent_id = " + data2[0].id + ", ancestors = '" + idarr.join(",") + "' WHERE id = " + dataidlocal + ";";
                    connection.query(qry, function (err) {
                        if (err) { throw err; }
                        if (k >= ids.length - 1 && callback) {
                            if ((typeof callback) === "function") callback();
                            callback = null;
                        }
                    });
                });
            });
        }
    });
};
var getAncestors = function (dat, connection, callback) {
    var dirname = dat.dirname.replace(options.musicDir, "");
    dirname = dirname.split(path.sep).filter(String);
    if (dirname.length === 0) {
        callback([], dat);
    }
    var retarr = [];
    for (var i = 0, endi = dirname.length; i < endi; i++) {
        var retval = dirname;
        retval.splice(retval.length - 1, i + 1);
        retval = retval.join(path.sep);
        retval = path.join(options.musicDir, retval);
        retarr.push(retval);
    }
    var j = 0;
    var idarr = [];
    for (var i = 0; i < retarr.length; i++) {
        var qry = "SELECT id FROM dirs WHERE dirname = ?";
        var query = connection.query(qry, retarr[i], function (err, data) {
            if (err) throw err;
            j++;
            idarr.push(data[0].id);
            if (j === retarr.length) {
                callback(idarr.sort(), dat);
            }
        });
    }
};

var createIndex = function (connection, callback) {
    var qry = "ALTER TABLE dirs ADD INDEX dirname_index (dirname)"
    var connection = mysql.createConnection(options.dbConnection);
    connection.connect();
    connection.query(qry, function (err) {
        if (err) throw err;
        if ((typeof callback) === "function") callback();
    });
};

var _isPicture = function (filename) {
    return options.pictureExtensions.indexOf(path.extname(filename).toLowerCase()) > -1 ? true : false;
};
var _isMusic = function (filename) {
    var arr = options.extensions.map(function (e) { return e.extension; });
    return arr.indexOf(path.extname(filename).toLowerCase()) > -1 ? true : false;
};

var tables = {
    sql: {
        songs: "CREATE TABLE songs (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
            "last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,filename VARCHAR(255)," +
            "dir VARCHAR(2000),filesize INT,title VARCHAR(255),artist VARCHAR(100),year VARCHAR(100)," +
            "album VARCHAR(255),contenttype VARCHAR(20),dirid INT,isdir BOOL);",
        dirs: "CREATE TABLE dirs (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
            "last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,dirname VARCHAR(2000)," +
            "cover VARCHAR(100),parent_id INT,ancestors VARCHAR(200),isdir BOOL);",
        hashes: "CREATE TABLE hashes(id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,hash VARCHAR(32),song_id INT);"
    },
    dropAll: function (connection, callback) {
        connection.query("DROP TABLE IF EXISTS dirs; DROP TABLE IF EXISTS songs; DROP TABLE IF EXISTS hashes;", function (err) {
            if (err) throw err;
            if ((typeof callback) === "function") callback();
        });
    },
    createAll: function (connection, callback) {
        var qry = tables.sql.songs + tables.sql.dirs + tables.sql.hashes;
        connection.query(qry, function (err) {
            if (err) throw err;
            if ((typeof callback) === "function") callback();
        });
    }
};

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
};

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
};