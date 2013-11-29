(function ($, jplay) {
    'use strict';
    var Playlist = (function () {
        function Playlist(container) {
            this.jqobj = container;
            this.repeatbutton = jplay.ui.elements.repeatbutton;
            this.shufflebutton = jplay.ui.elements.shufflebutton;
            this.items = []; // TODO: Remove this. It probably shouldn't exist.
            this.PlaylistItems = []; // Array of PlaylistItem objects.
            this.id = -1; // Number. If remote playlist, set to playlist id.

            var that = this;
            this.repeatbutton.click(function () { that.togglerepeat(); });
            this.shufflebutton.click(function () { that.toggleshuffle(); });
            $(document).on('keydown', 'input:text', function (e) {
                e.stopPropagation();
            }).on('contextmenu', '.songinplaylist', function (e) {
                e.preventDefault();
                that.removeItem($(this));
                that.save();
            }).on('dblclick', '.songinplaylist', function (e) {
                e.preventDefault();
                jplay.player.setActiveSong($(this));
            });
            this.jqobj.sortable({ 
                'axis': 'y',
                'start': function (event, ui) {
                    ui.item.startPos = ui.item.index();
                },
                'update': function (event, ui) {
                    that.PlaylistItems.splice(ui.item.index(), 0, 
                        that.PlaylistItems.splice(ui.item.startPos, 1)[0]);
                    that.save();
                } 
            });
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
        }

        Playlist.prototype.save = function () {
            var plis = this.PlaylistItems.map(function (item) {
                return item.data;
            });
            jplay.shuffle.update();
            $(document).trigger('jplay.playlistsave');
            localStorage.setItem('playlist', JSON.stringify(plis));
            return this;
        };

        Playlist.prototype.clear = function () {
            this.PlaylistItems.forEach(function (item) {
                item.delete();
            });
            this.PlaylistItems = [];
            this.save();
            return this;
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
                            var song = self.addFile(item, position, before);
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
            return this;
        };

        Playlist.prototype.addFile = function (json, position, before, callback) {
            var that = this;
            var build = function (json) {
                var item = new PlaylistItem(json);
                if (item) {
                    if (position && (position.is('ul') || position.is('li'))) {
                        var searchId = $(position).data('attribs').id;
                        var pli = that.getPlaylistItemById(searchId);
                        if (before) {
                            item.index = pli.index;
                            that.PlaylistItems.splice(pli.index, 0, item);
                            item.node.insertBefore($(position));
                        } else {
                            item.index = pli.index + 1;
                            that.PlaylistItems.splice(pli.index + 1, 0, item);
                            item.node.insertAfter($(position));
                        }
                    } else {
                        that.PlaylistItems.push(item);
                        item.node.appendTo(that.jqobj);
                    }
                }
                $(document).trigger('jplay.playlistchange');
                return item.node;
            };
            if (Object.prototype.toString.call(json) === '[object Array]') {
                $.get('/getSongInfo', { 'id': json }, function (data) {
                    data.map(function (item) { build(item, position, before); });
                });
            } else {
                return build(json, position, before);
            }
        };

        Playlist.prototype.removeItem = function (obj) {
            var item = this.getPlaylistItemByJQObj(obj);
            item.item.delete();
            this.PlaylistItems.splice(item.index, 1);
            return this;
        };

        Playlist.prototype.getPlaylistItemById = function (id) {
            var retval;
            this.PlaylistItems.forEach(function (item, index) {
                if (item.data.id == id) {
                    retval = {
                        item: item,
                        index: index
                    };
                    return; 
                }
            });
            return retval;
        };

        Playlist.prototype.getPlaylistItemByJQObj = function (obj) {
            var retval;
            this.PlaylistItems.forEach(function (item, index) {
                if (item.node.is(obj)) {
                    retval = {
                        item: item,
                        index: index
                    };
                    return;
                }
            });
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
            return this;
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
            return this;
        };

        Playlist.prototype.uploadToServer = function (name) {
            $.post('/playlist', {'name': name, 'songs': this.items, 'id': this.id }, function (data) {
                jplay.customplaylists.update();
            });
            return this;
        };

        Playlist.prototype.getSelected = function () {
            return this.items.filter(function(item) { 
                return item.selected; 
            });
            return this;
        };
        
        return Playlist;
    })();

    var PlaylistItem = (function () {
        function PlaylistItem(data, type) {
            var json, html, title, texts;
            var self = this;
            this.selected = false;
            this.playing = false;
            this.parent = parent;
            this.data = data;
            this.type = type || 'mp3';
            this.index = -1;
            html = '<span class="playlist_artist">' + data.artist + '</span> ' +
                '<span class="playlist_album">- ' + data.album + '</span> ' +
                '<span class="playlist_title">- ' + data.title + '</span> ' +
                '<span class="playlist_year">- ' + data.year + '</span>';
            title = '';
            texts = ['Artist', 'Song', 'Album', 'Year'];
            title = [data.artist, data.title, data.album, data.year].map(function (item, i) {
                return item ? texts[i] + ':\t' + item : '';
            }).filter(String).join('\n');
            this.node = $('<li/>').
                addClass('songinplaylist').
                html(html).
                attr('title', title).
                data('attribs', data).
                data('playlistorder', $('#songinplaylist'));
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
        };

        return PlaylistItem;
    })();

    $(document).on('jplay.inited', function () {
        jplay.playlist = new Playlist(jplay.ui.elements.playlist);
    });
})($, jplay);
