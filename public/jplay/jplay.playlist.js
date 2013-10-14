(function ($, jplay) {
    'use strict';
    var Playlist = function () {
        this.jqobj = jplay.ui.elements.playlist;
        this.repeatbutton = jplay.ui.elements.repeatbutton;
        this.shufflebutton = jplay.ui.elements.shufflebutton;
        this.dirCounter = 0; // For addDir()
        this.items = [];
    };
    Playlist.prototype.init = function () {
        var that = this;
        this.repeatbutton.click(function () { that.togglerepeat(); });
        this.shufflebutton.click(function () { that.toggleshuffle(); });
        $(document).on('keydown', 'input:text', function (e) {
            e.stopPropagation();
        }).on('contextmenu', '.songinplaylist', function (e) {
            e.preventDefault();
            $(this).remove();
            that.save();
        }).on('dblclick', '.songinplaylist', function (e) {
            e.preventDefault();
            jplay.player.setActiveSong($(this));
        });
        this.jqobj.sortable();
        if (jplay.settings.items.saveplaylist &&
            localStorage.getItem('playlist')) {
            this.items = $.parseJSON(localStorage.getItem('playlist'));
            if (this.items) {
                for (var i = 0, endi = this.items.length; i < endi; i++) {
                //$.each(this.items, function () {
                    this.addFile(this.items[i]);
                //});
                }
            }
        }
        $('#playlistnameinput').dialog({
            autoOpen: false,
            height: 120,
            width: 250,
            modal: false,
            resizable: false,
            title: 'Save playlist as',
            buttons: {
                'Save': function () {
                    var name = $('#playlistnameinput #name').get(0).value;
                    if (name === '') {
                        return;
                    }
                    jplay.customplaylists.saveNew($('#playlistnameinput #name').get(0).value);
                    if ($('#uploadtoservercb').get(0).checked) {
                        that.uploadToServer(name);
                    }
                    $(this).dialog('close');
                }
            }
        });
        $('#saveplaylistbutton').click(function () {
            $('#playlistnameinput').dialog('open');
        });
        $('#clearplaylistbutton').click(function () {
            that.clear();
        });
        jplay.shuffle.update();
    };
    Playlist.prototype.save = function () {
        var songs, tmp, that = this;
        this.items = [];
        songs = this.jqobj.children('li');
        $.each(songs, function () {
            tmp = $(this).data();
            that.items.push($(this).data("attribs"));
        });
        jplay.shuffle.update();
        $(document).trigger('jplay.playlistsave');
        localStorage.setItem('playlist', JSON.stringify(this.items));
    };
    Playlist.prototype.clear = function () {
        jplay.ui.elements.playlist.children('li').remove();
        this.save();
    };
    Playlist.prototype.addDir = function (dirObj, position, before, callback) {
        this.dirCounter++;
        var obj = (dirObj instanceof $) ? dirObj.data() : dirObj;
        $.get('/addDir', { 'id': obj.id }, $.proxy(function (results) {
            var firstnode;
            for (var i = 0, endi = results.length; i < endi; i++) {
                var value = results[i];
                if (!value.isdir) {
                    if (!firstnode) {
                        firstnode = this.addFile(value);
                    } else {
                        this.addFile(value);
                    }
                } else {
                    this.addDir(value, null, null, callback);
                }
                if (i === endi - 1) {
                    this.dirCounter--;
                    if (this.dirCounter === 0) {
                        this.save();
                        if (callback) {
                            callback(firstnode);
                        }
                    }
                }
            }
        }, this));
    };
    Playlist.prototype.addFile = function (json, position, before) {
        var html, title, node, retval, texts;
        json.title = json.title || json.filename;
        html = '<span class="playlist_artist">' + json.artist + '</span> ' +
            '<span class="playlist_album">- ' + json.album + '</span> ' +
            '<span class="playlist_title">- ' + json.title + '</span> ' +
            '<span class="playlist_year">- ' + json.year + '</span>';
        title = '';
        texts = ['Artist', 'Song', 'Album', 'Year'];
        title = [json.artist, json.title, json.album, json.year].map(function (item, i) {
            return item ? texts[i] + ':\t' + item : '';
        }).filter(String).join('\n');
        node = $('<li/>').addClass('songinplaylist').html(html).attr('title', title).
            data('attribs', json).data('playlistorder', $('#songinplaylist'));
        if (position && (position.is('ul') || position.is('li'))) {
            if (before) {
                node.insertBefore($(position));
                retval = $(position);
            } else {
                retval = node.insertAfter($(position));
            }
        } else {
            retval = node.appendTo(jplay.ui.elements.playlist);
        }
        return retval;
    };
    Playlist.prototype.togglerepeat = function () {
        if (jplay.settings.items.repeatall === true) {
            jplay.settings.items.repeatall = false;
            jplay.settings.update();
            this.repeatbutton.removeClass('ui-state-highlight');
        } else {
            jplay.settings.items.repeatall = true;
            jplay.settings.update();
            this.repeatbutton.addClass('ui-state-highlight');
        }
    };
    Playlist.prototype.toggleshuffle = function () {
        if (jplay.settings.items.shuffle === true) {
            jplay.settings.items.shuffle = false;
            jplay.settings.update();
            this.shufflebutton.removeClass('ui-state-highlight');
        } else {
            jplay.settings.items.shuffle = true;
            jplay.settings.update();
            this.shufflebutton.addClass('ui-state-highlight');
        }
    };
    Playlist.prototype.uploadToServer = function (name) {
        $.get('/uploadPlaylist', {'name': name, 'songs': this.items }, function (data) {

        });
    };
    $(document).on('jplay.inited', function () {
        jplay.playlist = new Playlist();
        jplay.playlist.init();
    });
})($, jplay);
