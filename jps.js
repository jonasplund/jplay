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

    jps.getSidebarInfo = function (req, res) {
        if (!req.query || !req.query.id || !isNumeric(req.query.id)) {
            res.send('Invalid id');
            return;
        }
        var connection = mysql.createConnection(options.dbConnection);
        connection.query('SELECT * FROM songs WHERE id = ?', [req.query.id], function (err, data) {
            connection.end();
            if (err) { throw err; }
            if (data.length < 1) {
                res.send('No songs matching id');
                return;
            }
            async.parallel({
                // If err is defined in callback, the whole thing is cancelled, so don't send err to callback
                video: function (callback) {
                    metalminer.getVideo(data[0], function (err, results) {
                        callback(undefined, { err: err, results: results });
                    });
                },
                similarArtists: function (callback) {
                    getSimilarArtistsInternal(req.query.id, undefined, function (err, results) {
                        callback(undefined, { err: err, results: results });
                    });
                },
                bandInfo: function (callback) {
                    metalminer.getBandInfo(data[0], function (err, results) {
                        callback(undefined, { err: err, results: results });
                    });
                },
                lyrics: function (callback) {
                    metalminer.getLyrics(data[0], function (err, results) {
                        callback(undefined, { err: err, results: results });
                    });
                }
            }, function (err, results) {
                res.send({ 
                    video: results.video.results, 
                    similarArtists: results.similarArtists.results, 
                    bandInfo: results.bandInfo.results, 
                    lyrics: results.lyrics.results 
                });
            });
        });
    };

    jps.getVideo = function (req, res) {
        if (!req.query || !req.query.id || !isNumeric(req.query.id)) {
            res.send('Invalid id');
            return;
        }
        var connection = mysql.createConnection(options.dbConnection);
        connection.query('SELECT * FROM songs WHERE id = ?', [req.query.id], function (err, data) {
            connection.end();
            if (err) { throw err; }
            if (data.length < 1) {
                res.send('No songs matching id');
                return;
            }
            metalminer.getVideo(data[0], function (err, results) {
                if (err) {
                    res.send('No info found.');
                    return;
                }
                res.send(results);
            });
        });
    };

    jps.getBandInfo = function (req, res) {
        if (!req.query || !req.query.id || !isNumeric(req.query.id)) {
            res.send('Invalid id');
            return;
        }
        var connection = mysql.createConnection(options.dbConnection);
        connection.query('SELECT * FROM songs WHERE id = ?', [req.query.id], function (err, data) {
            connection.end();
            if (err) { throw err; }
            if (data.length < 1) {
                res.send('No songs matching id');
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
    };

    jps.getLyrics = function (req, res) {
        if (!req.query || !req.query.id || !isNumeric(req.query.id)) {
            res.send('Invalid id');
            return;
        }
        var connection = mysql.createConnection(options.dbConnection);
        connection.query('SELECT * FROM songs WHERE id = ?', [req.query.id], function (err, data) {
            connection.end();
            if (err) { throw err; }
            if (data.length < 1) {
                res.send('No songs matching id');
                return;
            }
            metalminer.getLyrics(data[0], function (err, data) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(data);
                }
            });
        });
    };

    jps.getRandom = function (req, res) {
        var connection = mysql.createConnection(options.dbConnection);
        var id = req.query.id; // Random from directory
        if (id) {
            connection.query('SELECT * FROM songs WHERE dirid = ' + connection.escape(id) + 'ORDER BY RAND() LIMIT ?', parseInt(req.query.count, 10) || 1, function (err, data) {
                if (err) { throw err; }
                connection.end();
                res.send(data);
            });
        } else {
            connection.query('SELECT * FROM songs ORDER BY RAND() LIMIT ?', parseInt(req.query.count, 10) || 1, function (err, data) {
                if (err) { throw err; }
                connection.end();
                res.send(data);
            });
        }
    };

    var getSimilarArtistsInternal = function (id, connection, callback) {
        if (!id || !isNumeric(id)) {
            callback('Invalid id.');
            return;
        }
        connection = connection || mysql.createConnection(options.dbConnection);
        connection.query('SELECT * FROM songs WHERE id = ?', [id], function (err, data) {
            if (err) { throw err; }
            if (data.length < 1) {
                connection.end();
                callback('Invalid id.');
            }
            metalminer.getSimilarArtists(data[0], function (err, results) {
                if (err) {
                    connection.end();
                    return err;
                }
                async.map(results, function (item, callback) {
                    connection.query('SELECT dirid FROM songs WHERE artist = ? LIMIT 1', item, function (err, data2) {
                        if (err) {
                            callback(err);
                            throw err;
                        }
                        if (data2 && data2.length > 0 && data2[0] && data2[0].dirid) {
                            callback(null, { item: item, dirid: data2[0].dirid });
                        } else {
                            callback(null, { item: item });
                        }
                    });
                }, function (err, sendobj) {
                    connection.end();
                    if (err) { throw err; }
                    sendobj.sort(function (a, b) {
                        if (a.dirid && !b.dirid)
                            return -1;
                        if (!a.dirid && b.dirid)
                            return 1;
                        return a.item > b.item ? 1 : -1;
                    });
                    callback(null, sendobj);
                });
            });
        });
    };

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
                    res.send(err);
                    return;
                }
                async.map(results, function (item, callback) {
                    connection.query('SELECT dirid FROM songs WHERE artist = ? LIMIT 1', item, function (err, data2) {
                        if (err) {
                            callback(err);
                            throw err;
                        }
                        if (data2 && data2.length > 0 && data2[0] && data2[0].dirid) {
                            callback(null, { item: item, dirid: data2[0].dirid });
                        } else {
                            callback(null, { item: item });
                        }
                    });
                }, function (err, sendobj) {
                    connection.end();
                    if (err) { throw err; }
                    sendobj.sort(function (a, b) {
                        if (a.dirid && !b.dirid)
                            return -1;
                        if (!a.dirid && b.dirid)
                            return 1;
                        return a.item > b.item ? 1 : -1;
                    });
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
    
    jps.downloadSongs = function (req, res) {};

    jps.getImage = function (req, res) {
        var id = isNumeric(req.query.id) ? req.query.id : options.baseDirId,
            small = req.query && (req.query.small == '1');
        var connection = mysql.createConnection(options.dbConnection);
        var qry = 'SELECT ' + (small ? 'cover_small' : 'cover') + ', dirname FROM dirs WHERE id = ?';
        connection.query(qry, id, function (err, data) {
            if (err) { throw err; }
            connection.end();
            if (data.length < 1 || !(data[0].cover || data[0].cover_small)) {
                res.sendfile(options.defaultAlbumCover);
                return;
            }
            var fullpath = path.join(data[0].dirname, data[0].cover || data[0].cover_small);
            fullpath = path.normalize(fullpath);
            if (fs.existsSync(fullpath)) {
                res.sendfile(path.normalize(fullpath));
            } else {
                res.sendfile(options.defaultAlbumCover);
            }
        });
    };

    jps.getMusic = function (req, res) {
        var id = isNumeric(req.query.id) ? req.query.id : options.baseDirId;
        var qry = 'SELECT dir, filename, filesize, dirid from songs WHERE id = ?';
        var connection = mysql.createConnection(options.dbConnection);
        connection.query(qry, [id], function (err, data) {
            var fullpath, filesize, parts, start, end, contentType, i, readStream;
            if (err) { throw err; }
            qry = 'UPDATE songs SET playcount = playcount + 1 WHERE id = ?';
            connection.query(qry, [id], function (err, data) {
                connection.end();
            });
            if (data.length < 1) { return; }
            recSongPlay(req, data[0].dirid);
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
            readStream.pipe(res);
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
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        needle = connection.escape('%' + needle + '%');
        var artist = (searchsettings.artist === 'true') ? 'artist LIKE ' + needle + ' ' : null;
        var album = (searchsettings.album === 'true') ? 'album LIKE ' + needle + ' ' : null;
        var title = (searchsettings.title === 'true') ? 'title LIKE ' + needle + ' ' : null;
        var all = [title, artist, album].filter(function (val) { return val !== null; }).join('OR ');
        var qry = 'SELECT * FROM songs WHERE ' + all + 'LIMIT 100;';
        connection.query(qry, function (err, data) {
            if (err) { throw err; }
            if (searchsettings.album) {
                qry = 'SELECT * FROM dirs WHERE dirname LIKE ' + connection.escape(needle) + ' LIMIT 100';
                connection.query(qry, function (err, data2) {
                    if (err) { throw err; }
                    connection.end();
                    data2 = data2 ? data2.concat(data) : data;
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
            connection.query('SELECT d.dirid, ancestors FROM dirs, (SELECT dirid FROM songs WHERE id = ? LIMIT 1) d WHERE d.dirid = dirs.id', id, function (err, data) {
                if (err) { throw err; }
                connection.end();
                res.send(data[0].ancestors + ',' + data[0].dirid);
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
        connection.query('SELECT * FROM songs WHERE dirid = ? ORDER BY filename;', [id], function (err, data) {
            if (err) { throw err; }
            connection.query('SELECT * FROM dirs WHERE parent_id = ?;', [id], function (err, data2) {
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
    
    jps.getPopular = function (req, res) {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = 'SELECT * FROM dirs, (SELECT dirid, SUM(playcount) AS pc FROM songs GROUP BY dirid ORDER BY pc DESC LIMIT 10) pop WHERE pop.dirid = dirs.id;';
        connection.query(qry, function (err, data) {
            if (err) { throw err; }
            connection.end();
            res.send(data);
        });
    };
        
    jps.getPopular2 = function (req, res) {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var interval = (req.query && req.query.interval && isNumeric(req.query.interval)) ? req.query.interval : 7;
        var count = (req.query && req.query.count && isNumeric(req.query.count)) ? req.query.count : 15;
        count = Math.min(count, 100);
        var qry = 'SELECT album_id, COUNT(album_id) AS cnt_album_id FROM songplays WHERE time >= DATE_SUB(NOW(), INTERVAL ' + 
                interval + ' DAY) GROUP BY album_id ORDER BY cnt_album_id DESC LIMIT ' + count;
        qry = 'SELECT * FROM dirs, (' + qry + ') popalbums WHERE popalbums.album_id = dirs.id LIMIT ' + count + ';';
        connection.query(qry, function (err, data) {
            if (err) { throw err; }
            connection.end();
            res.send(data);
        });
    };
    
    jps.getNewest = function (req, res) {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = 'SELECT * FROM dirs, ' + 
            '(SELECT dirid FROM songs GROUP BY dirid ORDER BY last_modified DESC LIMIT 10) news ' + 
            'WHERE news.dirid = dirs.id;';
        connection.query(qry, function (err, data) {
            if (err) { throw err; }
            connection.end();
            res.send(data);
        });
    };

    // TODO: Test
    jps.getPlaylists = function (req, res) {
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = 'SELECT * FROM playlists;';
        connection.query(qry, function (err, data) {
            if (err) { throw err; }
            connection.end();
            res.send(data);
        });
    };

    // TODO: Test
    jps.getPlaylist = function (req, res) {
        if (!req.query.id || !isNumeric(req.query.id)) {
            return;
        }
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = 'SELECT s.* FROM songs s INNER JOIN playlistsongs pls ON s.id = pls.songid WHERE pls.playlistid = ?;';
        connection.query(qry, req.query.id, function (err, data) {
            if (err) { throw err; }
            connection.end();
            res.send(data);
        });
    };

    // TODO: Test
    // Requires: req.body.songs (array of songs with id), req.body.name (name of playlist)
    // Optional: req.body.id (if existing playlist should be updated)
    jps.uploadPlaylist = function (req, res) {
        if (!req.body || !req.body.songs) {
            res.send({ success: false });
            return;
        }
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        if (req.body.id && isNumeric(req.body.id) && req.body.id > -1) {
            var cnt = 0;
            for (var i = 0; i < req.body.songs.length; i++) {
                connection.query('INSERT INTO playlistsongs SET playlistid = ' + req.body.id + ', songid = ' + req.body.songs[i].id, function (err, result) {
                    if (err) { 
                        connection.end();
                        res.send({ success: false });
                        throw err; 
                    }
                    if (cnt++ == req.body.songs.length) {
                        connection.end();
                        res.send({ success: true });
                    }
                });
            }
            return;
        }
        if (!req.body || !req.body.name) {
            connection.end();
            res.send({ success: false });
            return; 
        }
        var qry = 'INSERT INTO playlists SET name = ?;';
        var qryres = connection.query(qry, req.body.name, function (err, data) {
            if (err) {
                connection.end();
                res.send({ success: false });
                throw err; 
            }
            var cnt = 0;
            for (var i = 0; i < req.body.songs.length; i++) {
                var tmp = connection.query('INSERT INTO playlistsongs SET playlistid = ' + qryres._results[0].insertId + ', songid = ' + req.body.songs[i].id, function (err, result) {
                    if (err) { throw err; }
                    if (++cnt == req.body.songs.length) {
                        connection.end();
                        res.send({ success: true });
                    }
                });
            }
        });
    };

    // TODO: Test
    // Requires: req.query.id (id of playlist to delete)
    jps.deletePlaylist = function (req, res) {
        if (!req.body.id || !isNumeric(req.body.id)) {
            res.send({ success: false });
            return;
        }
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        connection.query('DELETE FROM playlistsongs WHERE playlistid = ?;', req.body.id, function (err, result) {
            if (err) { 
                connection.end();
                res.send({ success: false });
                throw err; 
            }
            connection.query('DELETE FROM playlists WHERE id = ?', req.body.id, function (err, result) {
                if (err) { 
                    connection.end();
                    res.send({ success: false });
                    throw err; 
                }
                connection.end();
                res.send({ success: true });
            });
        });
    };

    var recSongPlay = function (req, dirid) {
        if (!req.query.id || !isNumeric(req.query.id)) {
            return;
        }
        var connection = mysql.createConnection(options.dbConnection);
        connection.connect();
        var qry = 'INSERT INTO songplays (ip_number, song_id, album_id) VALUES ("' + req.connection.remoteAddress + '",' + req.query.id + ',' + dirid + ');';
        var query = connection.query(qry, function (err) {
            if (err) { throw err; }
            connection.end();
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