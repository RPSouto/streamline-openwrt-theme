'use strict';
'require rpc';
'require form';
'require network';

var callFileList = rpc.declare({
	object: 'file',
	method: 'list',
	params: [ 'path' ],
	expect: { entries: [] },
	filter: function(list, params) {
		var rv = [];
		for (var i = 0; i < list.length; i++)
			if (list[i].name.match(/^(ttyUSB|ttyACM|cdc-wdm)/))
				rv.push(params.path + list[i].name);
		return rv.sort();
	}
});

network.registerPatternVirtual(/^3g-.+$/);

return network.registerProtocol('3g', {
	getI18n: function() {
		return _('3G / UMTS / GPRS');
	},

	getIfname: function() {
		return this._ubus('l3_device') || '3g-%s'.format(this.sid);
	},

	getPackageName: function() {
		return 'comgt';
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

		o = s.taboption('general', form.Value, '_modem_device', _('Modem device'));
		o.ucioption = 'device';
		o.rmempty = false;
		o.load = function(section_id) {
			return callFileList('/dev/').then(L.bind(function(devices) {
				for (var i = 0; i < devices.length; i++)
					this.value(devices[i]);
				return form.Value.prototype.load.apply(this, [section_id]);
			}, this));
		};

		o = s.taboption('general', form.ListValue, 'service', _('Service Type'));
		o.value('umts', _('UMTS/GPRS'));
		o.value('cdma', _('CDMA'));
		o.value('evdo', _('EV-DO'));
		o.default = 'umts';

		o = s.taboption('general', form.Value, 'apn', _('APN'));
		o.placeholder = 'internet';

		o = s.taboption('general', form.Value, 'pincode', _('PIN'));
		o.datatype = 'and(uinteger,minlength(4),maxlength(8))';

		o = s.taboption('general', form.Value, 'username', _('PAP/CHAP username'));
		o = s.taboption('general', form.Value, 'password', _('PAP/CHAP password'));
		o.password = true;
	}
});
