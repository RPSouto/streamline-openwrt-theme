# SPDX-License-Identifier: Apache-2.0

include $(TOPDIR)/rules.mk

LUCI_TITLE:=Streamline Theme
LUCI_DEPENDS:=+luci-base
PKG_VERSION:=1.0.28
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Streamline contributors

define Package/luci-theme-streamline/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	uci -q delete luci.themes.Streamline
	[ "$$(uci -q get luci.main.mediaurlbase)" = "/luci-static/streamline" ] && \
		uci set luci.main.mediaurlbase='/luci-static/bootstrap'
	uci commit luci
	rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
}
endef

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature
