(function ($) {
    'use strict';
    $.widget('jplay.cover', {
        version: '0.4.0',
        options: {
            animationspeed: 300,    // Animation duration in ms
            zindex: 1000,           // zIndex while expanded/animating
            border: 20,             // Distance from screen edge while expanded
            src: '',                // Image source
            rotation: 25,           // Rotation during expansion in degrees
            easing: 'swing',        // jQuery easing function
            distanceMultiplier: 1,  // Perspective multiplier in expansion animation
            fullscreen: false,      // Fullscreen during expanded cover
            showFormer: false       // Show former album cover of former song (not working yet)
        },
        expanded: false,
        _create: function () {
            var height = this.element.height(),
                that = this;
            this.rotation = 0;
            this.stage = $('<div />').appendTo(this.element).addClass('coverwheelstage').css('height', height + 'px');
            this.container = $('<div />').appendTo(this.stage).addClass('coverwheel state0').css('height', height + 'px');
            this.imgarr = [5];
            for (var i = 0; i < 5; i++) {
                this.imgarr[i] = $('<img />').appendTo(this.container).prop('src', '');
            }
            this.stage.click(function (e) { that._toggleExpanded(e); });
            $(document).on('jplay.newsong', function (e) {
                that._rotate(e);
            });
        },
        _rotate: function (e) {
            var that = this;
            this.container.addClass('roll');
            that._reloadImages(e);
            this.container.on('webkitAnimationEnd', function () { 
                that.container.removeClass(function (index, css) {
                    return (css.match (/\bstate\S+/g) || []).join(' ');
                }).addClass('state' + (++that.rotation % 5));
                that.container.removeClass('roll').off('webkitAnimationEnd');
            });
        },
        _reloadImages: function (e) {
            var src;
            if (e.from) { 
                src = this.imgarr[(this.rotation + 2) % 5].attr('src');
                if (src !== '/getImage?id=' + e.from.dirid) {
                    this.imgarr[(this.rotation + 2) % 5].attr('src', '/getImage?id=' + e.from.dirid + '&small=1');
                }
            }
            if (e.to) { 
                src = this.imgarr[(this.rotation + 3) % 5].attr('src');
                if (src !== '/getImage?id=' + e.to.dirid) {
                    this.imgarr[(this.rotation + 3) % 5].attr('src', '/getImage?id=' + e.to.dirid + '&small=1');
                }
            }
            if (e.next) { 
                src = this.imgarr[(this.rotation + 4) % 5].attr('src');
                if (src !== '/getImage?id=' + e.next.dirid) {
                    this.imgarr[(this.rotation + 4) % 5].attr('src', '/getImage?id=' + e.next.dirid + '&small=1');
                }
            }
        },
        _setOption: function (key, val) {
            this._super(key, val);
        },
        _destroy: function () { },
        _toggleExpanded: function (e) {
            var clickBalance,
                that = this,
                container = this.container,
                $etarget,
                offset;
            if (e) {
                $etarget = $(e.target);
                // Browser normalization
                e.offsetX = e.offsetX || e.pageX - $etarget.offset().left;
                e.offsetY = e.offsetY || e.pageY - $etarget.offset().top;
                // Position of click in a [-1, 1] square grid
                clickBalance = {
                    x: (2 * e.offsetX - $etarget.width()) / $etarget.width(),
                    y: ($etarget.height() - 2 * e.offsetY) / $etarget.height()
                };
            } else {
                clickBalance = { x: 0, y: 0 };
            }
            offset = container.offset();
            that.offset = that.offset || offset;
            if (!this.expanded) {
                this._toggleFullscreen(container, function () {
                    /*container.css({
                        left: offset.left + 'px',
                        top: offset.top + 'px',
                        position: 'absolute',
                        zIndex: that.options.zindex
                    });*/
                    var activeImg = that.imgarr[(that.rotation + 2) % 5];
                    that.tmpImg = $('<img />').attr('src', activeImg.attr('src').replace(/&small=1/, ''));
                    that.tmpImg.css({
                        position: 'absolute',
                        top: activeImg.offset().top + 'px',
                        left: activeImg.offset().left + 'px',
                        width: activeImg.width() + 'px',
                        height: activeImg.height() + 'px',
                        zIndex: that.options.zindex
                    }).appendTo('body').click(function (e) { that._toggleExpanded(e); }).load(function () {
                        that.stage.css('visibility', 'hidden');
                        that.tmpImg.animate(that._positionExpanded(that.tmpImg), {
                            duration: that.options.animationspeed,
                            complete: function () {
                                that.expanded = true;
                            },
                            easing: that.options.easing,
                            step: function (now, fx) {
                                that._step(now, fx, clickBalance);
                            }
                        });
                    });
                });
            } else {
                this._toggleFullscreen(null, function () {
                    that.stage.css('visibility', 'visible');
                    var offset, animateTo;
                    offset = that.element.offset();
                    animateTo = {
                        width: ((100 / that.tmpImg[0].naturalHeight) * that.tmpImg[0].naturalWidth),
                        height: that.element.height(),
                        top: offset.top,
                        left: offset.left
                    };
                    that.tmpImg.animate(animateTo, {
                        duration: that.options.animationspeed,
                        complete: function () {
                            that.expanded = false;
                            that.tmpImg.remove();
                            that.tmpImg = null;
                            //container.removeAttr('style').css({ display: 'block', height: that.element.height() + 'px' });
                        },
                        easing: that.options.easing,
                        step: function (now, fx) {
                            that._step(now, fx, clickBalance);
                        }
                    });
                });
            }
        },
        _step: function (now, fx, clickBalance) {
            var transformVal = {},
                progress = 0,
                valueOpac = 0,
                valTransStr = '',
                modifier = 0;
            if (fx.prop === 'height') {
                progress = (fx.now - fx.start) / (fx.end - fx.start);
                if (progress <= 0.5) {
                    // Click far on X axis = high rotation on Y axis
                    transformVal.x = clickBalance.y * 2 * this.options.rotation * progress;
                    transformVal.y = clickBalance.x * 2 * this.options.rotation * progress;
                    valueOpac = 1 - progress;
                } else {
                    transformVal.x = clickBalance.y * 2 * this.options.rotation * (1 - progress);
                    transformVal.y = clickBalance.x * 2 * this.options.rotation * (1 - progress);
                    valueOpac = progress;
                }
                // 768 px high picture looks decent with 500 px perspective
                modifier = (500 / 768) * this.options.distanceMultiplier * this._positionExpanded(this.tmpImg).height;
                valTransStr = 'perspective(' + modifier + 'px) rotateY(' + transformVal.y + 'deg) rotateX(' + transformVal.x + 'deg)';
                this.tmpImg.css({
                    '-webkit-transform': valTransStr,
                    '-moz-transform': valTransStr,
                    transform: valTransStr,
                    opacity: valueOpac
                });
            }
        },
        _positionExpanded: function (img) {
            var maxSize, natSize, scale, imgSize, pos;
            maxSize = {
                width: $(window).width() - this.options.border,
                height: $(window).height() - this.options.border
            };
            natSize = {
                width: img[0].naturalWidth,
                height: img[0].naturalHeight
            };
            scale = natSize.width / maxSize.width > natSize.height / maxSize.height ?
                    maxSize.width / natSize.width : maxSize.height / natSize.height;
            imgSize = {
                width: scale * natSize.width,
                height: scale * natSize.height
            };
            pos = {
                left: ($(window).width() - imgSize.width) / 2,
                top: ($(window).height() - imgSize.height) / 2
            };
            return {
                width: imgSize.width,
                height: imgSize.height,
                top: pos.top,
                left: pos.left,
                position: 'absolute',
                zIndex: this.options.zindex
            };
        },
        _toggleFullscreen: function (element, callback) {
            if (!this.options.fullscreen) {
                callback();
                return;
            }
            var isFS;
            if (document.hasOwnProperty('fullscreenElement')) {
                isFS = document.fullScreenElement !== null;
            } else if (document.hasOwnProperty('webkitFullscreenElement')) {
                isFS = document.webkitFullscreenElement !== null;
            } else if (document.hasOwnProperty('mozFullScreenElement')) {
                isFS = document.mozFullScreenElement !== null;
            } else {
                callback();
                return;
            }
            if (!isFS) {
                if (element && element.length > 0) {
                    element = element[0];
                    element.reqFS = element.requestFullscreen ||
                        element.webkitRequestFullscreen ||
                        element.mozRequestFullscreen ||
                        $.noop;
                    $(document).on('webkitfullscreenchange', function () {
                        $(document).off('webkitfullscreenchange');
                        callback();
                    });
                    element.reqFS();
                } else { callback(); }
            } else {
                document.exitFS = document.exitFullscreen ||
                    document.webkitCancelFullScreen ||
                    document.mozCancelFullscreen ||
                    $.noop;
                $(document).on('webkitfullscreenchange', function () {
                    $(document).off('webkitfullscreenchange');
                    callback();
                });
                document.exitFS();
            }
        }
    });
} (jQuery)); 