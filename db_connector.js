(function () {
    'use strict';
    var path = require('path'),
        fs = require('fs'),
        ID3 = require('id3'),
        mysql = require('mysql'),
        crypto = require('crypto'),
        async = require('async'),
        options = require('./config.js'),
        im = require('imagemagick');

    var db = module.exports = {};

    db.investigate = function () {
        // Find duplicate hashes:
        var qry = 'SELECT id, dir, filename, songs.hash FROM songs ' + 
            'INNER JOIN (SELECT hash, count(id) as cnt FROM songs GROUP BY hash HAVING cnt > 1) ' + 
            'dup ON songs.hash = dup.hash';
        var connection = mysql.createConnection(options.dbConnection);
        connection.query(qry, function (err, results) {
            connection.end();
            console.log('List of duplicate hashes');
            console.log(results);
        });
    };

    db.build = function () {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        console.log('Buiding database...');
        async.series([
            function (callback) {
                console.log('Destroying tables...');
                tables.dropAll(connection, callback);
            },
            function (callback) {
                console.log('Tables destroyed. Creating tables...');
                tables.createAll(connection, callback);
            },
            function (callback) {
                console.log('Tables created. Populating...');
                populate(undefined, connection, callback);
            },
            function (callback) {
                console.log('Population done. Creating index...');
                createIndex(connection, callback);
            },
            function (callback) {
                console.log('Index created. Adding directory references...');
                addDirRefsToDirs(connection, callback);
            },
            function (callback) {
                console.log('Directory referencess added. Adding song references...');
                addDirRefsToSongs(connection, callback);
            }
        ], function () {
            console.log('All references added.');
            console.log('Database complete!');
            connection.end();
        });
    };

    var songCount = 0;
    db.update = function () {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        console.log('Updating database...');
        async.series([
            function (callback) {
                getSongCount(connection, callback);
            },
            function (callback) {
                console.log('Current song count: ' + songCount);
                console.log('Inserting new entries...');
                insertNew(options.musicDir, connection, callback);
            },
            function (callback) {
                console.log('Removing unused dirs...');
                removeUnusedDirs(options.musicDir, connection, callback);
            },
            function (callback) {
                console.log('Unused dirs removed. Removing unused songs...');
                removeUnusedSongs(options.musicDir, connection, callback);
            },
            function (callback) {
                console.log('New entries inserted. Adding dir references...');
                addDirRefsToDirs(connection, callback);
            },
            function (callback) {
                console.log('Directory references added. Adding song references...');
                addDirRefsToSongs(connection, callback);
            }
        ], function (err) {
            if (err) { throw err; }
            console.log('All references added.');
            console.log('Everything updated!');
            connection.end();
        });
    };

    var getSongCount = function (connection, callback) {
        connection.query('SELECT COUNT(*) as cnt FROM songs', function (err, result) {
            if (err) { throw err; }
            songCount = result[0].cnt;
            callback();
        });
    };

    var removeUnusedDirs = function (dir, connection, callback) {
        var qry = 'SELECT dirname FROM dirs';
        connection.query(qry, function (err, res) {
            if (err) { throw err; }
            var dbCallback = function (err) {
                if (err) { throw err; }
            };
            for (var i = 0, endi = res.length; i < endi; i++) {
                var dirname = res[i].dirname;
                if (!fs.existsSync(dirname)) {
                    console.log('Deleting dir: ' + dirname);
                    connection.query('DELETE FROM dirs WHERE dirname = ?', dirname, dbCallback);
                }
            }
            if ((typeof callback) === 'function') { callback(); }
        });
    };

    var removeUnusedSongs = function (dir, connection, callback) {
        var qry = 'SELECT id, dir, filename FROM songs';
        connection.query(qry, function (err, res) {
            if (err) { throw err; }
            var dbCallback = function (err) {
                if (err) { throw err; }
            };
            for (var i = 0, endi = res.length; i < endi; i++) {
                var dir = res[i].dir;
                var filename = res[i].filename;
                var id = res[i].id;
                var fullpath = path.join(dir, filename);
                if (!fs.existsSync(fullpath)) {
                    console.log('Removing song: ' + dir + ' ' + filename);
                    connection.query('DELETE from songs WHERE id = ?', id, dbCallback);
                }
            }
            if ((typeof callback) === 'function') { callback(); }
        });
    };

    // FIXME: Is this guaranteed to run before allCovers is read the first time? Use async?
    // Also, should be wrapped in insertNew so it doesn't get run when starting 
    // server without 'update', but need to refactor to make it only run once.
    // Does this even help performance? Seems like it doesn't.
    var allCovers = [];
    (function () {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = "SELECT dirname, cover_small, cover FROM dirs;";
        connection.query(qry, function (err, data) {
            connection.end();
            // Flatten data
            allCovers = [].concat.apply([], data.map(function(value) { 
                if (value.cover || value.small_cover) {
                    if (value.dirname && value.cover && value.cover_small) {
                        return [path.join(value.dirname, value.cover), path.join(value.dirname, value.cover_small)];
                    }
                }
            }));
        });
    })();
    
    var updateDepth = 0;
    var lastDone = 0;
    var lastPrint = -1;
    var insertNew = function (dir, connection, callback) {
        updateDepth++;
        fs.readdir(dir, function (err, list) {
            if (err) { throw err; }
            var i = 0;
            (function next() {
                var file = list[i++];
                if (!file) {
                    if (--updateDepth === 0 && (typeof callback) === 'function') {
                        callback();
                    }
                    return;
                }
                var fullpath = new Buffer(path.join(dir, file), 'utf8').toString('utf8');
                fs.stat(fullpath, function (err, stat) {
                    if (err) { throw err; }
                    var qry;
                    if (stat.isDirectory()) {
                        qry = 'SELECT * FROM dirs WHERE dirname = ?';
                        connection.query(qry, fullpath, function (err, results) {
                            if (err) { throw err; }
                            if (results.length === 0) {
                                console.log('Inserting dir: ' + fullpath);
                                insertDir(fullpath, stat, connection, function () {
                                    insertNew(fullpath, connection, callback);
                                    next();
                                });
                            } else {
                                insertNew(fullpath, connection, callback);
                                next();
                            }
                        });
                    } else if (stat.size < 1) {
                        next();
                    } else if (_isPicture(fullpath) && (allCovers.indexOf(fullpath) < 0)) {
                        console.log('Inserting new cover: ' + fullpath);
                        insertCover(fullpath, connection, next);
                    } else if (_isMusic(fullpath)) {
                        updateMusic(fullpath, stat, connection, function () {
                            var percentDone = Math.floor((lastDone / (songCount || 1)) * 100);
                            if (percentDone % 1 === 0 && lastPrint !== percentDone) {
                                console.log(percentDone + ' %');
                                lastPrint = percentDone;
                            }
                            lastDone++;
                            next();
                        });
                    } else {
                        next();
                    }
                });
            } ());
        });
    };

    var updateMusic = function (fullpath, stat, connection, callback) {
        var hash = getHash(fullpath);
        if (!hash) {
            callback(false);
            return;
        }
        var id3 = new ID3(readTag(fullpath));
        id3.parse();
        var title = id3.get('title'),
            artist = id3.get('artist'),
            year = id3.get('year'),
            album = id3.get('album');
        var qry = 'SELECT * FROM songs WHERE hash = ?';
        connection.query(qry, hash, function (err, results) {
            if (err) { throw err; }
            if (results.length === 0) {
                console.log('Inserting new song: ' + path.basename(fullpath));
                insertSong(fullpath, stat, connection, callback);
            } else {
                var result = results[0];
                var fullpath2 = path.join(result.dir, result.filename);
                var updateObj = {};
                if (fullpath !== fullpath2) {
                    console.log('Paths did not match. Updating: ' + path.basename(fullpath));
                    updateObj = {
                        filename: path.basename(fullpath),
                        dir: path.dirname(fullpath),
                        last_modified: stat.mtime,
                        filesize: stat.size,
                        title: title ? title : '',
                        artist: artist ? artist : '',
                        year: year ? year : 0,
                        album: album ? album : ''
                    };
                } else {
                    updateObj = {
                        last_modified: stat.mtime,
                        filesize: stat.size,
                        title: title ? title : '',
                        artist: artist ? artist : '',
                        year: year ? year : 0,
                        album: album ? album : ''
                    };
                    if (tagsEqual(result, updateObj) === true) {
                        updateObj = false;
                    } else {
                        console.log('Tag updated: ' + fullpath);
                    }
                }
                if (updateObj !== false) {
                    var qry = 'UPDATE songs SET ? WHERE hash = ' + connection.escape(hash) + ';';
                    connection.query(qry, updateObj, function (err) {
                        if (err) { throw err; }
                        callback(hash);
                    });
                } else {
                    callback(hash);
                }
            }
        });
    };

    var tagsEqual = function (tag1, tag2) {
        return tag1.last_modified.getTime() === tag2.last_modified.getTime() &&
        tag1.filesize === tag2.filesize &&
        tag1.title === tag2.title &&
        tag1.artist === tag2.artist &&
        tag1.year === tag2.year.toString() &&
        tag1.album === tag2.album;
    };

    var depth = 0;
    var populate = function (dir, connection, callback) {
        depth++;
        console.log('Depth: ' + depth);
        if (!dir) {
            dir = options.musicDir;
            var insertobj = { last_modified: fs.statSync(dir).mtime, dirname: dir, isdir: true };
            connection.query('INSERT INTO dirs SET ?', insertobj, function (err) { if (err) { throw err; } });
        }
        fs.readdir(dir, function (err, list) {
            if (err) { throw err; }
            var i = 0;
            (function next() {
                var file = list[i++];
                if (!file) {
                    if (--depth === 0 && (typeof callback) === 'function') {
                        callback();
                    }
                    return;
                }
                file = new Buffer(path.join(dir, file), 'utf8').toString('utf8');
                fs.stat(file, function (err, stat) {
                    if (err) { throw err; }
                    if (stat.isDirectory()) {
                        insertDir(file, stat, connection, function () {
                            populate(file, connection, callback);
                            next();
                        });
                    } else if (stat.size < 1) {
                        next();
                    } else if (_isPicture(file)) {
                        insertCover(file, connection, next);
                    } else if (_isMusic(file)) {
                        insertSong(file, stat, connection, next);
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
        connection.query('INSERT INTO dirs SET ?', insertobj, function (err) {
            if (err) { throw err; }
            if ((typeof callback) === 'function') { callback(); }
        });
    };

    var insertCover = function (file, connection, callback) {
        var dir = path.dirname(file);
        var filename = path.basename(file);
        var small = filename.indexOf('-small') >= 0;
        var query = connection.query('SELECT id FROM dirs WHERE dirname = ?', dir, function (err, data) {
            var qry;
            if (err) { throw err; }
            if (data.length === 0) {
                console.log(query.sql);
                return;
            }
            var id = data[0].id;
            if (!small) {
                var smallname = path.basename(file).split('.')[0] + '-small' + path.extname(file);
                var fullsmallname = path.join(path.dirname(file), smallname);
                if (!fs.existsSync(fullsmallname)) {
                    createSmallCover(file, fullsmallname, connection);
                }
                qry = 'UPDATE dirs SET cover_small=' + connection.escape(smallname) + ' WHERE id = ' + id + ';';
                connection.query(qry, function (err) {
                    if (err) { throw err; }
                });
            }
            qry = 'UPDATE dirs SET ' + (small ? 'cover_small=' : 'cover=') + connection.escape(filename) + ' WHERE id = ' + id + ';';
            var query = connection.query(qry, function (err) {
                if (err) { console.log(query.sql); throw err; }
                if ((typeof callback) === 'function') { callback(); }
            });
        });
    };

    var createSmallCover = function (large, small) {
        im.convert.path = options.imageMagickPath;
        console.log('Creating image: ' + small);
        im.resize({
            srcData: fs.readFileSync(large, 'binary'),
            width: 150
        }, function (err, stdout, stdin) {
            if (err) { throw err; }
            fs.writeFileSync(small, stdout, 'binary');
        });
    };

    var getHash = function (file) {
        var filesize = fs.statSync(file).size;
        if (filesize < 8192) {
            return false;
        }
        var tagsize = getID3size(file);
        var fd = fs.openSync(file, 'r');
        var buffer = new Buffer(8192);
        fs.readSync(fd, buffer, 0, 8192, (filesize + tagsize) / 2);
        fs.closeSync(fd);
        return crypto.createHash('sha1').update(buffer).digest('base64');
    };

    var insertSong = function (file, stat, connection, callback) {
        callback = typeof callback === 'function' ? callback : function () { };
        var insertobj = {};
        var id3 = new ID3(readTag(file));
        id3.parse();
        var title = id3.get('title'),
        artist = id3.get('artist'),
        year = id3.get('year'),
        album = id3.get('album');
        var hash = getHash(file);
        if (hash === false) {
            callback();
            return;
        }
        var ext = path.extname(file).toLowerCase();
        var contenttype = '';
        for (var i = 0; i < options.musicExtensions; i++) {
            if (options.musicExtensions[i].extension === ext) {
                contenttype = options.musicExtensions[i].contenttype;
                break;
            }
        }
        insertobj = {
            last_modified: stat.mtime,
            filename: path.basename(file),
            dir: path.dirname(file),
            filesize: stat.size,
            contenttype: contenttype,
            title: title ? title : '',
            artist: artist ? artist : '',
            year: year ? year : 0,
            album: album ? album : '',
            isdir: false,
            hash: hash
        };
        connection.query('INSERT INTO songs SET ?', insertobj, function (err, result) {
            if (err) { throw err; }
            callback(result.insertId);
        });
    };

    // Vid problem: Klaga på Simon
    var addDirRefsToSongs = function (connection, callback) {
        var qry = 'UPDATE songs us INNER JOIN (SELECT d.id did, s.id sid FROM ' +
            'dirs d, songs s WHERE s.dir = d.dirname) x ON x.sid = us.id SET ' +
            'us.dirid = x.did';
        connection.query(qry, function (err) {
            if (err) { throw err; }
            callback();
        });
    };
    var addDirRefsToDirs = function (connection, callback) {
        connection.query('SELECT id, dirname FROM dirs', function (err, data) {
            if (err) { throw err; }
            var ids = [];
            var k = 0;
            var dbCallback = function (idarr, data) {
                var parent = data.dirname.split(path.sep);
                parent = parent.splice(0, parent.length - 1).join(path.sep);
                connection.query('SELECT id FROM dirs WHERE dirname = ?', parent, function (err, data2) {
                    var dataidlocal = ids[k++];
                    if (err) { throw err; }
                    if (data2.length !== 1) { return; }
                    var qry = 'UPDATE dirs SET parent_id = ' + data2[0].id + ', ancestors = \'' + idarr.join(',') + '\' WHERE id = ' + dataidlocal + ';';
                    connection.query(qry, function (err) {
                        if (err) { throw err; }
                        if (k >= ids.length - 1 && callback) {
                            if ((typeof callback) === 'function') { callback(); }
                            callback = null;
                        }
                    });
                });
            };
            for (var i = 0; i < data.length; i++) {
                ids.push(data[i].id);
                getAncestors(data[i], connection, dbCallback);
            }
        });
    };

    var getAncestors = function (dat, connection, callback) {
        var dirname = dat.dirname.replace(options.musicDir, '');
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
        var dbCallback = function (err, data) {
            if (err) { throw err; }
            j++;
            if (data[0] && data[0].id) {
                idarr.push(data[0].id);
            }
            if (j === retarr.length) {
                callback(idarr.sort(), dat);
            }
        };
        for (i = 0; i < retarr.length; i++) {
            var qry = 'SELECT id FROM dirs WHERE dirname = ?';
            connection.query(qry, retarr[i], dbCallback);
        }
    };

    var createIndex = function (connection, callback) {
        var qry = 'ALTER TABLE dirs ADD INDEX dirname_index (dirname)';
        connection.query(qry, function (err) {
            if (err) { throw err; }
            if ((typeof callback) === 'function') { callback(); }
        });
    };

    var _isPicture = function (filename) {
        return options.pictureExtensions.indexOf(path.extname(filename).toLowerCase()) > -1 ? true : false;
    };
    var _isMusic = function (filename) {
        var arr = options.musicExtensions.map(function (e) { return e.extension; });
        return arr.indexOf(path.extname(filename).toLowerCase()) > -1 ? true : false;
    };

    var tables = {
        sql: {
            songs: 'CREATE TABLE songs (' + 
                'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,' +
                'last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,' + 
                'filename VARCHAR(255),' +
                'dir VARCHAR(2000),' + 
                'filesize INT,' + 
                'title VARCHAR(255),' + 
                'artist VARCHAR(100),' + 
                'year VARCHAR(100),' +
                'album VARCHAR(255),' + 
                'contenttype VARCHAR(20),' + 
                'dirid INT,' + 
                'isdir BOOL,' + 
                'hash VARCHAR(32),' +
                'playcount INT NOT NULL DEFAULT 0);',
            dirs: 'CREATE TABLE dirs (' + 
                'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,' +
                'last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,' + 
                'dirname VARCHAR(2000),' +
                'cover VARCHAR(200),' + 
                'parent_id INT,' + 
                'ancestors VARCHAR(200),' + 
                'isdir BOOL,' + 
                'cover_small VARCHAR(206));',
            songplays: 'CREATE TABLE songplays (' +
                'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,' +
                'time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,' +
                'ip_number VARCHAR(20),' +
                'song_id INT,' +
                'album_id INT);'
        },
        dropAll: function (connection, callback) {
            connection.query('DROP TABLE IF EXISTS dirs; DROP TABLE IF EXISTS songs; DROP TABLE IF EXISTS songplays;', function (err) {
                if (err) { throw err; }
                if ((typeof callback) === 'function') { callback(); }
            });
        },
        createAll: function (connection, callback) {
            var qry = tables.sql.songs + tables.sql.dirs + tables.sql.songplays;
            connection.query(qry, function (err) {
                if (err) { throw err; }
                if ((typeof callback) === 'function') { callback(); }
            });
        }
    };

    var getID3size = function (filename) {
        var fd = fs.openSync(filename, 'r');
        var buffer = new Buffer(4);
        fs.readSync(fd, buffer, 0, 4, 6);
        fs.closeSync(fd);
        return (buffer[3] & 0x7f) |
        ((buffer[2] & 0x7f) << 7) |
        ((buffer[1] & 0x7f) << 14) |
        ((buffer[0] & 0x7f) << 21);
    };

    var readTag = function (filename) {
        if (fs.existsSync(filename)) {
            var size = getID3size(filename);
            if (size < 227) { size = 227; }
            if (size < 1) { return false; }
            var buffer = new Buffer(size, 'utf8');
            var fd = fs.openSync(filename, 'r');
            fs.readSync(fd, buffer, 0, size, 0);
            fs.close(fd);
            return buffer;
        } else { return false; }
    };
})();