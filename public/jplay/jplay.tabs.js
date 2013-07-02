(function (jplay, $) {
    'use strict';

    var preprocessors = {
        bandInfo: function (data) {
           return data;
        },
        similarArtists: function (data) {
           return data;
        },
        lyrics: function (data) {
           return data;
        },
        video: function (data) {
           return data;
        }
    };

    var options = {
        tabs: [ {
                title: 'Band Info',
                order: 1,
                data: 'bandInfo',
                preprocess: preprocessors.bandInfo
            }, {
                title: 'Similar Artists',
                order: 2,
                data: 'similarArtists',
                preprocess: preprocessors.similarArtists
            }, {
                title: 'Lyrics',
                order: 3,
                data: 'lyrics',
                preprocess: preprocessors.lyrics
            }, {
                title: 'Video',
                order: 4,
                data: 'video',
                preprocess: preprocessors.video
            }
        ],
        firstActive: 'Band Info',
        direction: 'vertical',
        updateAllUrl: '/getSidebarInfo',
        preload: true
    };

    function Tab (tabs, settings) {
        var that = this;
        var contentId = settings.contentId || settings.data + 'TabContent';
        var tabId = settings.tabId || settings.data + 'Tab';
        this.tabs = tabs;
        this.tab = $('<div class="jp-tab" />').text(settings.title).attr('id', tabId).click(function () { that.activate(); });
        this.title = settings.title;
        this.tabContent = $('<div class="jp-tabContent" />').attr('id', contentId).text(settings.title);
        this.settings = settings;
        this.tabs.tabsContainer.append(this.tab);
        this.tabs.tabsContentContainer.append(this.tabContent);
    }

    Tab.prototype.setContent = function (content) {
        this.tabContent.html(content);
    };

    Tab.prototype.preprocessData = function (data) {
       return this.preprocess ? this.preprocess.call(this, data) : '';
    };

    Tab.prototype.hide = function () {
        this.tabContent.addClass('jp-hiddenTabContent').removeClass('jp-visibleTabContent');
        this.tab.addClass('jp-inactiveTab').removeClass('jp-activeTab');
    };

    Tab.prototype.show = function () {
        this.tabContent.addClass('jp-visibleTabContent').removeClass('jp-hiddenTabContent');
        this.tab.addClass('jp-activeTab').removeClass('jp-inactiveTab');
    };

    Tab.prototype.activate = function () {
        this.tabs.setActive(this);
    };

    Tab.prototype.update = function () {
        // TODO: Implement
    }

    function Tabs (element, tabsSettings) {
        this.element = element.addClass('jp-tabsOuterContainer');
        this.vertical = tabsSettings.direction === 'vertical';
        this.tabsContainer = $('<div class="jp-tabsContainer' + (this.vertical ? ' vertical' : '') + '">').appendTo(element);
        this.tabsContentContainer = $('<div class="jp-tabsContentContainer">').appendTo(element);
        this.settings = tabsSettings;
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
        if (this.preloaded) {
            // TODO: Fetch preloaded data
        } else {
            $.get(this.settings.updateAllUrl, songInfo, function (data) {
                for (var i = 0, endi = that.tabObjects.length; i < endi; i++) {
                    var currTab = that.tabObjects[i];
                    for (var j = 0, endj = data.length; j < endj; j++) {
                        if (currTab.data === data[j].name) {
                            currTab.setContent(currTab.preprocessData(data[j].data));
                        }
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
    };

    Tabs.prototype.show = function () {
        this.element.removeClass('hidden');
    };

    Tabs.prototype.preload = function (data) {
        var that = this;
        if (!this.settings.preload) {
            return;
        }
        $.get(this.settings.updateAllUrl, songInfo, function (data) {
            // TODO: Implement sidebarInfo on serverside
            this.preloadedData = data; 
        });
    }

    Tabs.prototype.resize = function () {
        if (this.vertical) {
            var width = 0;
            $.each(this.tabObjects, function () { width += this.tab.outerWidth(); });
            this.tabsContainer.width(width + 'px');
        }
    }

    var tabs = new Tabs($('#sidebar'), options);
    $(document).on('jplay.newsong', function (e) {
        tabs.updateAll(e.to);
    });
}) (jplay, $);