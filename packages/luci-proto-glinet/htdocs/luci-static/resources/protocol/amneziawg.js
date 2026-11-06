'use strict';
'require form';
'require network';

network.registerPatternVirtual(/^(awg|amneziawg)-.+$/);

return network.registerProtocol('amneziawg', {
	getI18n: function() {
		return _('Amnezia WireGuard');
	},

	getIfname: function() {
		return this._ubus('l3_device') || this._ubus('device') || this.sid || 'awg';
	},

	getPackageName: function() {
		return 'amneziawg-tools';
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
		var o = s.taboption('general', form.DummyValue, '_awg_info', _('Amnezia WireGuard Status'));
		o.rawhtml = true;
		o.default = '<div class="alert-message notice" style="margin: 8px 0; padding: 12px 16px; border-radius: 8px;">' +
			'<strong>' + _('Amnezia WireGuard') + '</strong><br>' +
			_('This interface is managed by the Amnezia WireGuard service.') +
			'</div>';
	}
});
