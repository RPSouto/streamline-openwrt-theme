include $(TOPDIR)/rules.mk

PKG_NAME:=luci-addon-template
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Streamline Team

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=9. Protocols
  TITLE:=Streamline Router Addon Template
  DEPENDS:=+luci-base
  PKGARCH:=all
endef

define Package/$(PKG_NAME)/description
  Template addon for Streamline theme router hardware profiles and custom protocols.
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/www/luci-static/resources/streamline-addons
	$(INSTALL_DIR) $(1)/www/luci-static/resources/protocol
	[ ! -d ./htdocs/luci-static/resources/streamline-addons ] || \
		$(CP) ./htdocs/luci-static/resources/streamline-addons/* $(1)/www/luci-static/resources/streamline-addons/
	[ ! -d ./htdocs/luci-static/resources/protocol ] || \
		$(CP) ./htdocs/luci-static/resources/protocol/* $(1)/www/luci-static/resources/protocol/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
