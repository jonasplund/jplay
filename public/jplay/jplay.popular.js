(function ($, jplay) {
    'use strict';
    var Popular = function (elem) {
        this.header = elem.children(':header').first();
        this.elem = elem;

        this.header.text("Most popular");
        this.elem.addClass('popular');

        $.get('/getPopular2', function (results) {
            var title, row, half, img, frag;
            frag = document.createDocumentFragment();
            for (var i = 0; i < 2; i++) {
                row = document.createElement('div');
                row.classList.add('coverRow');
                half = Math.floor(results.length / 2);
                for (var j = i * half, endj = i * half + half; j < endj; j++) {
                    img = document.createElement('img');
                    img.setAttribute('src', '/getImage?id=' + results[j].id);
                    title = results[j].dirname.split('\\');
                    title = title[title.length - 1];
                    img.setAttribute('title', title);
                    $(img).addClass('popCover').data('data', results[j]);
                    row.appendChild(img);
                };
                frag.appendChild(row);
            }
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
