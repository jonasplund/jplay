(function (jplay, $) {
    var options = {
        tabs: [ {
                title: 'Band Info',
                order: 1,
                data: 'bandInfo'
            }, {
                title: 'Similar Artists',
                order: 2,
                data: 'similarArtists'
            }, {
                title: 'Lyrics',
                order: 3,
                data: 'lyrics'
            }, {
                title: 'Similar Artists',
                order: 4,
                data: 'video'
            }
        ]
    };

    function Tabs (element, tabsSettings) {
        function Tab(settings) {
            this.tabContainer = $('<div class="tabContainer" />');
            this.tab = $('<div class="tab" />').text(settings.title);
            this.tabContent = $('<div class="tabContent" />');
            this.data = {};
            this.tabContent.append(this.tab).append(this.tabContent);
        }

        Tab.prototype.setContent = function (content) {
            this.tabContent.html(content);
        };

        tabsSettings.sort(function (a, b) { return a.order - b.order; });
        for (var i = 0; i < tabsSettings.length; i++) {
            var tab = new Tab(tabsSettings[i]);
            element.append(tab);
        }
    };

    Tabs.prototype.getTab = function (title) {
        for (var i = 0; i < this.tabs.length; i++) {
            if (this.tabs[i].title === title) {
                return this.tabs[i];
            }
        }
    };

    Tabs.prototype.updateAll = function (songInfo) {
        $.get('/sidebarInfo', songInfo, function (data) {
            
        });
    };

    Tabs.prototype.setActive = function (title) {
        for (var i = 0, endi = this.tabs.length; i < endi; i++) {
            this.tabs[i].tabContainer.css('display', 'none');
        }
        getTab(title).tabContainer.css('display', 'block');
    };

    var tabs = new Tabs($('#sidebar'), options.tabs);
}) ();