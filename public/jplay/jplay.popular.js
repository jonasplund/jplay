(function ($, jplay) {
    'use strict';
    var Popular = function (elem) {
        this.header = elem.children(':header').first();
        this.elem = elem;

        this.header.text("Most popular");
        this.elem.addClass('popular');

        $.get('/getPopular2', function (results) {
            results.map(function () {});
            var frag = document.createDocumentFragment();
            for (var i = 0, endi = results.length; i < endi; i++) {
                var img = document.createElement('img');
                img.setAttribute('src', '/getImage?id=' + results[i].id);
                $(img).addClass('popCover').data('data', results[i]);
                frag.appendChild(img);
            };
            elem[0].appendChild(frag);
        });

        $(document).on('click', '.popCover', function () {
            jplay.searchfn.gotodir($(this).data('data'));
            $(this).addClass('shadeanim');
            this.addEventListener('webkitAnimationEnd', function () { 
                $(this).removeClass('shadeanim');
            }, false);
        });
    };
    $(document).on('jplay.inited', function () {
        jplay.popular = new Popular($("#bottomright"));
    });
})($, jplay);
