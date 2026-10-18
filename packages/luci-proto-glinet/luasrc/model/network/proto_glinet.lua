-- Copyright 2026 Streamline contributors
-- Licensed under Apache-2.0

local netmod = luci.model.network

local protos = {
	wgclient = "WireGuard Client (GL.iNet)",
	wgserver = "WireGuard Server (GL.iNet)",
	ovpnclient = "OpenVPN Client (GL.iNet)",
	ovpnserver = "OpenVPN Server (GL.iNet)",
	tethering = "Tethering (GL.iNet)"
}

for proto_name, proto_title in pairs(protos) do
	local p = netmod:register_protocol(proto_name)
	if p then
		function p.get_i18n(self)
			return luci.i18n.translate(proto_title)
		end
		function p.is_virtual(self)
			return true
		end
		function p.is_floating(self)
			return true
		end
		function p.get_interface(self)
			return self:ubus("l3_device") or self:ubus("device") or self.sid
		end
	end
end
