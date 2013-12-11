(function ($, jplay) {
    'use strict';
    var FileList = (function () {
        function FileList (container, settings) {
            var self = this;
            this.settings = settings;
            this.container = container;
            this.items = [];
            this.currentdir = 0;

            //this.gotodir();
            $.get('/dirtree', function (data) {
                $('<li>').text('..').appendTo(self.container);
                data.forEach(function(item) {
                    var flf = new FileListItem(self, { 'id': item.data.id, 'title': item.data.title });
                    self.items.push(flf);
                });
            });
        }

        FileList.prototype.gotodir = function (id) {
            var self = this;
            $.get('/dirtree', { 'path': id }, function (data) {
                self.clear();
                $('<li>').text('..').appendTo(self.container);
                data.forEach(function(item) {
                    var flf = new FileListItem(self, item);
                    self.items.push(flf);
                });
            });            
        };

        FileList.prototype.clear = function () {
            this.container.children().remove();
            this.items = [];
        }

        return FileList;
    })();

    var FileListItem = (function () {
        function FileListItem (parent, settings) {
            var item = settings.data;
            var self = this;
            this.parent = parent;
            console.log(settings);
            this.id = settings.id;
            this.text = settings.title;
            this.jqobj = $('<li>').text(this.text).addClass('songinfilelist').appendTo(parent.container);

            this.jqobj.on('touchstart', function () {
                self.parent.gotodir(self.id);
            });
        };

        return FileListItem;
    }) ();

    jplay.mobFiles = new FileList($('#filescontainer'));
})($, jplay);