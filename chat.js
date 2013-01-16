(function () {
    'use strict';
    var chat = module.exports = {};

    chat.init = function (server) {
        var io = require('socket.io').listen(server, { 'log level': 1 });
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
            /*client.on('set_nickname', function () {
                for (var i = 0; i < users.length; i++) {
                    var id = users[i].id;
                    //if (users[i].id === 
                }
            });*/
            client.on('disconnect', function () {
                clearInterval(users);
            });
        });
    };
})();