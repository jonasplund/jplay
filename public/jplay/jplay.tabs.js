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
        var setlistitems = Array.prototype.slice.call(document.querySelectorAll('.setlistitem'));
        var setlistids = setlistitems.map(function (data) {
            return jplay.helpfunctions.getHashes(data.getAttribute('href')).id;
        });
        setlistids = [].concat(setlistids);
        jplay.playlist.addFile(setlistids, undefined, undefined, function () {
            jplay.playlist.save();
        });
    }).on('jplay.newsong', function (e) {
        tabs.updateAll(e.to, e.next);
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
                    return '<span class="unavailable">' + decodeURI(item.item) + '</span>';
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
            this.tabContent.find('button').button({ 
                label: this.tabContent.find('.unavailable').length ? 'Add available to playlist' : 'Add all to playlist' 
            });
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
        preload: true,
        winMinWidth: 1000 // Minimum window width for tabs to be visible. 0 = always enabled.
    };

    var Tab = (function () { 
        function Tab (tabs, settings) {
            var self = this;
            var contentId = settings.contentId || settings.name + 'TabContent';
            var tabId = settings.tabId || settings.name + 'Tab';
            this.tabs = tabs;
            this.tab = $('<div class="jp-tab" />').text(settings.title).attr('id', tabId).click(function () { self.activate(); });
            this.title = settings.title;
            this.name = settings.name;
            this.tabContent = $('<div class="jp-tabContent" />').attr('id', contentId).text(settings.defaultText);
            this.nextData = null;
            this.preprocess = settings.preprocess;
            this.postprocess = settings.postprocess;
            this.settings = settings;
            this.disabled = false;
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

        Tab.prototype.disable = function () {
            this.disabled = true;
            this.tab.addClass('jp-disabledTab');
            if (this.tabs.activeTab === this) {
                this.tabs.activateFirstEnabled();
            }
            return this;
        };

        Tab.prototype.enable = function () {
            this.disabled = false;
            this.tab.removeClass('jp-disabledTab');
            return this;
        };

        Tab.prototype.setNextData = function (data) {
            this.nextData = data;
        };

        return Tab;
    })();

    var Tabs = (function () {
        function Tabs (element, tabsSettings) {
            var self = this;
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
            tabsSettings.tabs.forEach(function (item) {
                var tab = new Tab(this, item);
                this.tabObjects.push(tab);
                this.element.append(tab);
            }, this);
            this.tabsContainer.append('<div style="clear:left;">');
            if (tabsSettings.firstActive) {
                this.setActive(tabsSettings.firstActive);
            }
            this.resize();
            this.inited = false;
            var inner = function () {
                $(document).trigger('jplay.displaychange');
            };
            this.element.on('transitionend transitionEnd msTransitionEnd webkitTransitionEnd', inner);
            this.checkWidth();
            $(window).resize(function () { self.checkWidth(); });
        }

        Tabs.prototype.checkWidth = function () {
            if (this.settings.winMinWidth &&
                $(window).width() < this.settings.winMinWidth) {
                this.hide();
            }
        };

        Tabs.prototype.getTab = function (o) {
            o = o.title || o;
            return this.tabObjects.filter(function (item) { return item.title === o; })[0];
        };

        Tabs.prototype.updateAll = function (songInfo, nextInfo) {
            var self = this;
            var checkDisabled = function () {
                // Callback. Close Tabs if none is enabled.
                if (!self.tabObjects.filter(function (item) { return !item.disabled; }).length) {
                    self.hide();
                }
            };

            this.tabObjects.forEach(function (item) {
                item.content('<div class="ajaxloader" />');
            }); 

            if (this.preload.enabled) {
                if (this.preload.hasData && songInfo.id === this.preload.id) {
                    this.tabObjects.forEach(function (item) {
                        if (item.nextData) {
                            item.content(item.preprocess(item.nextData));
                            item.enable().postprocessContent();
                            item.nextData = null;
                        } else {
                            item.content('No information found.').disable();
                        }
                        item.postprocessContent();
                        item.nextData = null;
                    });
                    self.preload.hasData = false;
                    checkDisabled();
                    $.get(this.settings.updateAllUrl, nextInfo).then(function (results) {
                        self.preload.hasData = true;
                        self.preload.id = nextInfo.id;
                        self.tabObjects.forEach(function (item, index) {
                            if (results[item.name]) {
                                item.nextData = results[item.name];
                            }
                        });
                    });
                } else {
                    $.get(this.settings.updateAllUrl, songInfo).then(function (results) {
                        self.tabObjects.forEach(function (item, index) {
                            var pData = item.preprocessData(results[item.name]);
                            if (pData) {
                                item.content(pData).enable();
                                item.postprocessContent();
                            } else {
                                item.content('No information found.').disable();
                            }
                        });
                        checkDisabled();
                    });
                    $.get(this.settings.updateAllUrl, nextInfo).then(function (results) {
                        self.preload.hasData = true;
                        self.preload.id = nextInfo.id;
                        self.tabObjects.forEach(function (item, index) {
                            if (results[item.name]) {
                                item.nextData = results[item.name];
                            }
                        });
                    });
                }
            } else {
                $.get(this.settings.updateAllUrl, songInfo).then(function (results) {
                    self.tabObjects.forEach(function (item, index) {
                        var pData = item.preprocessData(results[item.name]);
                        if (pData) {
                            item.content(pData).enable();
                            item.postprocessContent();
                        } else {
                            item.content('No information found.').disable();
                        }
                    });
                    checkDisabled();
                });
            }
            return this;
        };

        Tabs.prototype.setActive = function (title) {
            title = title.title || title;
            var activeTab = this.getTab(title);
            if (activeTab.disabled === true) {
                return this;
            }
            this.tabObjects.forEach(function (tab) { tab.hide(); });
            if (this.activeTab && (title === this.activeTab.title)) {
                this.hide();
                this.activeTab = false;
                return this;
            }
            this.show();
            activeTab.show();
            this.activeTab = activeTab;
            return this;
        };

        Tabs.prototype.hide = function () {
            this.element.addClass('hidden');
            if (!this.vertical) {
                this.element.addClass('vertical');
                this.resize(true);
            }
            this.activeTab.hide();
            return this;
        };

        Tabs.prototype.show = function () {
            this.element.removeClass('hidden');
            if (!this.vertical) {
                this.element.removeClass('vertical');
                this.resize(true);
            }
            return this;
        };

        Tabs.prototype.resize = function (forceV) {
            if (this.vertical || forceV) {
                var width = 0;
                this.tabObjects.forEach(function (item) { width += item.tab.outerWidth(); });
                this.tabsContainer.width(width + 'px');
                this.tabsContainerOuter.css('width', $(window).height());
            }
            return this;
        };

        Tabs.prototype.activateFirstEnabled = function () {
            var done = false;
            this.tabObjects.forEach(function (item) {
                if (!done &&
                    !item.disabled) {
                    item.activate();
                    done = true;
                }
            });
            return this;
        };

        return Tabs;
    }) ();

    var tabs = new Tabs($('#sidebar'), options);
}) (jplay, $);