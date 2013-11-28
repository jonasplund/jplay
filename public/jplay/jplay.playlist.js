(function ($, jplay) {
    'use strict';
    var Playlist = (function () {
        function Playlist() {
            this.jqobj = jplay.ui.elements.playlist;
            this.repeatbutton = jplay.ui.elements.repeatbutton;
            this.shufflebutton = jplay.ui.elements.shufflebutton;
            this.dirCounter = 0; // For addDir()
            this.items = [];
            this.id = -1; // Number. If remote playlist, set to playlist id.
        }

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
                        this.addFile(this.items[i]);
                    }
                }
            }
            $('#playlistnameinput').dialog({
                autoOpen: false,
                height: 150,
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
                        if ($('#uploadtoservercb').get(0).checked) {
                            that.uploadToServer(name);
                        } else {
                            jplay.customplaylists.saveNew($('#playlistnameinput #name').get(0).value);
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
            var obj = dirObj instanceof $ ? dirObj.data() : dirObj,
                callcnt = 0,
                firstsong,
                self = this;
            (function addDirInner(id) {
                callcnt++;
                (function (currid) {
                    $.get('/addDir', { 'id': currid }).done(function (results) {
                        callcnt--;
                        var dirs = results.filter(function (item) { return !!item.isdir; } );
                        var files = results.filter(function (item) { return !item.isdir; } );
                        dirs.forEach(function(item) {
                            addDirInner(item.id);
                        });
                        files.forEach(function(item) {
                            var song = self.addFile(item);
                            if (!firstsong) {
                                firstsong = song;
                            }
                        });
                    }).then(function () {
                        self.save();
                        if (callcnt === 0 && callback) {
                            callback(firstsong);
                        }
                    });
                }) (id);
            }) (obj.id);
        };

        Playlist.prototype.addFile = function (json, position, before, callback) {
            var build = function (json) {
                var html, title, node, retval, texts;
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
                if (callback) { callback(retval); }
                return retval;
            };
            if (Object.prototype.toString.call(json) === '[object Array]') {
                $.get('/getSongInfo', { 'id': json }, function (data) {
                    data.map(function (item) { build(item, position, before); });
                });
            } else {
                return build(json, position, before);
            }
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
            $.post('/playlist', {'name': name, 'songs': this.items, 'id': this.id }, function (data) {
                jplay.customplaylists.update();
            });
        };

        Playlist.prototype.getSelected = function () {};
        
        return Playlist;
    })();

    var PlaylistItem = (function () {
        function PlaylistItem(data, type) {
            var json, html, title, texts;
            var self = this;
            this.selected = false;
            this.playing = false;
            this.parent = parent;
            this.type = type || 'mp3';
            html = '<span class="playlist_artist">' + json.artist + '</span> ' +
                '<span class="playlist_album">- ' + json.album + '</span> ' +
                '<span class="playlist_title">- ' + json.title + '</span> ' +
                '<span class="playlist_year">- ' + json.year + '</span>';
            title = '';
            texts = ['Artist', 'Song', 'Album', 'Year'];
            title = [json.artist, json.title, json.album, json.year].map(function (item, i) {
                return item ? texts[i] + ':\t' + item : '';
            }).filter(String).join('\n');
            this.node = $('<li/>').
                addClass('songinplaylist').
                html(html).
                attr('title', title).
                data('attribs', json).
                data('playlistorder', $('#songinplaylist')).
                click(self.select);
        }

        PlaylistItem.prototype.delete = function () {
            this.node.remove();
            return this;
        };

        PlaylistItem.prototype.insert = function (parent, position, before) {
            this.parent = parent;
            return this;
        };

        PlaylistItem.prototype.select = function () {
            this.node.addClass('selected');
            this.selected = true;
            return this;
        };

        PlaylistItem.prototype.activate = function () {
            this.node.addClass('active');
            return this;
        }

        return PlaylistItem;
    })();

    $(document).on('jplay.inited', function () {
        jplay.playlist = new Playlist();
        jplay.playlist.init();
    });
})($, jplay);
