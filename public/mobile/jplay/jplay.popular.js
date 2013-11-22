(function ($, jplay) {
    'use strict';
    var Popular = function (elem) {
        var that = this;
        this.header = elem.children(':header').first();
        this.elem = elem;
        this.savedData = [];
        this.currentDims = {};
        this.mouseUpped = true;
        this.playingTemp = false;
        this.tmpPlayer;

        this.header.text("Most popular");
        this.elem.addClass('popular');

        this.recalc();
        
        $(document).trigger('jplay.popularInited');

        $(document).on('click', '.popCover', function () {
            if (that.playingTemp) return;
            jplay.searchfn.gotodir($(this).data('data'));
            $(this).addClass('shadeanim');
            this.addEventListener('webkitAnimationEnd', function () { 
                $(this).removeClass('shadeanim');
            }, false);
        });

        $(document).on('mousedown', '.popCover', function () {
            that.mouseUpped = false;
            setTimeout(function (popCover) {
                if (!that.mouseUpped) {
                    if (jplay.player.domobj) {
                        jplay.player.domobj.pause();
                    }
                    that.playingTemp = true;
                    $.get('getRandom', { id: $(popCover).data('data').id }, function (data) {
                        that.tmpPlayer = $('<audio></audio>').prop('src', '/getMusic?id=' + data[0].id).appendTo($('body'));
                        that.tmpPlayer.get(0).volume = jplay.player.domobj ? jplay.player.domobj.volume : 1;
                        that.tmpPlayer.on('loadedmetadata', function (e) {
                            this.play();
                            this.currentTime = this.duration / 3;
                        });
                    });
                }
            }, 1000, this);
        });

        $(document).on('mouseup', function (e) {
            that.mouseUpped = true;
            if (that.playingTemp) {
                that.tmpPlayer.remove();
                that.playingTemp = false;
                if (jplay.player.domobj) {
                    jplay.player.domobj.play();
                }
            }
        });

        $(window).resize(function () { that.recalc(); });

        $(document).on('jplay.displaychange', function () { that.recalc(); });
    };

    Popular.prototype.dimension = function () {
        var dims = {
            rows: (Math.round(this.elem.height() / 130) || 1),
            cols: (Math.round(this.elem.width() / 130) || 1)
        };
        return dims;
    };

    Popular.prototype.recalc = function () {
        var title, row, part, img, frag;
        var that = this;
        var dims = this.dimension();
        if (dims.rows === this.currentDims.rows && dims.cols === this.currentDims.cols) {
            return;
        }
        this.currentDims = dims;
        if (dims.rows * dims.cols > this.savedData.length) {
            $.get('/getPopular2', { 'count': dims.rows * dims.cols }, function (results) {
                that.redraw(dims, results);
                that.savedData = results;
            });
        } else {
            that.redraw(dims, this.savedData.splice(0, dims.rows * dims.cols));
        }
    };

    Popular.prototype.redraw = function (dims, data) {
        this.clear();
        var frag = document.createDocumentFragment();
        for (var i = 0; i < dims.rows; i++) {
            var row = document.createElement('div');
            row.classList.add('coverRow');
            var part = Math.floor(data.length / dims.rows);
            for (var j = i * part, endj = i * part + part; j < endj; j++) {
                var img = document.createElement('div');
                img.classList.add('popCover');
                var title = data[j].dirname.split('\\');
                title = title[title.length - 1] + '\n' + data[j].cnt_album_id + ' songs have been played from this album in the last week.';
                img.setAttribute('title', title);
                img.setAttribute('style', 'background-image: url(/getImage?id=' + data[j].id + '&small=1)');
                $(img).data('data', data[j]);
                row.appendChild(img);
            }
            frag.appendChild(row);
        }
        this.elem[0].appendChild(frag);
    };

    Popular.prototype.clear = function () {
        this.elem.find('.coverRow').remove();
    };

    $(document).on('jplay.inited', function () {
        jplay.popular = new Popular($("#bottomright"));
    });
})($, jplay);
