(function () {
    'use strict';
    var MUSIC_DIR = "E:/Musik",
        //MUSIC_DIR = "C:\\aaa\\music",
		PORT = 8088,
		jps = require('./jps.js'),
		express = require('express'),
		app = express(),
		server = require('http').createServer(app),
		io = require('socket.io').listen(server, { "log level": 1 }),
        db = require('./db_connector.js');

    jps.configure({
        musicDir: MUSIC_DIR,
        baseDirId: 1
    });

    server.listen(PORT);

    app.configure(function () {
        app.use(express.static(__dirname + '/public'));
    });
    app.get('/', function () { });
    app.get('/dirtree', jps.dirtree);
    app.get('/getMusic', jps.getMusic);
    app.get('/getRandomSongs', jps.getRandomSongs);
    app.get('/getImage', jps.getImage);
    app.get('/downloadSong', jps.downloadSong);
    app.get('/downloadSongs', jps.downloadSongs);
    app.get('/dbUpdate', jps.dbUpdate);
    app.get('/search', jps.searchFile);
    app.get('/getAncestors', jps.getIdArray);
    app.get('/getSongInfo', jps.getSongInfo);
    app.get('/addDir', jps.addDir);
    app.get('/getLyrics', jps.getLyrics);

    String.prototype.lpad = function (padString, length) {
        var str = this;
        while (str.length < length) {
            str = padString + str;
        }
        return str;
    };
    var users = [];
    io.sockets.on('connection', function (client) {
        var user = {};
        user.id = client.id;
        user.name = null;
        user.ip = client.handshake.address.address;
        users.push(user);
        client.on('msg', function (data) {
            var msg = {
                address: client.handshake.address.address,
                message: data.message,
                time: data.time
            };
            client.broadcast.emit('msg', msg);
        });
        client.on('set_nickname', function () {
            for (var i = 0; i < users.length; i++) {
                //if (users[i].id === 
            }
        });
        client.on('disconnect', function () {
            clearInterval(users);
        });
    });
    //db.investigate();
    //db.build();
    db.update();
    //jps.setBaseDirId();

    /*require('fs').watch("C:\\aaa\\music", { persistent: true }, function (event, filename) {
    console.log(event + ": " + filename);
    });*/

    console.log("Server listening at http://jooon.mooo.com:8088");
} ());