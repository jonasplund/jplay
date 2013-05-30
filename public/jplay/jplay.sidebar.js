(function ($, jplay) {
    'use strict';
    $(document).on('jplay.newsong', function (event) {
        if (!event.from || !event.to) {
            $('#sidebar').tabs('load', $('#sidebar').tabs('option', 'active'));
            return;
        }
        switch ($('#sidebar .ui-tabs-active').text()) {
            case 'Band Info':
            case 'Similar Artists':
                if (event.from.artist !== event.to.artist) {
                    $('#sidebar').tabs('load', $('#sidebar').tabs('option', 'active'));
                }
                break;
            case 'Lyrics':
                if (event.from.artist !== event.to.artist || event.from.title !== event.to.title) {
                    $('#sidebar').tabs('load', $('#sidebar').tabs('option', 'active'));
                }
                break;
            case 'Video':
                $('#sidebar').tabs('load', $('#sidebar').tabs('option', 'active'));
            default:
                break;
        }
    });
    $(document).on('click', '#sidebar .ui-tabs-panel a.tabcontent', function(e) {
        e.preventDefault();
        var id = $(e.target).attr('href').match(/id=([0-9]+)/)[1];
        jplay.searchfn.gotodir({ id: id, isdir: true });
    });
    $('#sidebar').tabs({
        beforeLoad: function(event, ui) {
            var ajaxSettings = ui.ajaxSettings, data;
            ui.panel.html('Loading...');
            if ($.isEmptyObject(jplay.player.activeSong)) {
                ui.panel.html('No active song.');
                event.stopPropagation();
                event.preventDefault();
                return;
            }
            data = jplay.player.activeSong.data().attribs;
            ajaxSettings.url = ui.tab.find('a').attr('href').split("?")[0] + '?id=' + data.id;
            ajaxSettings.dataFilter = function (data) {
                var $data;
                switch (ui.tab.text()) {
                    case 'Band Info':
                        try {
                            $data = $('<div>').append($(data));
                            $data.find('a').contents().unwrap();
                            data = $data.html();
                        } catch (ex) { }
                        break;
                    case 'Similar Artists':
                        try {
                            data = $.map($.parseJSON(data), function (item) { 
                                if (item.dirid) {
                                    return '<a class="tabcontent" href="#id=' + 
                                        item.dirid + '">' + decodeURI(item.item) + '</a>';
                                }
                                return decodeURI(item.item);
                            }).join('<br />');
                        } catch (ex) { }
                        break;
                    case 'Lyrics':
                        if (jplay.player.activeSong) {
                            data = '<h1>' + jplay.player.activeSong.data().attribs.title.replace(/[0-9]{2,3} - /, '') + '</h1>' + data; 
                        }
                        break;
                    case 'Video':
                        if (jplay.player.activeSong) {
                            data = $('<iframe>').attr({
                                'width': '420',
                                'height': '315',
                                'src': 'http://www.youtube.com/embed/' + data,
                                'frameborder': '0',
                                'allowfullscreen': ''
                            });
                            return data[0].outerHTML;
                        }
                        break;
                    default:
                        break;
                }
                return data;
            };
            ui.jqXHR.error(function (err) {
                ui.panel.html('An error occurred: ' + err);
            });
        }
    });
})($, jplay);