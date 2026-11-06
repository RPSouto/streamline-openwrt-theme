'use strict';
'require form';
'require network';

network.registerPatternVirtual(/^wwan.+$/);

return network.registerProtocol('wwan', {
	getI18n: function() {
		return _('Wireless WAN');
	},

	getIfname: function() {
		return this._ubus('l3_device') || this._ubus('device') || this.sid || 'wwan';
	},

	isFloating: function() {
		return true;
	},

	isVirtual: function() {
		return true;
	},

	getDevices: function() {
		return null;
	},

	containsDevice: function(ifname) {
		return (network.getIfnameOf(ifname) == this.getIfname());
	},

	renderFormOptions: function(s) {
		var o = s.taboption('general', form.DummyValue, '_wwan_info', _('Wireless WAN Status'));
		o.rawhtml = true;
		o.default = '<div class="alert-message notice" style="margin: 8px 0; padding: 12px 16px; border-radius: 8px;">' +
			'<strong>' + _('Wireless WAN / Repeater') + '</strong><br>' +
			_('This interface operates as a wireless client (repeater/tethering).') +
			'</div>';
	}
});
