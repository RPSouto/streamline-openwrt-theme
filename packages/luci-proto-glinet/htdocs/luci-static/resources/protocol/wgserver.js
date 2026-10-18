'use strict';
'require ui';
'require uci';
'require form';
'require network';

return network.registerProtocol('wgserver', {
	getI18n: function() {
		return _('WireGuard Server (GL.iNet)');
	},

	getIfname: function() {
		return this._ubus('l3_device') || this._ubus('device') || this.sid || 'wgserver';
	},

	getOpkgPackage: function() {
		return 'gl-wg';
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
		var o;

		// General tab banner
		o = s.taboption('general', form.DummyValue, '_gl_managed', _('Managed by GL.iNet'));
		o.rawhtml = true;
		o.default = '<div class="alert-message notice" style="margin: 8px 0; padding: 12px 16px; border-radius: 8px; border-left: 4px solid var(--sl-purple, #00d6c6);">' +
			'<strong>' + _('GL.iNet WireGuard Server') + '</strong><br>' +
			_('This interface is managed by the GL.iNet VPN subsystem. Server listening port, keys, and client peer configurations are managed in the <strong>GL.iNet Admin Panel</strong> (VPN &rarr; WireGuard Server).') +
			'</div>';

		// Tunnel device name (read-only info)
		o = s.taboption('general', form.DummyValue, '_device_name', _('Tunnel Device'));
		o.cfgvalue = function(section_id) {
			return s.section || 'wgserver';
		};

		// Advanced tab
		o = s.taboption('advanced', form.Value, 'metric', _('Gateway metric'), _('Optional. Metric for routes provided by this interface.'));
		o.datatype = 'uinteger';
		o.placeholder = '0';
		o.optional = true;

		o = s.taboption('advanced', form.Value, 'mtu', _('Override MTU'), _('Optional. Maximum Transmission Unit for this interface.'));
		o.datatype = 'range(1280,1500)';
		o.placeholder = '1420';
		o.optional = true;

		o = s.taboption('advanced', form.Flag, 'auto', _('Bring up on boot'), _('Automatically start this interface at boot time.'));
		o.default = o.enabled;
	}
});
