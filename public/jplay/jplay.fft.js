// FIXME: Convert to jQuery UI 1.9 (Fix destroy/create according to http://wiki.jqueryui.com/w/page/12138135/Widget%20factory)
(function ($) {
    $.widget("jplay.fft", {
        version: "0.1",
        options: {
            disabled: false,
            player: undefined,
            audioContext: undefined,
            volume: 1,
            source: undefined,
            colors: ["#A00", "#AA0", "#0A0"]
        },
        _create: function () {
            var o = this.options;
            if (!o.player || !o.audioContext || !o.source) {
                throw "Options player, source and/or audioContext not supplied";
            }
            this.ctx = o.audioContext;
            this.analyser = this.ctx.createAnalyser();
            this.fft = this.element;
            this.fftctx = this.fft.get(0).getContext("2d");
            this.source = o.source;
            this.volumeNode = this.ctx.createGainNode();
            this.volumeNode.gain.value = o.volume;
            this.source.connect(this.analyser);
            this.source.connect(this.volumeNode);
            this.volumeNode.connect(this.ctx.destination);
			//this.fft.click(this.fullscreen);
            // FIXME: Change setInterval to requestAnimationFrame
            this.ticks = window.setInterval($.proxy(this._tick, this), 50);
        },
        _setOption: function (key, val) {
            if (key === "volume") {
                this.volumeNode.gain.value = val;
            }
            $.Widget.prototype._setOption.apply(this, arguments);
        },
        destroy: function () {
            this.analyser.disconnect();
			//this.volumeNode.gain.value = this.op;
            this.volumeNode.disconnect();
            this.source.connect(this.ctx.destination);
            window.clearInterval(this.ticks);
            $.Widget.prototype.destroy.call(this);
        },
        player: function (node) {
            if (node === undefined) {
                return this.options.player;
            } else {
                this.options.player = node;
            }
        },
        _tick: function () {
            var intFreqData = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(intFreqData);
            this._draw(intFreqData, this.fftctx);
        },
        _draw: function (freqData, fftctx) {
            var num_bars = 32;
            var lingrad = this._createGradient(fftctx);
            this.fftctx.fillStyle = lingrad;
            this.fftctx.clearRect(0, 0, this.fft.width(), this.fft.height());
            var bin_size = Math.floor(freqData.length / num_bars);
            for (var i = 0; i < num_bars; i++) {
                var sum = 0;
                for (var j = 0; j < bin_size; j++) {
                    sum += freqData[(i * bin_size) + j];
                }
                var avg = sum / bin_size;
				var bar_width = this.fft.width() / num_bars;
                var scaled_average = (avg / 256) * this.fft.height();
				this.fftctx.fillRect(i * bar_width, this.fft.height(), bar_width - 1, -scaled_average);
            }
        },
        _createGradient: function (fftctx) {
            var lingrad = fftctx.createLinearGradient(0, 0, 0, 150);
            /*var colors = this.options.colors;
            var divider = colors.length - 1;
            for (var i = 0; i < colors.length; i++) {
            lingrad.addColorStop();
            }*/
            lingrad.addColorStop(0, this.options.colors[0]);
            lingrad.addColorStop(0.5, this.options.colors[1]);
            lingrad.addColorStop(1, this.options.colors[2]);
            return lingrad;
        }
    });
})($); 