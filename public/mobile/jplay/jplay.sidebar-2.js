(function ($, jplay) {
    'use strict';

    $(document).on('click', '#sidebar a.tabcontent', function(e) {
        e.preventDefault();
        var id = $(e.target).attr('href').match(/id=([0-9]+)/)[1];
        jplay.searchfn.gotodir({ id: id, isdir: true });
    });

    var preprocessors = {
        bandInfo: function (data) {
            try {
                var $data = $('<div>').append($(data));
                $data.find('a').contents().unwrap();
                data = $data.html();
            } catch (ex) { }
            return data;
        },
        similarArtists: function (data) {
            try {
                data = $.map(data, function (item) { 
                   if (item.dirid) {
                       return '<a class="tabcontent" href="#id=' + 
                           item.dirid + '">' + decodeURI(item.item) + '</a>';
                   }
                   return decodeURI(item.item);
                }).join('<br />');
            } catch (ex) { }
            return data;
        },
        lyrics: function (data) {
            if (jplay.player.activeSong) {
                data = '<h1>' + jplay.player.activeSong.data().attribs.title.replace(/[0-9]{2,3} - /, '') + '</h1>' + data; 
            }
            return data;
        },
        video: function (data) {
            if (jplay.player.activeSong) {
                data = $('<iframe></iframe>').attr({
                    'width': '420',
                    'height': '315',
                    'src': 'http://www.youtube.com/embed/' + data,
                    'frameborder': '0',
                    'allowfullscreen': ''
                });
                return data[0].outerHTML;
            }
            return data;
        }
    };

    var options = {
        tabs: [ {
                title: 'Band Info',
                order: 1,
                name: 'bandInfo',
                preprocess: preprocessors.bandInfo,
                defaultText: 'No active song.'
            }, {
                title: 'Similar Artists',
                order: 2,
                name: 'similarArtists',
                preprocess: preprocessors.similarArtists,
                defaultText: 'No active song.'
            }, {
                title: 'Lyrics',
                order: 3,
                name: 'lyrics',
                preprocess: preprocessors.lyrics,
                defaultText: 'No active song.'
            }, {
                title: 'Video',
                order: 4,
                name: 'video',
                preprocess: preprocessors.video,
                defaultText: 'No active song.'
            }
        ],
        firstActive: 'Band Info',
        direction: 'horizontal',
        updateAllUrl: '/getSidebarInfo',
        preload: true
    };
    
    var tabs = new $.Tabs($('#sidebar'), options);
    $(document).on('jplay.newsong', function (e) {
        tabs.updateAll(e.to);
    }).on('jplay.soonnewsong', function (e) {
        tabs.preloadAll(e.next);
    });
})($, jplay);