(function () {
    'use strict';

    var PORT = 8088,
		jps = require('./jps.js'),
		express = require('express'),
		app = express(),
        db = require('./db_connector.js'),
		server = require('http').createServer(app);

    server.listen(PORT);

    app.configure(function () {
        app.use(express.static(__dirname + '/public'));
        app.use(express.bodyParser());
    });
    app.get('/', function () { console.log("asd"); });
    app.get('/dirtree', jps.dirtree);
    app.get('/getMusic', jps.getMusic);
    app.get('/getImage', jps.getImage);
    app.get('/downloadSong', jps.downloadSong);
    app.get('/downloadSongs', jps.downloadSongs);
    app.get('/search', jps.searchFile);
    app.get('/getAncestors', jps.getIdArray);
    app.get('/getSongInfo', jps.getSongInfo);
    app.get('/addDir', jps.addDir);
    app.get('/getLyrics', jps.getLyrics);
    app.get('/getSimilar', jps.getSimilarArtists);
    app.get('/getBandInfo', jps.getBandInfo);
    app.get('/getVideo', jps.getVideo);
    app.get('/getPopular', jps.getPopular);
    app.get('/getPopular2', jps.getPopular2);
    app.get('/getRandom', jps.getRandom);
    app.get('/getSidebarInfo', jps.getSidebarInfo);
    app.get('/getPlaylists', jps.getPlaylists);
    app.get('/playlist', jps.getPlaylist);
    app.post('/playlist', jps.uploadPlaylist);
    app.delete('/playlist', jps.deletePlaylist);

    var args = process.argv.slice(2);
    switch (args[0]) {
        case 'investigate':
            db.investigate();
            break;
        case 'build':
            db.build();
            break;
        case 'update':
            db.update();
            break;
        default:
            break;
    }

    require('./chat.js').init(server);

    /*require('fs').watch('C:\\aaa\\music', { persistent: true }, function (event, filename) {
    console.log(event + ': ' + filename);
    });*/

    console.log('Server listening at port ' + server.address().port);
} ());