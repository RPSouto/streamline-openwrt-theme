'use strict';
'require ui';
'require uci';
'require form';
'require network';

return network.registerProtocol('tethering', {
	getI18n: function() {
		return _('Tethering (GL.iNet)');
	},

	getIfname: function() {
		return this._ubus('l3_device') || this._ubus('device') || this.sid || 'usb0';
	},

	getOpkgPackage: function() {
		return 'gl-sdk4-tethering';
	},

	isFloating: function() {
		return false;
	},

	isVirtual: function() {
		return false;
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
			'<strong>' + _('GL.iNet Smartphone Tethering') + '</strong><br>' +
			_('This interface manages USB smartphone cellular tethering. Connection status is managed in the <strong>GL.iNet Admin Panel</strong> (Network &rarr; Tethering).') +
			'</div>';

		// Advanced tab
		o = s.taboption('advanced', form.Value, 'metric', _('Gateway metric'), _('Optional. Metric for default route provided by this interface.'));
		o.datatype = 'uinteger';
		o.placeholder = '0';
		o.optional = true;

		o = s.taboption('advanced', form.Flag, 'auto', _('Bring up on boot'), _('Automatically start this interface at boot time.'));
		o.default = o.enabled;
	}
});
