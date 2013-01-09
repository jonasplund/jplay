(function ($) {
    'use strict';
    $.widget('jplay.cover', {
        version: '0.3.2',
        options: {
            animationspeed: 300,    // Animation duration in ms
            zindex: 1000,           // zIndex while expanded/animating
            border: 20,             // Distance from screen edge while expanded
            src: '',                // Image source
            rotation: 25,           // Rotation during expansion in degrees
            easing: 'swing',        // jQuery easing function
            distanceMultiplier: 1,  // Perspective multiplier in expansion animation
            fullscreen: true       // Fullscreen during expanded cover
        },
        expanded: false,
        _create: function () {
            var height = this.element.height(),
                that = this;
            this.container = $('<div></div>').appendTo(this.element).css('height', height + 'px');
            this.img = $('<img></img>').appendTo(this.container).prop('src', this.options.src).css('display', 'none');
            this.img.load(function () {
                that.img.css({ display: 'block', height: '100%' });
            }).error(function () {
                that.img.css('display', 'none');
            }).click(function (e) { that._toggleExpanded(e); });
        },
        _setOption: function (key, val) {
            var that = this, img = this.img, src = img.prop('src');
            switch (key) {
                case "src":
                    if (src) {
                        if (val !== src) {
                            img.prop('src', val).load(function () {
                                if (that.expanded === true) {
                                    that.container.css(that._positionExpanded(img));
                                }
                            });
                        }
                    } else {
                        this.img.prop('src', val);
                    }
                    break;
                default:
                    break;
            }
            this._super(key, val);
        },
        _destroy: function () { },
        _toggleExpanded: function (e) {
            var animateTo, clickBalance, that = this, container,
                $etarget, reqFS, exitFS, offset;
            container = this.container;
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
                    container.css({
                        left: offset.left + 'px',
                        top: offset.top + 'px',
                        position: 'absolute',
                        zIndex: that.options.zindex
                    });
                    container.animate(that._positionExpanded(that.img), {
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
            } else {
                this._toggleFullscreen(null, function () {
                    var offset, animateTo;
                    offset = that.element.offset();
                    animateTo = {
                        width: ((100 / that.img[0].naturalHeight) * that.img[0].naturalWidth),
                        height: that.element.height(),
                        top: offset.top,
                        left: offset.left
                    };
                    container.animate(animateTo, {
                        duration: that.options.animationspeed,
                        complete: function () {
                            that.expanded = false;
                            container.removeAttr('style').css({ display: 'block', height: that.element.height() + 'px' });
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
                modifier = (500 / 768) * this.options.distanceMultiplier * this._positionExpanded(this.img).height;
                valTransStr = 'perspective(' + modifier + 'px) rotateY(' + transformVal.y + 'deg) rotateX(' + transformVal.x + 'deg)';
                this.container.css({
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
                isFS = document.fullScreenElement != null;
            } else if (document.hasOwnProperty('webkitFullscreenElement')) {
                isFS = document.webkitFullscreenElement != null;
            } else if (document.hasOwnProperty('mozFullScreenElement')) {
                isFS = document.mozFullScreenElement != null;
            } else {
                callback();
                return;
            }
            if (!isFS) {
                if (element.length > 0) {
                    element = element[0];
                    element.reqFS = element.requestFullscreen ||
                        element.webkitRequestFullscreen ||
                        element.mozRequestFullscreen ||
                        $.noop;
                    $(document).on("webkitfullscreenchange", function () {
                        $(document).off("webkitfullscreenchange");
                        callback();
                    });
                    element.reqFS();
                } else callback();
            } else {
                document.exitFS = document.exitFullscreen ||
                    document.webkitCancelFullScreen ||
                    document.mozCancelFullscreen ||
                    $.noop;
                $(document).on("webkitfullscreenchange", function () {
                    $(document).off("webkitfullscreenchange");
                    callback();
                });
                document.exitFS();
            }
        }
    });
} (jQuery)); 