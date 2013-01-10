var jplay = {
    ui: {
        elements: {
            bigscreen: {},
            smallscreen: {},
            nextbutton: {},
            prevbutton: {},
            playpausebutton: {},
            playinfo: {},
            searchlinksbutton: {},
            searchlinksmenu: {},
            progressmeter: {},
            volumeslider: {},
            covercontainer: {},
            time: {},
            lyricsbutton: {},
            bigscreenbutton: {},
            playlistcontainer: {},
            playlist: {},
            searchsettings: {},
            searchtext: {},
            mutebutton: {},
            saveplaylistbutton: {},
            clearplaylistbutton: {},
            addrandom: {},
            player: {},
            playerdomobj: {}
        },
        init: function () {
            "use strict";
            var elements = jplay.ui.elements;
            $("#maincontainer h2#settingsheader").click(function () {
                var div = $(this).next("div");
                if (div.css("display") === "block") {
                    div.hide("blind", jplay.settings.items.animationspeed, function () { });
                } else {
                    div.show("blind", jplay.settings.items.animationspeed, function () { });
                }
            });
            elements.bigscreen = $("#bigscreen");
            elements.smallscreen = $("#maincontainer");
            elements.nextbutton = $("#nextbutton,#bigscreen #bs_nextbutton");
            elements.prevbutton = $("#prevbutton,#bigscreen #bs_prevbutton");
            elements.playpausebutton = $("#playpausebutton,#bigscreen #bs_playpausebutton");
            elements.playinfo = $("#playinfo,#bigscreen #bs_playinfo");
            elements.searchlinksbutton = $("#searchlinksbutton");
            elements.searchlinksmenu = $("#searchlinksmenu");
            elements.progressmeter = $("#progressmeter");
            elements.volumeslider = $("#volumeslider");
            elements.mutebutton = $("#mutebutton");
            elements.covercontainer = $("#covercontainer");
            elements.bscover = $("#bs_coverrow");
            elements.time = $("#time");
            elements.lyricsbutton = $("#lyrics_button");
            elements.bigscreenbutton = $("#bigscreen_button").add("#bigscreen #bs_toggle");
            elements.playlistcontainer = $("#playlistcontainer");
            elements.playlist = $("#playlist");
            elements.searchsettings = $("#searchsettings");
            elements.searchtext = $("#searchtext");
            elements.saveplaylistbutton = $("#saveplaylistbutton");
            elements.clearplaylistbutton = $("#clearplaylistbutton");
            elements.shufflebutton = $("#shufflebutton");
            elements.repeatbutton = $("#repeatbutton");
            elements.addrandom = $("#addrandom");

            elements.mutebutton.button({
                icons: { primary: "ui-icon-volume-on" },
                text: false
            });
            elements.nextbutton.button({
                icons: { primary: "ui-icon-seek-next" },
                text: false
            });
            elements.playpausebutton.button({
                icons: { primary: "ui-icon-play" },
                text: false
            });
            elements.prevbutton.button({
                icons: { primary: "ui-icon-seek-prev" },
                text: false
            });
            elements.searchlinksbutton.button({
                icons: { primary: "ui-icon-info" },
                text: false
            });
            elements.searchlinksmenu.menu();
            elements.lyricsbutton.button({
                icons: { primary: "ui-icon-script" },
                label: "Get lyrics",
                text: false
            });
            elements.bigscreenbutton.filter(elements.smallscreen.find("*")).button({
                icons: { primary: "ui-icon-arrow-4-diag" },
                label: "Go to big screen mode (not implemented)",
                text: false
            });
            elements.saveplaylistbutton.button({
                icons: { primary: "ui-icon-disk" },
                text: false
            });
            elements.clearplaylistbutton.button({
                icons: { primary: "ui-icon-close" },
                text: false
            });
            elements.searchsettings.buttonset({});
            elements.shufflebutton.button({
                icons: { primary: "ui-icon-shuffle" },
                text: false
            });
            elements.repeatbutton.button({
                icons: { primary: "ui-icon-refresh" },
                text: false
            });
            elements.addrandom.button({
                icons: { primary: "ui-icon-transfer-e-w" },
                text: false,
                title: "Add random song to playlist",
                disabled: true
            });
        }
    },
    settings: {
        items: {},
        init: function () {
            "use strict";
            if (localStorage.getItem("settings")) {
                jplay.settings.items = $.parseJSON(localStorage.getItem("settings"));
                var items = jplay.settings.items;
                if (items.hasOwnProperty("shuffle")) {
                    if (items.shuffle) {
                        $("#shufflebutton").addClass("ui-state-highlight");
                    }
                }
                if (items.hasOwnProperty("repeatall")) {
                    if (items.repeatall) {
                        $("#repeatbutton").addClass("ui-state-highlight");
                    }
                }
                if (items.hasOwnProperty("notifications")) {
                    $("#notifications").get(0).checked = items.notifications;
                }
                if (items.hasOwnProperty("fft")) {
                    $("#fftsetting").get(0).checked = items.fft;
                }
                if (items.hasOwnProperty("saveplaylist")) {
                    $("#saveplaylist").get(0).checked = items.saveplaylist;
                }
                if (!items.hasOwnProperty("animations")) {
                    items.animations = $("#animations").get(0).checked;
                } else {
                    $("#animations").get(0).checked = items.animations;
                }
                if (items.hasOwnProperty("volume")) {
                    // Slider not inited yet
                    // jplay.ui.elements.volumeslider.slider("option", "value", jplay.settings.items.volume * 100);
                    // jplay.ui.elements.playerdomobj.volume = jplay.settings.items.volume;
                    jplay.player.setVolume(jplay.settings.items.volume);
                }
                if (!items.hasOwnProperty("animationspeed")) {
                    items.animationspeed = Number($("#animationspeed").get(0).value);
                } else {
                    $("#animationspeed").get(0).value = items.animationspeed;
                }
                if (items.hasOwnProperty("mute")) {
                    jplay.ui.elements.playerdomobj.muted = items.mute;
                    if (items.mute === true) {
                        jplay.ui.elements.mutebutton.button("option", "icons", { primary: "ui-icon-volume-off" }).addClass("ui-state-highlight");
                    }
                }
                if (items.hasOwnProperty("searchsettings")) {
                    $.each(items.searchsettings, function (key, setting) {
                        var el = jplay.ui.elements.searchsettings.find("#searchcheck" + key);
                        el.prop("checked", setting).button("refresh");
                    });
                }
                $.fx.off = !(items.animations);
            } else {
                jplay.settings.update();
            }
            $("#settingscontainer input").change(function () {
                jplay.settings.update();
            });
        },
        update: function () {
            "use strict";
            var items = jplay.settings.items;
            items.notifications = $("#notifications").get(0).checked;
            items.saveplaylist = $("#saveplaylist").get(0).checked;
            items.animations = $("#animations").get(0).checked;
            items.animationspeed = Number($("#animationspeed").get(0).value);
            items.fft = $("#fftsetting").get(0).checked;
            $.fx.off = !(items.animations);
            if (!items.saveplaylist) {
                localStorage.setItem("playlist", null);
            }
            if (!items.fft && jplay.ui.elements.fft) {
                // FIXME: Should be called automatically?
                jplay.ui.elements.fft.fft("destroy");
                jplay.ui.elements.fft.remove();
                jplay.ui.elements.fft = null;
                jplay.player.setVolume(items.volume);
            }
            if (items.fft && jplay.player.audioContext && !jplay.player.mesource) {
                jplay.player.mesource = jplay.player.audioContext.createMediaElementSource(jplay.player.domobj);
            }
            if (items.fft && !jplay.ui.elements.fft && jplay.player.audioContext && jplay.player.mesource) {
                jplay.ui.elements.fft = $("<canvas></canvas>").prop("width", "200px").prop("height", "100px").prop("id", "fft");
                jplay.ui.elements.fft.insertBefore(jplay.ui.elements.covercontainer);
                jplay.ui.elements.fft.fft({
                    player: jplay.player.jqobj,
                    audioContext: jplay.player.audioContext,
                    source: jplay.player.mesource,
                    volume: jplay.settings.items.volume
                });
            }
            items.volume = jplay.player.domobj.hasOwnProperty("volume") ? jplay.player.domobj.volume : 1;
            items.mute = jplay.player.domobj.muted;
            items.searchsettings = (function () {
                var retobj = {};
                $.each(jplay.ui.elements.searchsettings.children("input"), function (key, val) {
                    val = $(val);
                    retobj[val.prop("id").replace("searchcheck", "")] = val.prop("checked");
                });
                return retobj;
            } ());
            localStorage.setItem("settings", JSON.stringify(jplay.settings.items));
        }
    },
    player: {
        activeSong: {},
        domobj: {},
        errorTime: 0,
        createInstance: function () {
            "use strict";
            var elements = jplay.ui.elements;
            if (jplay.player.jqobj) {
                jplay.player.jqobj.remove();
            }
            jplay.player.jqobj = $("<audio></audio>").prop("id", "audio").appendTo($("body")).prop("id", "player");
            jplay.player.domobj = jplay.player.jqobj.get(0);
            jplay.player.jqobj.on("loadedmetadata", function () {
                this.play();
                if (jplay.settings.items.fft) {
                    if (jplay.player.audioContext && !jplay.player.mesource) {
                        jplay.player.mesource = jplay.player.audioContext.createMediaElementSource(jplay.player.domobj);
                    }
                    if (jplay.ui.elements.fft) {
                        jplay.ui.elements.fft.remove();
                        jplay.ui.elements.fft = null;
                    }
                    jplay.ui.elements.fft = $("<canvas></canvas>").prop("width", "200px").prop("height", "100px").prop("id", "fft");
                    jplay.ui.elements.fft.insertBefore(jplay.ui.elements.covercontainer);
                    jplay.ui.elements.fft.fft({
                        player: jplay.player.jqobj,
                        audioContext: jplay.player.audioContext,
                        source: jplay.player.mesource,
                        volume: jplay.settings.items.volume
                    });
                }
                if (jplay.player.errorTime && jplay.player.errorTime !== 0) {
                    this.currentTime = jplay.player.errorTime;
                    jplay.player.errorTime = 0;
                }
            }).on("ended", function () {
                jplay.player.next();
            }).on("timeupdate", function () {
                if (isNaN(this.currentTime) || isNaN(this.duration)) {
                    elements.time.text("--:--/--:--");
                    return;
                }
                elements.progressmeter.progressbar("option", "value", 100 * this.currentTime / this.duration);
                elements.time.text(jplay.helpfunctions.toTimeString(this.currentTime) + "/" +
					jplay.helpfunctions.toTimeString(this.duration));
            }).on("play", function () {
                elements.playpausebutton.button("option", "icons", { primary: "ui-icon-pause" }).addClass("ui-state-highlight");
            }).on("pause", function () {
                elements.playpausebutton.button("option", "icons", { primary: "ui-icon-play" }).removeClass("ui-state-highlight");
            }).on("error", function (e) {
                // jplay.helpfunctions.warning("Error code: " + e.target.error.code);
                if (e.target.error.code === 2) {
                    jplay.player.errorTime = jplay.player.domobj.currentTime;
                    jplay.player.domobj.load();
                }
            });
            jplay.player.setVolume(jplay.settings.items.volume);
        },
        init: function () {
            "use strict";
            var elements = jplay.ui.elements;
            jplay.player.createInstance();
            if (!jplay.player.audioContext && window.webkitAudioContext) {	// Only allowed to create one per page
                jplay.player.audioContext = new window.webkitAudioContext();
            }
            elements.nextbutton.click(jplay.player.next);
            elements.prevbutton.click(jplay.player.prev);
            elements.playpausebutton.click(jplay.player.toggleplay);
            elements.repeatbutton.click(jplay.playlist.togglerepeat);
            elements.shufflebutton.click(jplay.playlist.toggleshuffle);
            elements.mutebutton.click(jplay.player.togglemute);
            elements.playinfo.hover(function () {
                elements.searchlinksbutton.fadeIn(jplay.settings.items.animationspeed / 3);
            }, function () {
                elements.searchlinksbutton.fadeOut(jplay.settings.items.animationspeed / 3);
            });
            elements.searchlinksbutton.click(function () {
                elements.searchlinksmenu.css("display", "block"); //.fadeIn(jplay.settings.items.animationspeed / 3);
                elements.searchlinksmenu.position({
                    my: "left+2px top",
                    at: "right top",
                    of: elements.searchlinksbutton,
                    within: window
                });
            });
            elements.searchlinksmenu.on("menuselect", function (event, ui) {
                var item = ui.item, url, type, activeSong, safeUrl;
                safeUrl = function (url) { return url.replace(/\\w/gi, "+").replace(/&/gi, "%26"); };
                if (item.has("ul").length > 0 || $.isEmptyObject(jplay.player.activeSong)) {
                    return true;
                }
                activeSong = jplay.player.activeSong.data("attribs");
                type = item.prop("id");
                switch (type) {
                    case "search_google_instant":
                        url = "https://www.google.se/search?q=" + safeUrl(activeSong.artist) + "&btnI=1";
                        break;
                    case "search_google":
                        url = "https://www.google.se/search?q=" + safeUrl(activeSong.artist);
                        break;
                    case "search_youtube_band":
                        url = "http://www.youtube.com/results?search_query=" + safeUrl(activeSong.artist);
                        break;
                    case "search_youtube_song":
                        url = "http://www.youtube.com/results?search_query=" + safeUrl(activeSong.artist + "+" + activeSong.title.replace(/^[0-9]{1,3} -/, ""));
                        break;
                    case "search_wikipedia":
                        url = "http://en.wikipedia.com/w/index.php?search=" + safeUrl(activeSong.artist);
                        break;
                    case "search_darklyrics":
                        url = "http://www.google.se/search?q=" + safeUrl(activeSong.artist + "+" + activeSong.album) + "+site%3Awww.darklyrics.com&btnI=1";
                        break;
                }
                item.find("a").prop({
                    "href": url,
                    "target": "_blank"
                });
                return true;
            });
            elements.progressmeter.progressbar().click(function (e) {
                var player = jplay.player.domobj;
                player.currentTime = player.duration * (e.pageX - $(this).offset().left) / $(this).width();
            });
            elements.volumeslider.slider({
                value: jplay.settings.items.volume * 100,
                slide: function () {
                    jplay.player.setVolume($(this).slider("option", "value") / 100);
                    jplay.settings.update();
                },
                change: function () { // click
                    jplay.player.setVolume($(this).slider("option", "value") / 100);
                    jplay.settings.update();
                }
            });
            elements.covercontainer.cover({});
            elements.lyricsbutton.click(function () {
                if ($.isEmptyObject(jplay.player.activeSong)) { return; }
                var attribs = jplay.player.activeSong.data("attribs");
                elements.lyricsbutton.button("option", "disabled", true);
                $.get("/getLyrics", attribs, function (data) {
                    elements.lyricsbutton.button("option", "disabled", false);
                    jplay.helpfunctions.popup({
                        header: attribs.artist + ' - ' + attribs.title,
                        text: data
                    });
                });
            });
            elements.bigscreenbutton.click(function () {
                $("#bigscreencontainer").toggle();
            });
        },
        toggleplay: function () {
            "use strict";
            var playerdom = jplay.player.domobj;
            if ($.isEmptyObject(jplay.player.activeSong)) {
                jplay.player.next();
            }
            if (playerdom.paused) {
                playerdom.play();
            } else {
                playerdom.pause();
            }
        },
        next: function () {
            "use strict";
            var nextSong;
            if ($.isEmptyObject(jplay.player.activeSong)) {
                if (jplay.settings.items.shuffle) {
                    jplay.player.setActiveSong($("#playlist .songinplaylist:eq(" + (jplay.shuffle.list[jplay.shuffle.index]) + ")"));
                    jplay.shuffle.index += 1;
                } else {
                    jplay.player.setActiveSong(jplay.ui.elements.playlist.children().first(".songinplaylist"));
                }
            } else {
                if (jplay.settings.items.shuffle) {
                    nextSong = $("#playlist .songinplaylist:eq(" + (jplay.shuffle.list[jplay.shuffle.index]) + ")");
                    jplay.shuffle.index += 1;
                } else {
                    nextSong = jplay.player.activeSong.next(".songinplaylist");
                }
                if (nextSong.length === 0) {
                    if (jplay.settings.items.repeatall) {
                        if (jplay.settings.items.shuffle) {
                            jplay.shuffle.index = 0;
                            jplay.player.setActiveSong($("#playlist .songinplaylist:eq(" + jplay.shuffle.list[jplay.shuffle.index] + ")"));
                            jplay.shuffle.index += 1;
                        } else {
                            var children = jplay.ui.elements.playlist.children();
                            if (children.length > 0) {
                                jplay.player.setActiveSong(jplay.ui.elements.playlist.children().first(".songinplaylist"));
                            }
                        }
                    }
                } else {
                    jplay.player.setActiveSong(nextSong);
                }
            }
        },
        prev: function () {
            "use strict";
            if ($.isEmptyObject(jplay.player.activeSong)) {
                if (jplay.settings.items.shuffle) {
                    jplay.shuffle.index = jplay.shuffle.list.length - 1;
                    jplay.player.setActiveSong($("#playlist .songinplaylist:eq(" + (jplay.shuffle.list[jplay.shuffle.index]) + ")"));
                    jplay.shuffle.index -= 1;
                } else {
                    jplay.player.setActiveSong(jplay.ui.elements.playlist.children("li").last(".songinplaylist"));
                }
            } else {
                var prev;
                if (jplay.settings.items.shuffle) {
                    prev = $("#playlist .songinplaylist:eq(" + (jplay.shuffle.list[jplay.shuffle.index]) + ")");
                    jplay.shuffle.index -= 1;
                } else {
                    prev = jplay.player.activeSong.prev(".songinplaylist");
                }
                if (prev.length === 0) {
                    if (jplay.settings.items.repeatall) {
                        if (jplay.settings.items.shuffle) {
                            jplay.shuffle.index = jplay.shuffle.list.length - 1;
                            jplay.player.setActiveSong($("#playlist .songinplaylist:eq(" + (jplay.shuffle.list[jplay.shuffle.index]) + ")"));
                            jplay.shuffle.index -= 1;
                        } else {
                            jplay.player.setActiveSong(jplay.ui.elements.playlist.children().last(".songinplaylist"));
                        }
                    }
                } else {
                    jplay.player.setActiveSong(prev);
                }
            }
        },
        setActiveSong: function (playlistentry) {
            "use strict";
            var ple, plcontainer, data, scrollto, relpos;
            ple = $(playlistentry);
            plcontainer = jplay.ui.elements.playlistcontainer;
            data = ple.data("attribs");
            jplay.player.activeSong = playlistentry;
            $(".songinplaylist").removeClass("activesong");
            ple.addClass("activesong");
            jplay.ui.elements.playinfo.find(".title").text(data.title);
            jplay.ui.elements.playinfo.find(".artist").text(data.artist);
            document.title = data.artist + " - " + data.title;
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
            jplay.ui.elements.covercontainer.cover({ "src": "/getImage?id=" + data.dirid });
            jplay.ui.elements.bscover.css("background-image", "url('/getImage?id=" + data.dirid + "')");
            jplay.player.mesource = null;
            jplay.player.createInstance();
            jplay.player.jqobj.prop("src", "/getMusic?id=" + data.id).get(0).play();
            // FIXME: muted doesn't work after changing songs. Temporary solution:
            setTimeout(function () {
                jplay.player.togglemute();
                jplay.player.togglemute();
            }, 10);
        },
        changeVolume: function (diff) {
            "use strict";
            var player, vol;
            player = jplay.player.domobj;
            vol = (player.volume + diff) > 1 ? 1 : (player.volume + diff);
            if (vol <= 0) {
                vol = 0.00001; // 0 gives static
                if (!jplay.player.domobj.muted) {
                    jplay.player.togglemute();
                }
            } else {
                if (jplay.player.domobj.muted) {
                    jplay.player.togglemute();
                }
            }
            jplay.player.setVolume(vol);
            jplay.ui.elements.volumeslider.slider("option", "value", vol * 100);
        },
        setVolume: function (value) {
            "use strict";
            jplay.settings.items.volume = value;
            jplay.player.domobj.volume = value;

            jplay.ui.elements.volumeslider.slider.value = 100 * value;
            if (jplay.settings.items.fft && jplay.ui.elements.fft) {
                jplay.ui.elements.fft.fft({ "volume": value });
            }
        },
        togglemute: function () {
            "use strict";
            var player = jplay.player.domobj;
            player.muted = !(player.muted);
            if (player.muted) {
                jplay.ui.elements.mutebutton.button("option", "icons", { primary: "ui-icon-volume-off" }).addClass("ui-state-highlight");
                jplay.settings.update();
            } else {
                jplay.ui.elements.mutebutton.button("option", "icons", { primary: "ui-icon-volume-on" }).removeClass("ui-state-highlight");
                jplay.settings.update();
            }
        }
    },
    playlist: {
        init: function () {
            "use strict";
            $(document).on("keydown", "input:text", function (e) {
                e.stopPropagation();
            }).on("contextmenu", ".songinplaylist", function (e) {
                e.preventDefault();
                $(this).remove();
                jplay.playlist.save();
            }).on("dblclick", ".songinplaylist", function (e) {
                e.preventDefault();
                jplay.player.setActiveSong($(this));
            });
            jplay.ui.elements.playlist.sortable();
            if (jplay.settings.items.saveplaylist &&
					localStorage.getItem("playlist")) {
                jplay.playlist.items = $.parseJSON(localStorage.getItem("playlist"));
                if (jplay.playlist.items) {
                    $.each(jplay.playlist.items, function () {
                        jplay.playlist.addFile(this);
                    });
                }
            }
            $("#playlistnameinput").dialog({
                autoOpen: false,
                height: 120,
                width: 250,
                modal: false,
                resizable: false,
                title: "Save playlist as",
                buttons: {
                    "Save": function () {
                        var name = $("#playlistnameinput #name").get(0).value;
                        if (name === "") {
                            return;
                        }
                        jplay.customplaylists.saveNew($("#playlistnameinput #name").get(0).value);
                        $(this).dialog("close");
                    }
                }
            });
            $("#saveplaylistbutton").click(function () {
                $("#playlistnameinput").dialog("open");
            });
            $("#clearplaylistbutton").click(function () {
                jplay.playlist.clear();
            });
        },
        save: function () {
            "use strict";
            var songs, tmp;
            jplay.playlist.items = [];
            songs = $("#playlist li");
            $.each(songs, function () {
                tmp = $(this).data();
                jplay.playlist.items.push($(this).data("attribs"));
            });
            jplay.shuffle.update();
            localStorage.setItem("playlist", JSON.stringify(jplay.playlist.items));
        },
        clear: function () {
            "use strict";
            jplay.ui.elements.playlist.children("li").remove();
            jplay.playlist.save();
        },
        dirCounter: 0, // For addDir()
        addDir: function (dirObj, position, before, callback) {
            "use strict";
            this.dirCounter++;
            var obj = (dirObj instanceof $) ? dirObj.data() : dirObj;
            $.get("/addDir", { "id": obj.id }, $.proxy(function (results) {
                var firstnode;
                for (var i = 0, endi = results.length; i < endi; i++) {
                    var value = results[i];
                    if (!value.isdir) {
                        if (!firstnode) {
                            firstnode = jplay.playlist.addFile(value);
                        } else {
                            jplay.playlist.addFile(value);
                        }
                    } else {
                        // FIXME: Add dirs recursively on server? Pros/cons?
                        jplay.playlist.addDir(value, null, null, callback);
                    }
                    if (i === endi - 1) {
                        this.dirCounter--;
                        if (callback && this.dirCounter === 0) {
                            this.dirCounter = 0;
                            jplay.playlist.save();
                            callback(firstnode);
                        }
                    }
                }
            }, this));
        },
        addFile: function (json, position, before) {
            "use strict";
            var html, title, node, retval;
            if (!json.title) {
                json.title = json.filename;
            }
            html = "<span class='playlist_artist'>" + json.artist + "</span> " +
				"<span class='playlist_album'>- " + json.album + "</span> " +
				"<span class='playlist_title'>- " + json.title + "</span> " +
				"<span class='playlist_year'>- " + json.year + "</span>";
            title = "";
            if (json.artist) {
                title += "Artist:\t" + json.artist;
            }
            if (json.title) {
                title += "\nSong:\t" + json.title;
            }
            if (json.album) {
                title += "\nAlbum:\t" + json.album;
            }
            if (json.year) {
                title += "\nYear:\t" + json.year;
            }
            node = $("<li/>").addClass('songinplaylist').html(html).attr("title", title).
				data("attribs", json).data("playlistorder", $("#songinplaylist"));
            if (position && (position.is("ul") || position.is("li"))) {
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
        },
        togglerepeat: function () {
            "use strict";
            if (jplay.settings.items.repeatall) {
                jplay.settings.items.repeatall = false;
                jplay.settings.update();
                jplay.ui.elements.repeatbutton.removeClass("ui-state-highlight");
            } else {
                jplay.settings.items.repeatall = true;
                jplay.settings.update();
                jplay.ui.elements.repeatbutton.addClass("ui-state-highlight");
            }
        },
        toggleshuffle: function () {
            "use strict";
            if (jplay.settings.items.shuffle) {
                jplay.settings.items.shuffle = false;
                jplay.settings.update();
                jplay.ui.elements.shufflebutton.removeClass("ui-state-highlight");
            } else {
                jplay.settings.items.shuffle = true;
                jplay.settings.update();
                jplay.ui.elements.shufflebutton.addClass("ui-state-highlight");
            }
        }
    },
    searchfn: {
        init: function () {
            "use strict";
            jplay.ui.elements.searchsettings.click(function () {
                jplay.settings.update();
            });
            jplay.ui.elements.searchtext.autocomplete({
                minLength: 2,
                source: function (request, response) {
                    $.get("/search", { needle: request.term, options: jplay.settings.items.searchsettings }, function (data) {
                        response($.map(data, function (item) {
                            if (item.isdir) {
                                var label = item.dirname.split("\\");
                                label = label[label.length - 1];
                                return {
                                    label: label,
                                    value: item,
                                    isdir: true
                                };
                            } else {
                                return {
                                    label: item.artist + " - " + item.title,
                                    value: item,
                                    isdir: false
                                };
                            }
                        }));
                    });
                },
                select: function (event, ui) {
                    if (ui.item.value.isdir) {
                        /*jplay.playlist.addDir(ui.item.value, null, null, function (first) {
							
                        });*/
                        //jplay.ui.elements.searchtext.val(ui.item.label);
                    } else {
                        jplay.player.setActiveSong(jplay.playlist.addFile(ui.item.value));
                    }
                    jplay.searchfn.gotodir(ui.item.value);
                    return false;
                },
                focus: function (event, ui) {
                    if (ui.item.value.isdir) {
                        jplay.ui.elements.searchtext.val(ui.item.label);
                    } else {
                        jplay.ui.elements.searchtext.val(ui.item.value.artist + " - " + ui.item.value.title);
                    }
                    return false;
                }
            }); /*.data("autocomplete")._renderItem = function (ul, item) {
                var el = $("<li>").data("item.autocomplete", item).append("<a>" + item.label + "</a>").appendTo(ul);
                if (!item.isdir) {
                    el.css({ "background": "#EEE" });
                }
                return el;
            };*/
        },
        gotodir: function (data, callback) {
            "use strict";
            jplay.filetree.jqnode.jstree("close_all");
            $.get("/getAncestors", { id: data.id, isdir: data.isdir }, function (result) {
                var dirarray = result.split(",").sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
                if (data.isdir) {
                    dirarray = dirarray.concat(data.id.toString());
                }
                jplay.filetree.opendir(dirarray, 0, function () {
                    var el, scrollto;
                    el = data.isdir ? $("#node_" + data.id) : $("#snode_" + data.id);
                    jplay.filetree.jqnode.jstree("deselect_all");
                    jplay.filetree.jqnode.jstree("select_node", el);
                    scrollto = el.offset().top - $("#filesouter").offset().top + $("#filesouter").scrollTop();
                    $("#filesouter").animate({
                        scrollTop: scrollto
                    }, jplay.settings.items.animationspeed, callback);
                    jplay.ui.elements.searchtext.val("").blur();
                });
            });
        }
    },
    filetree: {
        jqnode: {},
        init: function () {
            "use strict";
            jplay.filetree.jqnode = $("#filescontainer");
            jplay.filetree.jqnode.jstree({
                "plugins": ["json_data", "themes", "ui", "dnd", "crrm"],
                "themes": {
                    theme: "classic"
                },
                "json_data": {
                    "ajax": {
                        "url": "/dirtree",
                        "data": function (n) {
                            return {
                                "path": n.data ? n.data("id") : ""
                            };
                        }
                    },
                    "progressive_unload": true
                },
                "dnd": {
                    "drop_target": "#playlistcontainer,#playlistheader",
                    "drop_finish": function (data) {
                        var i, endi, dropped, position, before;
                        for (i = 0, endi = data.o.length; i < endi; i++) {
                            dropped = $((data.o)[i]);
                            position = $(data.r).closest("li");
                            before = data.e.offsetY < $(data.e.target).closest("li").height() / 2;
                            if (dropped.data("isdir")) {
                                jplay.playlist.addDir(dropped, position, before);
                                jplay.playlist.save();
                            } else {
                                jplay.playlist.addFile(dropped.data(), position, before);
                                jplay.playlist.save();
                            }
                        }
                    }
                },
                "crrm": {
                    "move": {
                        "check_move": function () {
                            return false;
                        }
                    }
                },
                "ui": { "disable_selecting_children": true },
                "core": {
                    "load_open": true,
                    "animation": jplay.settings.items.animationspeed,
                    "initially_open": jplay.helpfunctions.getShowDir()
                }
            }).on("dblclick.jstree", function (e) {
                e.preventDefault();
                var node = $(e.target).closest("li");
                if (node.data().isdir) {
                    jplay.filetree.jqnode.jstree("toggle_node", node);
                } else {
                    jplay.player.setActiveSong(jplay.playlist.addFile(node.data()));
                    jplay.playlist.save();
                }
            }).on("contextmenu", function (e) {
                e.preventDefault();
                if (jplay.filetree.jqnode.jstree("get_selected").length < 2) {
                    jplay.filetree.jqnode.jstree("deselect_all");
                    jplay.filetree.jqnode.jstree("select_node", e.target, false);
                }
                if ($("#jst_contextmenu").css("display") === "block") {
                    $("#jst_contextmenu").hide();
                }
                $("#jst_contextmenu").css({
                    top: e.pageY + 'px',
                    left: e.pageX + 'px'
                }).fadeIn(jplay.settings.items.animationspeed);
            });
            $("#jst_contextmenu li").click(function (e) {
                var rel = $(e.target).attr("rel"), sel, isDir, started = false;
                sel = jplay.filetree.jqnode.jstree("get_selected");
                switch (rel) {
                    case "download":
                        jplay.filetree.downloadSongs(sel);
                        break;
                    case "link":
                        if (sel.length === 1) {
                            isDir = $(sel).data("isdir");
                            var data = $(sel).data();
                            var id = "id=" + data.id;
                            var isdir = "isdir=" + (data.isdir ? "1" : "0");
                            var arr = [id, isdir].join("&");
                            jplay.helpfunctions.popup({ text: 'http://' + window.location.host + '/#' + arr });
                        }
                        break;
                    case "add":
                        $.each(sel, function (key, val) {
                            val = $(val);
                            if (val.data().isdir) {
                                jplay.playlist.addDir(val);
                                jplay.playlist.save();
                            } else {
                                jplay.playlist.addFile(val.data());
                                jplay.playlist.save();
                            }
                        });
                        break;
                    case "addplay":
                        // Define callback outside of loop
                        var callback = function (first) {
                            if (!started) {
                                started = true;
                                jplay.player.setActiveSong(first);
                            }
                        };
                        // Use syncronous loop to be able to save after.
                        for (var i = 0; i < sel.length; i++) {
                            var val = $(sel[i]);
                            if (val.data().isdir) {
                                jplay.playlist.addDir(val, false, false, callback);
                            } else {
                                if (!started) {
                                    started = true;
                                    jplay.player.setActiveSong(jplay.playlist.addFile(val.data()));
                                } else {
                                    jplay.playlist.addFile(val.data());
                                }
                            }
                        }
                        jplay.playlist.save();
                        break;
                    default:
                        break;
                }
            });
            $(document).click(function (e) {
                $("#jst_contextmenu").fadeOut(jplay.settings.items.animationspeed);
                if (jplay.ui.elements.searchlinksbutton.has(e.target).length === 0 &&
                    (jplay.ui.elements.searchlinksmenu.has(e.target).length === 0 ||
                    $(e.target).closest("li").has("ul").length === 0)) {
                    jplay.ui.elements.searchlinksmenu.fadeOut(jplay.settings.items.animationspeed / 3);
                }
                return true;
            });
            jplay.filetree.jqnode.on("open_node.jstree", function () {
                var hashes;
                if (jplay.inited === true) {
                    return;
                }
                hashes = jplay.helpfunctions.getHashes();
                if (hashes.id) {
                    if (hashes.isdir == "1") {
                        // FIXME: open_node.jstree triggering before everything is visible
                        setTimeout(function () {
                            var el = $("#node_" + hashes.id);
                            jplay.filetree.jqnode.jstree("select_node", el);
                            jplay.playlist.addDir(el, false, false, function (firstnode) {
                                jplay.player.setActiveSong(firstnode);
                            });
                        }, 200);
                    } else {
                        $.get("/getSongInfo", { id: hashes.id, isdir: false }, function (results) {
                            if (results.length > 0) {
                                jplay.player.setActiveSong(jplay.playlist.addFile(results[0]));
                            }
                        });
                    }
                }
                jplay.inited = true;
            });
        },
        opendir: function (dirs, index, callback) {
            "use strict";
            var dirscopy = dirs.slice();
            var node = $("#node_" + dirs[index]);
            if (node.size() < 1) {
                if (index < dirscopy.length - 1) {
                    jplay.filetree.opendir(dirscopy, index + 1, callback);
                }
                if (index === dirscopy.length - 1) {
                    callback(dirs);
                }
            } else {
                jplay.filetree.jqnode.jstree("open_node", $("#node_" + dirs[index]), function () {
                    if (index < dirscopy.length - 1) {
                        jplay.filetree.opendir(dirscopy, index + 1, callback);
                    }
                    if (index === dirscopy.length - 1) {
                        callback(dirs);
                    }
                }, true);
            }
        },
        downloadSongs: function (sel) {
            "use strict";
            var data, src;
            if (sel.length === 1) {
                data = $(sel[0]).data();
                if (!data.isDir) {
                    src = "/downloadSong?id=" + data.id;
                    $("<iframe />").attr("src", src).css("display", "none").appendTo("body");
                } else {
                    jplay.helpfunctions.warning("Can only download individual songs");
                }
            } else {
                data = [];
                $.each(sel, function (key, file) {
                    data.push($(file).data());
                });
                $.post("/downloadSongs", JSON.stringify(data), function () {
                    //alert("success");
                }, "text");
                jplay.helpfunctions.warning("Can only download one at a time at the moment");
            }
        }
    },
    customplaylists: {
        saveNew: function (name) {
            "use strict";
            var customPlaylist, songs;
            customPlaylist = [];
            songs = $("#playlist li");
            $.each(songs, function () {
                customPlaylist.push($(this).data("attribs"));
            });
            localStorage.setItem("cp_" + name, JSON.stringify(customPlaylist));
            jplay.customplaylists.update();
        },
        update: function () {
            "use strict";
            var i, endi, id, data, dbleh, ctxeh;
            dbleh = function (e) {
                e.preventDefault();
                jplay.playlist.clear();
                $.each($(this).data("attribs"), function () {
                    jplay.playlist.addFile(this);
                });
                jplay.playlist.save();
            };
            ctxeh = function (e) {
                e.preventDefault();
                var key = "cp_" + $(this).text();
                $(this).remove();
                localStorage.removeItem(key);
            };
            $("#customplaylists").children("li").remove();
            for (i = 0, endi = localStorage.length; i < endi; i++) {
                id = localStorage.key(i);
                if (id.length > 2 &&
					id.substr(0, 3) === "cp_") {
                    data = $.parseJSON(localStorage.getItem(localStorage.key(i)));
                    $("<li/>").addClass("customplaylist").text(id.substr(3)).data("attribs", data).
						dblclick(dbleh).on("contextmenu", ctxeh).appendTo($("#customplaylists"));
                }
            }
        }
    },
    keybindings: {
        init: function () {
            "use strict";
            $(document).keydown(function (e) {
                switch (e.which) {
                    case 32: // Space
                        e.preventDefault();
                        jplay.player.toggleplay();
                        break;
                    case 37: // Arrow left
                        e.preventDefault();
                        jplay.player.prev();
                        break;
                    case 38: // Arrow up
                        e.preventDefault();
                        jplay.player.changeVolume(0.05);
                        break;
                    case 39: // Arrow right
                        e.preventDefault();
                        jplay.player.next();
                        break;
                    case 40: // Arrow down
                        jplay.player.changeVolume(-0.05);
                        break;
                    default:
                        break;
                }
            });
        }
    },
    shuffle: {
        list: [],
        index: 0,
        update: function () {
            "use strict";
            var i, endi, tmp, current, top;
            jplay.shuffle.list = [];
            jplay.shuffle.index = 0;
            for (i = 0, endi = $(".songinplaylist").length; i < endi; i++) {
                jplay.shuffle.list[i] = i;
            }
            top = jplay.shuffle.list.length;
            if (top) {
                while (--top) {
                    current = Math.floor(Math.random() * (top + 1));
                    tmp = jplay.shuffle.list[current];
                    jplay.shuffle.list[current] = jplay.shuffle.list[top];
                    jplay.shuffle.list[top] = tmp;
                }
            }
        }
    }
};

$(document).ready(function () {
    "use strict";
    jplay.ui.init();
    jplay.settings.init();
    jplay.player.init();
    jplay.playlist.init();
    jplay.keybindings.init();
	try {
		$("#bottomright").chat({ 
			"header": ["brheader", "Chat"],
			"url": "jooon.mooo.com:8088"
		});
	} catch (err) {}
    jplay.filetree.init();
    jplay.customplaylists.update();
    jplay.shuffle.update();
    jplay.searchfn.init();

    /*var now = new Date().getTime();
    var loadtime = now - performance.timing.navigationStart;
    console.log("test " + loadtime);*/
});