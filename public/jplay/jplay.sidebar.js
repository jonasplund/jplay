(function ($, jplay) {
    'use strict';
    $(document).on('jplay.newsong', function (event) {
        switch ($('#sidebar .ui-tabs-active').text()) {
            case 'Band Info':
            case 'Similar Artists':
                if (!event.from || !event.to || event.from.artist !== event.to.artist) {
                    $('#sidebar').tabs('load', $('#sidebar').tabs('option', 'active'));
                }
                break;
            case 'Lyrics':
                if (!event.from || 
                    !event.to || 
                    event.from.artist !== event.to.artist || 
                    event.from.title !== event.to.title) {
                    $('#sidebar').tabs('load', $('#sidebar').tabs('option', 'active'));
                }
                break;
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
            ui.panel.html('Loading...');
            if ($.isEmptyObject(jplay.player.activeSong)) {
                ui.panel.html('No active song.');
                event.stopPropagation();
                event.preventDefault();
                return;
            }
            var data = jplay.player.activeSong.data().attribs;
            ui.ajaxSettings.url = ui.tab.find('a').attr('href').split("?")[0];
            ui.ajaxSettings.url += '?artist=' + data.artist + '&title=' + data.title + '&album=' + data.album + '&id=' + data.id;
            ui.ajaxSettings.dataType = 'json';
            ui.ajaxSettings.dataFilter = function (data) {
                switch (ui.tab.text()) {
                    case 'Band Info':
                        try {
                            var $data = $('<div>').append($(data));
                            $data.find('a').contents().unwrap();
                            data = $data.html();
                        } catch (e) { }
                        break;
                    case 'Similar Artists':
                        try {
                            data = $.map($.parseJSON(data), function (item) { 
                                if (item.dirid) {
                                    return '<a class="tabcontent" href="#id=' + item.dirid + '">' + decodeURI(item.item) + '</a>';
                                }
                                return decodeURI(item.item);
                            }).join('<br />');
                        } catch (ex) { }
                        break;
                    default:
                        break;
                }
                return data;
            };
            ui.jqXHR.error(function () {
                ui.panel.html('An error occurred.');
            });
        }
    });
})($, jplay);