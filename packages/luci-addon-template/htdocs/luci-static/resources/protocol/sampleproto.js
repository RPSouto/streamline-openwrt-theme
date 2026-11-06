'use strict';
'require form';
'require network';

network.registerPatternVirtual(/^sample-.+$/);

return network.registerProtocol('sampleproto', {
	getI18n: function() {
		return _('Sample Protocol (Vendor Name)');
	},

	getIfname: function() {
		return this._ubus('l3_device') || this._ubus('device') || this.sid || 'sample0';
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
		var o = s.taboption('general', form.DummyValue, '_sample_info', _('Protocol Status'));
		o.rawhtml = true;
		o.default = '<div class="alert-message notice" style="margin: 8px 0; padding: 12px 16px; border-radius: 8px;">' +
			'<strong>' + _('Sample Protocol Interface') + '</strong><br>' +
			_('This interface protocol is managed by custom vendor services or daemons.') +
			'</div>';
	}
});
