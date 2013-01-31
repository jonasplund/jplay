(function ($, jplay) {
	'use strict';
	/*$(jplay.player).on('newsong', function (){
		console.log('newsongsidebar')
	});*/
	$(document).on('click', '#sidebar .ui-tabs-panel a.tabcontent', function(e) {
		e.preventDefault();
		var id = $(e.target).attr('href').match(/id=([0-9]+)/)[1];
		console.log(id);
		jplay.searchfn.gotodir({ id: id, isdir: true });
	});
	$('#sidebar').tabs({
		beforeLoad: function(event, ui) {
			if ($.isEmptyObject(jplay.player.activeSong)) {
				return;
			}
			ui.ajaxSettings.data = jplay.player.activeSong.data().attribs;
			ui.ajaxSettings.dataType = 'json';
			ui.ajaxSettings.dataFilter = function (data, type) {
				return $.map($.parseJSON(data), function (item) { 
					if (item.dirid) {
						return '<a class="tabcontent" href="#id=' + item.dirid + '">' + item.item + '</a>';
					}
					return item.item;
				}).join('<br />');
			}
		}
	});
})($, jplay);