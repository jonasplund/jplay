(function ($, jplay) {
    var Setting = (function() {
        function Setting(parentNode, type, label) {
            this.type = type;
            this.input = document.createElement('input');
            this.input.setAttribute('type', type);
            var labelelem = document.createElement('label');
            labelelem.innerText = label;
            parentNode.appendChild(this.input);
            parentNode.appendChild(labelelem);
        }
        Setting.prototype.getType = function () { return this.type; };
        return Setting;
    })();

    var TextSetting = (function() {
        function TextSetting(parentNode, label, placeholder, value) {
            Setting.apply(this, [parentNode, 'text', label, value]);
            this.input.setAttribute('placeholder', placeholder);
        }
        TextSetting.prototype = Object.create(Setting);
        TextSetting.prototype.getValue = function() {
            return this.input.value;
        };
        return TextSetting;
    })();

    var NumericSetting = (function () {
        function NumericSetting(parentNode, label, value) {
            Setting.apply(this, [parentNode, 'number', label, value]);
            this.input.value = value;
        }
        NumericSetting.prototype = Object.create(Setting);
        NumericSetting.prototype.getValue = function() {
            return this.input.value;
        };
        return NumericSetting;
    })();

    var CheckboxSetting = (function () {
        function CheckboxSetting(parentNode, label, value) {
            Setting.apply(this, [parentNode, 'checkbox', label]);
            if (value === 'checked') {
                this.input.setAttribute('checked');
            }
        }
        CheckboxSetting.prototype = Object.create(Setting);
        CheckboxSetting.prototype.getValue = function() {
            return this.input.getAttribute('checked');
        };
        return CheckboxSetting;
    })();
})($, jplay);