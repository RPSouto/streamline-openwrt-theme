'use strict';
'require form';
'require network';

network.registerPatternVirtual(/^ovpnclient.+$/);

return network.registerProtocol('ovpnclient', {
	getI18n: function() {
		return _('OpenVPN Client (GL.iNet)');
	},

	getIfname: function() {
		return this._ubus('l3_device') || this._ubus('device') || this.sid || 'ovpnclient';
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
		var o = s.taboption('general', form.DummyValue, '_gl_managed', _('Managed by GL.iNet'));
		o.rawhtml = true;
		o.default = '<div class="alert-message notice" style="margin: 8px 0; padding: 12px 16px; border-radius: 8px;">' +
			'<strong>' + _('OpenVPN Client (GL.iNet)') + '</strong><br>' +
			_('This interface is managed by the GL.iNet VPN subsystem.') +
			'</div>';
	}
});
