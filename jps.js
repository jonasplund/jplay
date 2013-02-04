(function () {
    'use strict';
    var path = require('path'),
        fs = require('fs'),
        util = require('util'),
        sys = require('sys'),
        mysql = require('mysql'),
        metalminer = require('metalminer'),
        async = require('async'),
        options = require('./config.js');

    var jps = module.exports = {};

    // Test version
    /*jps.getSimilarArtists = function (req, res) { 
    res.send(JSON.stringify([ { item: 'Metallica', dirid: '4' } ]));
    };*/

    jps.getBandInfo = function (req, res) {
        console.log(req.query);
        if (!req.query || !req.query.id || !isNumeric(req.query.id)) {
            res.send('Invalid id: 1');
            return;
        }
        var connection = mysql.createConnection(options.dbConnection);
        connection.query('SELECT * FROM songs WHERE id = ?', [req.query.id], function (err, data) {
            connection.end();
            if (err) { throw err; }
            if (data.length < 1) {
                connection.end();
                res.send('Invalid id: 2');
                return;
            }
            metalminer.getBandInfo(data[0], function (err, results) {
                if (err) {
                    res.send('No info found.');
                    return;
                }
                res.send(results);
            });
        });
    }

    jps.getSimilarArtists = function (req, res) {
        if (!req.query || !req.query.id || !isNumeric(req.query.id)) {
            res.send('Invalid id.');
            return;
        }
        var connection = mysql.createConnection(options.dbConnection);
        connection.query('SELECT * FROM songs WHERE id = ?', [req.query.id], function (err, data) {
            if (err) { throw err; }
            if (data.length < 1) {
                connection.end();
                res.send('Invalid id.');
                return;
            }
            metalminer.getSimilarArtists(data[0], function (err, results) {
                if (err) {
                    connection.end();
                    res.send('Similar artists not found.');
                    return;
                }
                async.map(results, function (item, callback) {
                    connection.query('SELECT dirid FROM songs WHERE artist = ? LIMIT 1', item, function (err, data2) {
                        if (err) { callback(err); throw err; }
                        if (data2 && data2.length > 0 && data2[0] && data2[0].dirid) {
                            callback(null, { item: item, dirid: data2[0].dirid });
                        } else {
                            callback(null, { item: item });
                        }
                    });
                }, function (err, sendobj) {
                    connection.end();
                    if (err) { throw err; }
                    res.send(JSON.stringify(sendobj));
                });
            });
        });
    };

    jps.downloadSong = function (req, res) {
        var id = req.query.id;
        var connection = mysql.createConnection(options.dbConnection);
        connection.query('SELECT * FROM songs WHERE id = ?', id, function (err, data) {
            if (err) { throw err; }
            connection.end();
            if (data.length < 1) {
                sys.error('Error serving file.');
                res.writeHead(500, 'Invalid song.');
                res.end();
                return;
            }
            var filesize = data[0].filesize;
            var filename = data[0].filename;
            var fullpath = path.join(data[0].dir, filename);
            if (req.headers.range === undefined) {
                req.headers.range = '-';
            }
            var parts = req.headers.range.replace(/bytes=/, '').split('-');
            var start = parts[0] ? parseInt(parts[0], 10) : 0;
            var end = parts[1] ? parseInt(parts[1], 10) : (filesize ? filesize - 1 : 0);
            res.writeHead(206, {
                'Content-Disposition': 'attachment; filename=' + filename,
                'Content-Type': 'audio/mpeg',
                'Content-length': (end - start) + 1,
                'Connection': 'keep-alive',
                'Accept-Ranges': 'bytes',
                'Content-Range': 'bytes ' + start + '-' + end + '/' + (filesize - 1)
            });
            var readStream = fs.createReadStream(fullpath, { start: start, end: end });
            util.pump(readStream, res, function () { });
        });
    };

    jps.getRandomSongs = function (req, res) {
        var count = isNaN(req.query.counter - 0) || req.query.counter === undefined ? 1 : req.query.counter;
        var connection = mysql.createConnection(options.dbConnection);
        var qry = connection.query('SELECT * FROM SONGS AS r1 JOIN (SELECT (RAND() * ' +
            '(SELECT MAX(id) FROM songs)) AS id) AS r2 WHERE r1.id >= r2.id ORDER BY ' +
            'r1.id ASC LIMIT ' + count + ';', function (err, data) {
                connection.end();
                console.log(qry.sql);
                res.send(data);
            });
    };

    jps.getLyrics = function (req, res) {
        metalminer.getLyrics(req.query, function (err, data) {
            if (!err) {
                res.send(data);
            } else {
                res.send('Lyrics not found: ' + err);
            }
        });
    };

    jps.getImage = function (req, res) {
        var id = isNumeric(req.query.id) ? req.query.id : options.baseDirId;
        var connection = mysql.createConnection(options.dbConnection);
        connection.query('SELECT cover, dirname FROM dirs WHERE id = ?', id, function (err, data) {
            if (err) { throw err; }
            connection.end();
            if (data.length < 1 || !data[0].cover) {
                res.sendfile('./public/img/blank.png');
                return;
            }
            var fullpath = path.join(data[0].dirname, data[0].cover);
            fullpath = path.normalize(fullpath);
            if (fs.existsSync(fullpath)) {
                res.sendfile(path.normalize(fullpath));
            } else {
                res.sendfile('./public/img/blank.png');
            }
        });
    };

    jps.getMusic = function (req, res) {
        var id = isNumeric(req.query.id) ? req.query.id : options.baseDirId;
        var qry = 'SELECT dir, filename, filesize from songs WHERE id = ?';
        var connection = mysql.createConnection(options.dbConnection);
        connection.query(qry, [id], function (err, data) {
            var fullpath, filesize, parts, start, end, contentType, i, readStream;
            if (err) { throw err; }
            connection.end();
            if (data.length < 1) { return; }
            fullpath = path.join(data[0].dir, data[0].filename);
            if (!fs.existsSync(fullpath)) {
                sys.error('Error serving ' + fullpath);
                res.writeHead(500, 'Could not find requested file.');
                res.end();
                return;
            }
            filesize = data[0].filesize;
            if (req.headers.range === undefined) {
                req.headers.range = '-';
            }
            parts = req.headers.range.replace(/bytes=/, '').split('-');
            start = parts[0] ? parseInt(parts[0], 10) : 0;
            end = parts[1] ? parseInt(parts[1], 10) : (data[0].filesize ? data[0].filesize - 1 : 0);
            for (i = 0; i < options.musicExtensions.length; i++) {
                if (path.extname(fullpath) === options.musicExtensions[i].extension) {
                    contentType = options.musicExtensions[i].contenttype;
                    break;
                }
            }
            res.writeHead(206, {
                'Content-Type': contentType,
                'Content-length': (end - start) + 1,
                'Connection': 'keep-alive',
                'Accept-Ranges': 'bytes',
                'Content-Range': 'bytes ' + start + '-' + end + '/' + filesize
            });
            readStream = fs.createReadStream(fullpath, { start: start, end: end });
            util.pump(readStream, res, function () { });
        });
    };

    jps.dirtree = function (req, res) {
        getFiles_db(req.query.path, function (err, results) {
            if (err) {
                sys.error('> Error in dirtree serving ' + req + ' - ' + err.message);
                res.writeHead(500, 'Wrong URL');
                res.end();
            } else {
                res.writeHead(200, { 'Content-Type': 'text/json' });
                res.write(JSON.stringify(results).toString('utf8'));
                res.end();
            }
        });
    };

    jps.searchFile = function (req, res) {
        var needle = req.query.needle;
        var searchsettings = req.query.options;
        if (!searchsettings ||
            (searchsettings.artist !== 'true' &&
            searchsettings.title !== 'true' &&
            searchsettings.album !== 'true')) {
            res.send({});
            return;
        }
        var artist = (searchsettings.artist === 'true') ? 'artist LIKE \'%' + [needle] + '%\' ' : null;
        var album = (searchsettings.album === 'true') ? 'album LIKE \'%' + [needle] + '%\' ' : null;
        var title = (searchsettings.title === 'true') ? 'title LIKE \'%' + [needle] + '%\' ' : null;
        var all = [title, artist, album].filter(function (val) { return val !== null; }).join('OR ');
        var qry = 'SELECT * FROM songs WHERE ' + all + 'LIMIT 20;';
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        connection.query(qry, function (err, data) {
            if (err) { throw err; }
            if (searchsettings.artist || searchsettings.album) {
                qry = 'SELECT * FROM dirs WHERE dirname LIKE \'%' + [needle] + '%\' LIMIT 20';
                connection.query(qry, function (err, data2) {
                    if (err) { throw err; }
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
    };

    jps.getIdArray = function (req, res) {
        var id = isNumeric(req.query.id) ? req.query.id : options.baseDirId;
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        if (req.query.isdir === '1' || req.query.isdir === true || req.query.isdir === 'true') {
            connection.query('SELECT ancestors FROM dirs WHERE id = ?', [id], function (err, data) {
                if (err) { throw err; }
                connection.end();
                res.send(data[0].ancestors);
            });
        } else {
            connection.query('SELECT dirid FROM songs WHERE id = ?', [id], function (err, dirid) {
                if (err) { throw err; }
                if (dirid.length === 0) {
                    connection.end();
                    res.send([]);
                    return;
                }
                connection.query('SELECT ancestors FROM dirs WHERE id = ?', dirid[0].dirid, function (err, data) {
                    if (err) { throw err; }
                    connection.end();
                    var result = data[0].ancestors + ',' + dirid[0].dirid.toString();
                    res.send(result);
                });
            });
        }
    };

    jps.getSongInfo = function (req, res) {
        var id = isNumeric(req.query.id) ? req.query.id : options.baseDirId;
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        connection.query('SELECT * FROM songs WHERE id = ?', [id], function (err, data) {
            if (err) { throw err; }
            connection.end();
            res.send(data);
        });
    };

    jps.addDir = function (req, res) {
        var id = isNumeric(req.query.id) ? req.query.id : options.baseDirId;
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        connection.query('SELECT * FROM songs WHERE dirid = ?', [id], function (err, data) {
            if (err) { throw err; }
            connection.query('SELECT * FROM dirs WHERE parent_id = ?', [id], function (err, data2) {
                if (err) { throw err; }
                connection.end();
                res.send(data.concat(data2));
            });
        });
    };

    jps.setBaseDirId = function () {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = 'SELECT id FROM dirs WHERE dirname = ?';
        connection.query(qry, options.musicDir, function (err, data) {
            if (err) { throw err; }
            connection.end();
            options.baseDirId = data[0].id;
        });
    };

    var getFiles_db = function (dir, callback) {
        getSongs(dir, function (res_songs) {
            getDirs(dir, function (res_dirs) {
                var res = res_dirs.concat(res_songs);
                callback(null, res);
            });
        });
    };

    var getSongs = function (dir, callback) {
        dir = isNumeric(dir) ? dir : options.baseDirId;
        var qry = 'SELECT * FROM songs WHERE songs.dirid = ? ORDER BY filename;';
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        connection.query(qry, [dir], function (err, data) {
            if (err) { throw err; }
            connection.end();
            var returnObj = [];
            for (var i = 0; i < data.length; i++) {
                var entry = data[i];
                returnObj[i] = {
                    'data': {
                        title: entry.title,
                        icon: entry.isdir ? '/img/foldericon.png' : '/img/playbutton.png'
                    },
                    'attr': {
                        'id': 'snode_' + entry.id,
                        'href': '#'
                    },
                    'metadata': entry
                };
            }
            callback(returnObj);
        });
    };

    var getDirs = function (dir, callback) {
        dir = isNumeric(dir) ? dir : options.baseDirId;
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = 'SELECT * FROM dirs WHERE dirs.parent_id = ? ORDER BY dirname;';
        connection.query(qry, [dir], function (err, data) {
            if (err) { throw err; }
            connection.end();
            var returnObj = [];
            for (var i = 0; i < data.length; i++) {
                var entry = data[i];
                returnObj[i] = {
                    'data': {
                        title: path.basename(entry.dirname),
                        icon: entry.isdir ? '/img/foldericon.png' : '/img/playbutton.png'
                    },
                    'attr': {
                        'id': 'node_' + entry.id,
                        'href': '#'
                    },
                    'metadata': entry,
                    'state': 'closed'
                };
            }
            callback(returnObj);
        });
    };

    var isNumeric = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
})();