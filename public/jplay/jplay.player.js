(function ($, jplay) {
	'use strict';

	var Player = (function () {
		function Player(settings) {
			this.activeSong = {};
			this.domobj = {};
			this.jqobj;
			this.errorTime = 0;

			// Only allowed to create one per page
            if (window.webkitAudioContext) {	
                this.audioContext = new window.webkitAudioContext();
            } else if (window.AudioContext) {
                this.audioContext = new window.AudioContext();
		    }
		}

        Player.prototype.createInstance = function () {
        	var that = this;
            var elements = jplay.ui.elements;
            if (this.jqobj && this.jqobj.is($)) {
                this.jqobj.remove();
            }
            this.jqobj = $('<audio></audio>').appendTo($('body')).prop('id', 'player');
            this.domobj = this.jqobj.get(0);
            this.jqobj.on('loadedmetadata', function () {
                this.play();
                if (jplay.settings.items.fft) {
                    if (that.audioContext && !that.mesource) {
                        that.mesource = that.audioContext.createMediaElementSource(that.domobj);
                    }
                    if (jplay.ui.elements.fft) {
                        jplay.ui.elements.fft.remove();
                        jplay.ui.elements.fft = null;
                    }
                    jplay.ui.elements.fft = $('<canvas></canvas>').
                    	prop('width', '200px').
                    	prop('height', '100px').
                    	prop('id', 'fft').
                    	insertBefore(jplay.ui.elements.covercontainer).
                    	fft({
	                        player: that.jqobj,
	                        audioContext: that.audioContext,
	                        source: that.mesource,
	                        volume: jplay.settings.items.volume
                    });
                }
                if (that.errorTime) {
                    that.currentTime = that.errorTime;
                    that.errorTime = 0;
                }
            }).on('ended', function () {
                that.next();
            }).on('timeupdate', function () {
                if (isNaN(this.currentTime) || isNaN(this.duration)) {
                    elements.time.text('--:--/--:--');
                    return;
                }
                elements.progressmeter.progressbar('option', 'value', 100 * this.currentTime / this.duration);
                var newTime = jplay.helpfunctions.toTimeString(this.currentTime) + '/' + 
                    jplay.helpfunctions.toTimeString(this.duration);
                // Avoid 3 of 4 full layouts per second
                if (elements.time.text() !== newTime) {
                    elements.time.text(newTime);
                }
                if (this.duration - this.currentTime < 10 && !that.soonTriggered) {
                    $(document).trigger({ type: 'jplay.soonnewsong', next: that.next(true).data('attribs') });
                    that.soonTriggered = true;
                }
            }).on('play', function () {
                elements.playpausebutton.button("option", "icons", { primary: "ui-icon-pause" }).addClass("ui-state-highlight");
            }).on('pause', function () {
                elements.playpausebutton.button("option", "icons", { primary: "ui-icon-play" }).removeClass("ui-state-highlight");
            }).on('error', function (e) {
                if (e && e.target && e.target.error) {
                    if (e.target.error.code === 2) {
                        that.errorTime = that.domobj.currentTime;
                        that.domobj.load();
                    } else {
                        that.next();
                    }
                }
            });
            this.setVolume(jplay.settings.items.volume);
        };

        Player.prototype.init = function () {
        	var that = this;
            var elements = jplay.ui.elements;
            this.createInstance();
            elements.nextbutton.click(function () { that.next(); });
            elements.prevbutton.click(function () { that.prev(); });
            elements.playpausebutton.click(function () { that.toggleplay(); });
            elements.mutebutton.click(function () { that.togglemute(); });
            elements.playinfo.hover(function () {
                elements.searchlinksbutton.fadeIn(jplay.settings.items.animationspeed / 3);
            }, function () {
                elements.searchlinksbutton.fadeOut(jplay.settings.items.animationspeed / 3);
            });
            elements.searchlinksbutton.click(function () {
                elements.searchlinksmenu.css('display', 'block'); //.fadeIn(jplay.settings.items.animationspeed / 3);
                elements.searchlinksmenu.position({
                    my: 'left+2px top',
                    at: 'right top',
                    of: elements.searchlinksbutton,
                    within: window
                });
            });
            elements.searchlinksmenu.on('menuselect', function (event, ui) {
                var item = ui.item, url, type, activeSong, safeUrl;
                safeUrl = function (url) { return url.replace(/\\w/gi, '+').replace(/&/gi, '%26'); };
                if (item.has('ul').length > 0 || $.isEmptyObject(jplay.player.activeSong)) {
                    return true;
                }
                activeSong = this.activeSong.data('attribs');
                type = item.prop('id');
                switch (type) {
                    case 'search_google_instant':
                        url = 'https://www.google.se/search?q=' + encodeURI(activeSong.artist) + '&btnI=1';
                        break;
                    case 'search_google':
                        url = 'https://www.google.se/search?q=' + encodeURI(activeSong.artist);
                        break;
                    case 'search_youtube_band':
                        url = 'http://www.youtube.com/results?search_query=' + encodeURI(activeSong.artist);
                        break;
                    case 'search_youtube_song':
                        url = 'http://www.youtube.com/results?search_query=' + encodeURI(activeSong.artist + '+' + activeSong.title.replace(/^[0-9]{1,3} -/, ""));
                        break;
                    case 'search_wikipedia':
                        url = 'http://en.wikipedia.com/w/index.php?search=' + encodeURI(activeSong.artist);
                        break;
                    case 'search_darklyrics':
                        url = 'http://www.google.se/search?q=' + encodeURI(activeSong.artist + '+' + activeSong.album) + '+site%3Awww.darklyrics.com&btnI=1';
                        break;
                }
                item.find('a').prop({
                    'href': url,
                    'target': '_blank'
                });
                return true;
            });
            elements.progressmeter.progressbar().click(function (e) {
                var domobj = that.domobj;
                domobj.currentTime = domobj.duration * (e.pageX - $(this).offset().left) / $(this).width();
            });
            elements.volumeslider.slider({
                value: jplay.settings.items.volume * 100,
                slide: function () {
                    that.setVolume($(this).slider('option', 'value') / 100);
                    jplay.settings.update();
                },
                change: function () { // click
                    that.setVolume($(this).slider('option', 'value') / 100);
                    jplay.settings.update();
                }
            });
            elements.covercontainer.cover({});
            elements.addrandombutton.click(function () { jplay.searchfn.addRandom(); });
        };
        
        Player.prototype.toggleplay = function () {
            var playerdom = this.domobj;
            if ($.isEmptyObject(this.activeSong)) {
                this.next();
            }
            if (playerdom.paused) {
                playerdom.play();
            } else {
                playerdom.pause();
            }
        };

        Player.prototype.next = function (getInfo) {
            var nextSong;
            if ($.isEmptyObject(jplay.player.activeSong)) {
                if (jplay.settings.items.shuffle) {
                    this.setActiveSong($('#playlist .songinplaylist:eq(' + (jplay.shuffle.list[jplay.shuffle.index]) + ')'));
                    jplay.shuffle.index += 1;
                } else {
                    if (getInfo === true) {
                        return jplay.ui.elements.playlist.children().first('.songinplaylist');
                    } else {
                        this.setActiveSong(jplay.ui.elements.playlist.children().first('.songinplaylist'));
                    }
                }
            } else {
                if (jplay.settings.items.shuffle) {
                    nextSong = $('#playlist .songinplaylist:eq(' + (jplay.shuffle.list[jplay.shuffle.index]) + ')');
                    jplay.shuffle.index += 1;
                } else {
                    nextSong = this.activeSong.next(".songinplaylist");
                }
                if (nextSong.length === 0) {
                    if (jplay.settings.items.repeatall) {
                        if (jplay.settings.items.shuffle) {
                            jplay.shuffle.index = 0;
                            if (getInfo === true) {
                                return $("#playlist .songinplaylist:eq(" + jplay.shuffle.list[jplay.shuffle.index] + ")");
                            } else {
                                this.setActiveSong($("#playlist .songinplaylist:eq(" + jplay.shuffle.list[jplay.shuffle.index] + ")"));
                                jplay.shuffle.index += 1;
                            }
                        } else {
                            var children = jplay.ui.elements.playlist.children();
                            if (children.length > 0) {
                                if (getInfo === true) {
                                    return jplay.ui.elements.playlist.children().first(".songinplaylist");
                                } else {
                                    this.setActiveSong(jplay.ui.elements.playlist.children().first(".songinplaylist"));
                                }
                            }
                        }
                    }
                } else {
                    if (getInfo === true) { 
                        return nextSong; 
                    } else { 
                        this.setActiveSong(nextSong); 
                    }
                }
            }
        };
        
        Player.prototype.prev = function () {
            if ($.isEmptyObject(this.activeSong)) {
                if (jplay.settings.items.shuffle) {
                    jplay.shuffle.index = jplay.shuffle.list.length - 1;
                    this.setActiveSong($('#playlist .songinplaylist:eq(' + (jplay.shuffle.list[jplay.shuffle.index]) + ")"));
                    jplay.shuffle.index -= 1;
                } else {
                    this.setActiveSong(jplay.ui.elements.playlist.children('li').last('.songinplaylist'));
                }
            } else {
                var prev;
                if (jplay.settings.items.shuffle) {
                    prev = $('#playlist .songinplaylist:eq(' + (jplay.shuffle.list[jplay.shuffle.index]) + ')');
                    jplay.shuffle.index -= 1;
                } else {
                    prev = this.activeSong.prev('.songinplaylist');
                }
                if (prev.length === 0) {
                    if (jplay.settings.items.repeatall) {
                        if (jplay.settings.items.shuffle) {
                            jplay.shuffle.index = jplay.shuffle.list.length - 1;
                            this.setActiveSong($('#playlist .songinplaylist:eq(' + (jplay.shuffle.list[jplay.shuffle.index]) + ')'));
                            jplay.shuffle.index -= 1;
                        } else {
                            this.setActiveSong(jplay.ui.elements.playlist.children().last('.songinplaylist'));
                        }
                    }
                } else {
                    this.setActiveSong(prev);
                }
            }
        };

        Player.prototype.setActiveSong = function (playlistentry) {
            var ple, plcontainer, data, scrollto, relpos, oldSong;
            var that = this;
            ple = $(playlistentry);
            plcontainer = jplay.ui.elements.playlistcontainer;
            data = ple.data('attribs') || {};
            if (this.activeSong) {
                oldSong = $(this.activeSong).data().attribs;
            }
            this.activeSong = playlistentry;
            $('.songinplaylist').removeClass('activesong');
            ple.addClass('activesong');
            jplay.ui.elements.playinfo.find('.title').text(data.title);
            jplay.ui.elements.playinfo.find('.artist').text(data.artist);
            document.title = data.artist + ' - ' + data.title;
            relpos = ple.offset().top - plcontainer.offset().top;
            if (relpos + ple.height() >= plcontainer.height()) {
                scrollto = ple.offset().top + (2 * ple.height()) - plcontainer.height() - plcontainer.offset().top + plcontainer.scrollTop();
                jplay.ui.elements.playlistcontainer.animate({
                    scrollTop: scrollto
                }, jplay.settings.items.animationspeed);
            } else if (relpos < 0) {
                scrollto = ple.offset().top - ple.height() - plcontainer.offset().top + plcontainer.scrollTop();
                jplay.ui.elements.playlistcontainer.animate({
                    scrollTop: scrollto
                }, jplay.settings.items.animationspeed);
            }
            jplay.helpfunctions.showNotification(data);
            jplay.ui.elements.covercontainer.cover({ 'src': '/getImage?id=' + data.dirid });
            this.mesource = null;
            this.createInstance();
            this.jqobj.prop('src', '/getMusic?id=' + data.id).get(0).play();
            $(document).trigger({ type: 'jplay.newsong', from: oldSong, to: data, next: this.next(true).data('attribs') });
            this.soonTriggered = false;
            // FIXME: muted doesn't work after changing songs. Temporary solution:
            setTimeout(function () {
                that.togglemute();
                that.togglemute();
            }, 10);
        };

        Player.prototype.changeVolume = function (diff) {
            var player, vol;
            player = this.domobj;
            vol = (player.volume + diff) > 1 ? 1 : (player.volume + diff);
            if (vol <= 0) {
                vol = 0.00001; // 0 gives static
                if (!this.domobj.muted) {
                    this.togglemute();
                }
            } else {
                if (this.domobj.muted) {
                    this.togglemute();
                }
            }
            this.setVolume(vol);
            jplay.ui.elements.volumeslider.slider('option', 'value', vol * 100);
        };
        
        Player.prototype.setVolume = function (value) {
            jplay.settings.items.volume = value;
            this.domobj.volume = value;

            jplay.ui.elements.volumeslider.slider.value = 100 * value;
            if (jplay.settings.items.fft && jplay.ui.elements.fft) {
                jplay.ui.elements.fft.fft({ 'volume': value });
            }
        };

        Player.prototype.togglemute = function () {
            var player = this.domobj;
            player.muted = !(player.muted);
            if (player.muted) {
                jplay.ui.elements.mutebutton.button('option', 'icons', { primary: 'ui-icon-volume-off' }).addClass('ui-state-highlight');
                jplay.settings.update();
            } else {
                jplay.ui.elements.mutebutton.button('option', 'icons', { primary: 'ui-icon-volume-on' }).removeClass('ui-state-highlight');
                jplay.settings.update();
            }
        };

        return Player;
	})();

	jplay.player = new Player();

}) ($, jplay);