(function ($, jplay) {
    'use strict';
    var Popular = function (elem) {
        var that = this;
        this.header = elem.children(':header').first();
        this.elem = elem;
        this.savedData = [];

        this.header.text("Most popular");
        this.elem.addClass('popular');

        this.recalc();
        
        $(document).trigger('jplay.popularInited');

        $(document).on('click', '.popCover', function () {
            jplay.searchfn.gotodir($(this).data('data'));
            $(this).addClass('shadeanim');
            this.addEventListener('webkitAnimationEnd', function () { 
                $(this).removeClass('shadeanim');
            }, false);
        });

        $(window).resize(function () {
            that.recalc();
        });
    };

    Popular.prototype.dimension = function () {
        return {
            rows: (Math.round(this.elem.height() / 130) || 1),
            cols: (Math.round(this.elem.width() / 130) || 1)
        }
    };

    Popular.prototype.recalc = function () {
        var title, row, part, img, frag;
        var that = this;
        var dims = this.dimension();
        if (dims.rows * dims.cols > this.savedData.length) {
            $.get('/getPopular2', { 'count': dims.rows * dims.cols }, function (results) {
                that.redraw(dims, results);
            });
        } else {
            that.redraw(dims, this.savedData.splice(dims.rows * dims.calc));
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
                title = title[title.length - 1];
                img.setAttribute('title', title);
                img.setAttribute('style', 'background-image: url(/getImage?id=' + data[j].id + '&small=1)');
                $(img).data('data', data[j]);
                row.appendChild(img);
            };
            frag.appendChild(row);
        }
        this.elem[0].appendChild(frag);
    }

    Popular.prototype.clear = function () {
        this.elem.find('.coverRow').remove();
    };

    $(document).on('jplay.inited', function () {
        jplay.popular = new Popular($("#bottomright"));
    });
})($, jplay);
