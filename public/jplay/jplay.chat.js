(function ($) {
    'use strict';
    $.widget('jplay.chat', {
        options: {
            header: null,    // Array formatted as [headerID, headerText]
            userlist: false, // Bool
            timestamp: true, // Bool
            url: 'localhost' // String
        },
        _create: function () {
            if (this.options.header && this.options.header.length === 2) {
                this.header = $('#' + this.options.header[0]).text(this.options.header[1]);
            }
            this.container = $('<div></div>').addClass('chatcontainer').appendTo(this.element);
            this.content = $('<div></div>').addClass('chatcontent').appendTo(this.container);
            this.input = $('<input></input>').addClass('chatinput').appendTo(this.container);
            this.socket = window.io.connect(this.options.url);
            this.socket.on('msg', $.proxy(this._receivemsg, this));
            this.socket.on('userlist', $.proxy(this._receiveuserlist, this));
            this.input.keyup($.proxy(this._keyupeh, this));
        },
        destroy: function () {
            // Does this work?
            this.socket.disconnect();
            $.Widget.prototype.destroy.call(this);
        },
        _keyupeh: function (e) {
            if (e.which === 13) {
                this._sendmsg();
            }
        },
        _sendmsg: function () {
            var p = $('<p></p>').addClass('mychat'),
                msg = {},
                localmsg = '';
            if (this.options.timestamp) {
                localmsg += '[' + this._formattime(new Date()) + '] ';
            }
            localmsg += '<You> ' + this.input.val();
            p.text(localmsg);
            this.content.append(p);
            msg.message = this.input.val();
            msg.time = new Date();
            this.socket.emit('msg', msg);
            this.input.val('');
            this.content.scrollTop(this.content.height());
        },
        _receiveuserlist: function (data) {
            console.log(data);
        },
        _receivemsg: function (data) {
            var message = '';
            if (this.options.timestamp) {
                message += '[' + this._formattime(new Date(data.time)) + '] ';
            }
            message += '<' + data.address + '> ' + data.message;
            var p = $('<p></p>').addClass('otherchat').text(message);
            this.content.append(p);
            this.content.scrollTop(this.content.height());
        },
        _formattime: function (time) {
            return this._lpad(time.getHours().toString(), '0', 2) + ':' +
                this._lpad(time.getMinutes().toString(), '0', 2) + ':' +
                this._lpad(time.getSeconds().toString(), '0', 2);
        },
        _lpad: function (str, padString, length) {
            while (str.length < length) {
                str = padString + str;
            }
            return str;
        }
    });
})($);