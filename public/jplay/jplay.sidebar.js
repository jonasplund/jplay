(function ($, jplay) {
    'use strict';
    /*$(jplay.player).on('newsong', function (){
        console.log('newsongsidebar')
    });*/
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
                return;
            }
            var data = jplay.player.activeSong.data().attribs;
            ui.ajaxSettings.url = ui.tab.find('a').attr('href').split("?")[0];
            ui.ajaxSettings.url += '?artist=' + data.artist + '&title=' + data.title + '&album=' + data.album + '&id=' + data.id;
            ui.ajaxSettings.dataType = 'json';
            ui.ajaxSettings.dataFilter = function (data, type) {
                try {
                    return $.map($.parseJSON(data), function (item) { 
                        if (item.dirid) {
                            return '<a class="tabcontent" href="#id=' + item.dirid + '">' + item.item + '</a>';
                        }
                        return item.item;
                    }).join('<br />');
                } catch (e) {
                    return data;
                }
            };
            ui.jqXHR.error(function () {
                ui.panel.html('An error occurred.');
            });
        }
    });
})($, jplay);