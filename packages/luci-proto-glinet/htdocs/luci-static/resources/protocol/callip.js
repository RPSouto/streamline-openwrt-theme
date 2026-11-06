'use strict';
'require form';
'require network';

network.registerPatternVirtual(/^callip-.+$/);

return network.registerProtocol('callip', {
	getI18n: function() {
		return _('Cellular IP (CallIP)');
	},

	getIfname: function() {
		return this._ubus('l3_device') || this._ubus('device') || this.sid || 'callip';
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
		var o = s.taboption('general', form.DummyValue, '_callip_info', _('Cellular IP Status'));
		o.rawhtml = true;
		o.default = '<div class="alert-message notice" style="margin: 8px 0; padding: 12px 16px; border-radius: 8px;">' +
			'<strong>' + _('Cellular IP Modem') + '</strong><br>' +
			_('This interface operates in Cellular IP mode managed by the modem daemon.') +
			'</div>';
	}
});
