(function (jplay, $) {
    'use strict';

    $(document).on('click', '#sidebar a.tabcontent', function (e) {
        e.preventDefault();
        var id = $(this).attr('href').match(/id=([0-9]+)/)[1];
        jplay.searchfn.gotodir({ id: id, isdir: true });
    }).on('click', '#sidebar a.setlistitem', function (e) {
        e.preventDefault();
        var id = $(this).attr('href').match(/id=([0-9]+)/)[1];
        jplay.searchfn.gotodir({ id: id, isdir: true });
    }).on('click', '#sidebar .addsetlistbutton', function () {
        var setlistitems = $('.setlistitem');
        for (var i = 0, endi = setlistitems.length; i < endi; i++) {
            var id = jplay.helpfunctions.getHashes($(setlistitems[i]).attr('href')).id;
            jplay.playlist.addFile({ 'id': id });
        }
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
                var pics = true;
                data = $.map(data, function (item) { 
                    if (item.dirid) {
                        return '<a class="tabcontent" href="#id=' + item.dirid + '"><img src="/getImage?id=' + 
                            item.dirid + '&small=1" height="100px" title="' + decodeURI(item.item) + '" /></a>';
                    }
                    if (pics === true) {
                        pics = false;
                        return '<div class="clear">' + decodeURI(item.item) + ('<br />');
                    } else {
                        return decodeURI(item.item) + ('<br />');
                    }
                }).join('');
            } catch (ex) { }
            return data;
        },
        lyrics: function (data) {
            if (jplay.player.activeSong) {
                var dataAttribs = jplay.player.activeSong.data().attribs;
                if (dataAttribs.title) {
                    data = '<h1>' + dataAttribs.title.replace(/[0-9]{2,3} - /, '') + '</h1>' + data;
                } else {
                    data = '<h1>' + dataAttribs.filename.replace(/[0-9]{2,3}\s+-\s+/, '') + '</h1>' + data;
                }
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
        },
        setlist: function (data) {
            try {
                data = $.map(data, function (item) { 
                    if (item.id) {
                        return '<a class="setlistitem" href="#dirid=' + item.dirid + '&id=' + item.id + '">' + decodeURI(item.item) + '</a>';
                    }
                    return decodeURI(item.item);
                }).join('<br />');
                if (data.length > 0) {
                    data = data.concat('<br />' + $('<button>').addClass('addsetlistbutton').prop('outerHTML'));
                }
            } catch (ex) { }
            return data;
        }
    };

    var postprocessors = {
        setlist: function () {
            this.tabContent.find('button').button({ label: 'Add all to playlist' });
        }
    }

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
            }, {
                title: 'Setlist',
                order: 5,
                name: 'setlist',
                preprocess: preprocessors.setlist,
                postprocess: postprocessors.setlist,
                defaultText: 'No active song.'
            }
        ],
        firstActive: 'Band Info',
        direction: 'vertical',
        updateAllUrl: '/getSidebarInfo',
        preload: true
    };

    function Tab (tabs, settings) {
        var that = this;
        var contentId = settings.contentId || settings.name + 'TabContent';
        var tabId = settings.tabId || settings.name + 'Tab';
        this.tabs = tabs;
        this.tab = $('<div class="jp-tab" />').text(settings.title).attr('id', tabId).click(function () { that.activate(); });
        this.title = settings.title;
        this.name = settings.name;
        this.tabContent = $('<div class="jp-tabContent" />').attr('id', contentId).text(settings.defaultText);
        this.preprocess = settings.preprocess;
        this.postprocess = settings.postprocess;
        this.settings = settings;
        this.tabs.tabsContainer.append(this.tab);
        this.tabs.tabsContentContainer.append(this.tabContent);
    }

    Tab.prototype.content = function (content) {
        if (content) {
            this.tabContent.html(content);
            return this;
        } else {
            return this.tabContent.html();
        }
    };

    Tab.prototype.preprocessData = function (data) {
        return this.preprocess ? this.preprocess.call(this, data) : '';
    };

    Tab.prototype.postprocessContent = function () {
        if (this.postprocess) {
            this.postprocess.call(this);
        }
        return this;
    };

    Tab.prototype.hide = function () {
        this.tabContent.addClass('jp-hiddenTabContent').removeClass('jp-visibleTabContent');
        this.tab.addClass('jp-inactiveTab').removeClass('jp-activeTab');
        return this;
    };

    Tab.prototype.show = function () {
        this.tabContent.addClass('jp-visibleTabContent').removeClass('jp-hiddenTabContent');
        this.tab.addClass('jp-activeTab').removeClass('jp-inactiveTab');
        return this;
    };

    Tab.prototype.activate = function () {
        this.tabs.setActive(this);
        return this;
    };

    Tab.prototype.update = function () {
        // TODO: Implement
    };

    function Tabs (element, tabsSettings) {
        var that = this;
        this.vertical = tabsSettings.direction === 'vertical';
        this.element = element.addClass('jp-tabsOuterContainer').addClass(this.vertical ? 'vertical' : 'horizontal');
        this.tabsContainerOuter = $('<div class="jp-tabsContainerOuter"></div>').appendTo(element);
        this.tabsContainer = $('<div class="jp-tabsContainer">').appendTo(this.tabsContainerOuter);
        this.tabsContainerOuter.append($('<div style="clear:both"></div>'));
        this.tabsContentContainer = $('<div class="jp-tabsContentContainer">').appendTo(element);
        this.settings = tabsSettings;
        this.preload = {
            enabled: tabsSettings.preload,
            hasData: false,
            data: {},
            id: -1
        };
        tabsSettings.tabs.sort(function (a, b) { return a.order - b.order; });
        this.tabObjects = [];
        for (var i = 0; i < tabsSettings.tabs.length; i++) {
            var tab = new Tab(this, tabsSettings.tabs[i]);
            this.tabObjects.push(tab);
            this.element.append(tab);
        }
        this.tabsContainer.append('<div style="clear:left;">');
        if (tabsSettings.firstActive) {
            this.setActive(tabsSettings.firstActive);
        }
        this.resize();
        this.inited = false;
        this.element.on('webkitTransitionEnd', function () {
            if (that.inited) {
                $(document).trigger('jplay.displaychange');
            } else {
                that.inited = true;
            }
        });
    }

    Tabs.prototype.getTab = function (o) {
        o = o.title || o;
        for (var i = 0; i < this.tabObjects.length; i++) {
            if (this.tabObjects[i].title === o) {
                return this.tabObjects[i];
            }
        }
    };

    Tabs.prototype.updateAll = function (songInfo) {
        var that = this;
        if (this.activeTab && this.activeTab.tabContent) {
            this.activeTab.content('<div class="ajaxloader" />');
        }
        if (this.preload.enabled && this.preload.hasData && songInfo.id === this.preload.id) {
            for (var i = 0, endi = that.tabObjects.length; i < endi; i++) {
                var currTab = that.tabObjects[i];
                if (this.preload.data[currTab.name]) {
                    currTab.content(currTab.preprocessData(this.preload.data[currTab.name]));
                    currTab.postprocessContent();
                } else {
                    currTab.content('No information found.');
                }
            }
            this.preload.hasData = false;
        } else {
            $.get(this.settings.updateAllUrl, songInfo, function (data) {
                for (var i = 0, endi = that.tabObjects.length; i < endi; i++) {
                    var currTab = that.tabObjects[i];
                    if (data[currTab.name]) {
                        currTab.content(currTab.preprocessData(data[currTab.name]));
                        currTab.postprocessContent();
                    } else {
                        currTab.content('No information found.');
                    }
                }
            });
        }
    };

    Tabs.prototype.setActive = function (title) {
        title = title.title || title;
        for (var i = 0, endi = this.tabObjects.length; i < endi; i++) {
            this.tabObjects[i].hide();
        }
        if (this.activeTab && (title === this.activeTab.title)) {
            this.hide();
            this.activeTab = false;
            return;
        }
        this.show();
        var activeTab = this.getTab(title);
        activeTab.show();
        this.activeTab = activeTab;
    };

    Tabs.prototype.hide = function () {
        this.element.addClass('hidden');
        if (!this.vertical) {
            this.element.addClass('vertical');
            this.resize(true);
        }
    };

    Tabs.prototype.show = function () {
        this.element.removeClass('hidden');
        if (!this.vertical) {
            this.element.removeClass('vertical');
            this.resize(true);
        }
    };

    Tabs.prototype.preloadAll = function (songInfo) {
        var that = this;
        if (!this.preload.enabled) {
            return;
        }
        $.get(this.settings.updateAllUrl, songInfo, function (data) {
            that.preload.data = data;
            that.preload.hasData = true;
            that.preload.id = songInfo.id;
        });
    };

    Tabs.prototype.resize = function (forceV) {
        var that = this;
        if (this.vertical || forceV) {
            var width = 0;
            $.each(this.tabObjects, function () { width += this.tab.outerWidth(); });
            this.tabsContainer.width(width + 'px');
            this.tabsContainerOuter.css('width', $(window).height());
        }
    };

    var tabs = new Tabs($('#sidebar'), options);
    $(document).on('jplay.newsong', function (e) {
        tabs.updateAll(e.to);
    }).on('jplay.soonnewsong', function (e) {
        tabs.preloadAll(e.next);
    });
}) (jplay, $);