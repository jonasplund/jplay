(function (jplay) {
    'use strict';
    jplay.helpfunctions = {
        getShowDir: function () {
            var hashes = jplay.helpfunctions.getHashes();
            var returnval;
            if (hashes.id) {
                $.ajax({
                    url: '/getAncestors',
                    data: { id: hashes.id, isdir: hashes.isdir },
                    async: false,
                    success: function (results) {
                        results = results.split(',');
                        for (var i = 0, endi = results.length; i < endi; i++) {
                            results[i] = '#node_' + results[i];
                        }
                        returnval = results;
                    }
                });
                return returnval;
            }
        },
        getHashes: function (url) {
            var vars, hashes, i, endi, hash;
            vars = {};
            hashes = url || window.location.toString();
            if (hashes.indexOf('#') > -1) {
                hashes = hashes.substring(hashes.indexOf('#') + 1);
                hashes = hashes.split('&');
                for (i = 0, endi = hashes.length; i < endi; i++) {
                    hash = hashes[i].split('=');
                    //vars.push(hash[0]);
                    vars[hash[0]] = hash[1];
                }
            }
            return vars;
        },
        toTimeString: function (seconds) {
            var minutes, secs;
            minutes = Math.floor((seconds / 60) % 60).toString().lpad('0', 2);
            secs = Math.floor(seconds % 60).toString().lpad('0', 2);
            return minutes + ':' + secs;
        },
        showNotification: function (data) {
            var artist, title, image;
            if (!jplay.settings.items.notifications) {
                return false;
            }
            if (window.webkitNotifications.checkPermission() > 0) {
                window.webkitNotifications.requestPermission(jplay.helpfunctions.showNotification);
            } else {
                if (jplay.notification) {
                    jplay.notification.cancel();
                    jplay.notification = false;
                    clearTimeout(jplay.notificationTimer);
                }
                artist = data.artist || 'Artist unknown';
                title = data.title || 'Title unknown';
                // FIXME: Get pic from cover
                image = data.dirid ? '/getImage?id=' + data.dirid + '&small=1' : '/img/playbutton.png';
                jplay.notification = window.webkitNotifications.createNotification(image, artist, title);
                if (jplay.notification) {
                    jplay.notification.show();
                    jplay.notificationTimer = setTimeout(function () {
                        if (jplay.notification) {
                            jplay.notification.cancel();
                            jplay.notification = false;
                            jplay.notificationTimer = false;
                        }
                    }, 5000);
                    jplay.notificationTimer = true;
                }
            }
        },
        toId: function (str) {
            if (!str) {
                return '';
            }
            return 'node_' + str.replace(/[\[\]\(\)\.&,\']/g, "").replace(/ /g, "_").toLowerCase();
        },
        warning: function (str) {
            $('#warning').text(str).css('color', 'red');
            setTimeout(function () {
                $('#warning').text('').css('color', '');
            }, 5000);
        },
        popup: function (o) {
            var overlay = $('<div>').addClass('overlay'),
                popup = $('<div>').addClass('popup'),
                head = o.header ? $('<h1>').text(o.header) : $(),
                text = o.text ? $('<p>').html(o.text) : $();
            popup.append(head).append(text);
            $('body').append(overlay).append(popup);
            overlay.click(function (e) {
                e.stopPropagation();
                overlay.remove();
                popup.remove();
            });
        }
    };

    String.prototype.lpad = function (padString, length) {
        var str = this;
        while (str.length < length) {
            str = padString + str;
        }
        return str;
    };
})(jplay);