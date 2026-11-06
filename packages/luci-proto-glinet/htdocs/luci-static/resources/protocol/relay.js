'use strict';
'require form';
'require network';

network.registerPatternVirtual(/^relay-.+$/);

return network.registerProtocol('relay', {
	getI18n: function() {
		return _('Relay bridge');
	},

	getIfname: function() {
		return 'relay-%s'.format(this.sid);
	},

	getPackageName: function() {
		return 'relayd';
	},

	isFloating: function() {
		return true;
	},

	isVirtual: function() {
		return true;
	},

	containsDevice: function(ifname) {
		return (network.getIfnameOf(ifname) == this.getIfname());
	},

	renderFormOptions: function(s) {
		var o = s.taboption('general', form.DummyValue, '_relay_info', _('Relay Bridge Status'));
		o.rawhtml = true;
		o.default = '<div class="alert-message notice" style="margin: 8px 0; padding: 12px 16px; border-radius: 8px;">' +
			'<strong>' + _('Relay Bridge') + '</strong><br>' +
			_('This interface operates in relay mode managed by relayd.') +
			'</div>';
	}
});
