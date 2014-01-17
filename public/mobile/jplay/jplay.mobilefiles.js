(function ($, jplay) {
    'use strict';
    var FileList = (function () {
        function FileList (container, settings) {
            this.settings = settings;
            this.container = container;
            this.items = [];
            this.currentdir = 0;

            this.gotodir();
        }

        FileList.prototype.gotodir = function (id) {
            var self = this;
            $.get('/dirtree', { 'path': id }, function (data) {
                self.clear();
                if (id && id !== '1') {
                    var fli = new FileListParent(self, { 
                        'title': '..',
                        'dir': true
                    });
                    self.items.push(fli.appendTo(self.container));
                }
                self.currentdir = id;
                data.forEach(function(item) {
                    var fli;
                    if (item.metadata.isdir === 1) {
                        fli = new FileListDir(self, { 
                            'id': item.metadata.id, 
                            'title': item.data.title,
                            'img': item.data.icon
                        });
                    } else {
                        fli = new FileListFile(self, { 
                            'id': item.metadata.id, 
                            'title': item.data.title,
                            'img': item.data.icon,
                            'artist': item.metadata.artist,
                            'year': item.metadata.year,
                            'album': item.metadata.album
                        });
                    }
                    self.items.push(fli.appendTo(self.container));
                });
            });
            return this;
        };

        FileList.prototype.gotoparent = function () {
            var self = this;
            $.get('/getAncestors', { 'id': this.currentdir, 'isdir': true }, function (data) {
                data = data.split(',');
                var parent = data.splice(data.length - 1, 1)[0];
                self.gotodir(parent);
            });
            return this;
        };

        FileList.prototype.clear = function () {
            this.container.children().remove();
            this.items = [];
            return this;
        };

        return FileList;
    })();

    var FileListItem = (function () {
        function FileListItem (parentelement, settings) {
            this.parentelement = parentelement;
            this.id = settings.id;
            this.img = settings.img;
            this.title = settings.title;
            this.init();
        }

        FileListItem.prototype.init = function () {
            var self = this;
            this.jqobj = $('<li>').
                text(this.title).
                addClass('songinfilelist');
            if (this.img) {
                this.jqobj.prepend($('<img>').attr('src', this.img));
            }
            this.jqobj.on('click', function () { self.activate(); });
        };

        FileListItem.prototype.appendTo = function (element) {
            this.jqobj.appendTo(element);
            return this;
        };

        return FileListItem;
    })();

    var FileListFile = (function () {
        function FileListFile(parentelement, settings) {
            FileListItem.call(this, parentelement, settings);
            this.artist = settings.artist;
            this.album = settings.album;
            this.year = settings.year;
            this.id = settings.id;
        }
        FileListFile.prototype = Object.create(FileListItem.prototype);

        FileListFile.prototype.activate = function () {
            jplay.playlist.addFile({ 
                'artist': this.artist, 
                'album': this.album, 
                'title': this.title, 
                'year': this.year,
                'id': this.id
            });
            return this;
        };

        return FileListFile;
    })();

    var FileListDir = (function () {
        function FileListDir(parentelement, settings) {
            var self = this;
            FileListItem.call(this, parentelement, settings);

            this.jqobj.on('touchstart', function () { self.touchstart(); });
            this.jqobj.on('touchend', function () { self.touchend(); });
        }

        FileListDir.prototype = Object.create(FileListItem.prototype);

        FileListDir.prototype.touchstart = function () {
            this.jqobj.css({ 'background': '#000', 'color': '#FFF' });
            this.timecounter = Date.now();
            return this;
        };

        FileListDir.prototype.touchend = function () {
            if (!this.timecounter) {
                return this;
            }
            var timedown = Date.now() - this.timecounter;
            if (timedown > 500) {
                jplay.playlist.addDir({ 'id': this.id });
                this.jqobj.css({ 'background': '', 'color': '' });
            } else {
                this.parentelement.gotodir(this.id);
            }
            this.timecounter = 0;
            return this;
        };
        
        FileListDir.prototype.activate = function () {
            return this;
        };

        return FileListDir;
    })();

    var FileListParent = (function () {
        function FileListParent(parentelement, settings) {
            FileListItem.call(this, parentelement, settings);
        }

        FileListParent.prototype = Object.create(FileListItem.prototype);

        FileListParent.prototype.activate = function () {
            this.jqobj.css({ 'background': '#000', 'color': '#FFF' });
            this.parentelement.gotoparent();
            return this;
        };

        return FileListParent;
    })();

    jplay.mobFiles = new FileList($('#filescontainer'));
})($, jplay);