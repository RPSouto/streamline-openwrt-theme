#!/bin/sh
set -eu

if [ "$(id -u)" != 0 ]; then
	echo "Execute como root no router." >&2
	exit 1
fi

CURRENT=$(uci -q get luci.main.mediaurlbase || true)
[ "$CURRENT" = '/luci-static/streamline' ] && uci set luci.main.mediaurlbase='/luci-static/bootstrap'
uci -q delete luci.themes.Streamline || true
uci commit luci

rm -rf \
	/www/luci-static/streamline \
	/usr/lib/lua/luci/view/themes/streamline \
	/usr/share/ucode/luci/template/themes/streamline
rm -f \
	/www/streamline-sw.js \
	/www/streamline-offline.html \
	/www/luci-static/resources/menu-streamline.js \
	/www/luci-static/resources/menu-streamline-v17.js \
	/www/luci-static/resources/view/streamline/sysauth.js
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/uhttpd restart

echo "Streamline removido; Bootstrap foi restaurado."
