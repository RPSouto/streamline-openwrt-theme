#!/bin/sh
set -eu

SOURCE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if [ "$(id -u)" != 0 ]; then
	echo "Execute como root no router." >&2
	exit 1
fi

[ -d /www/luci-static ] || {
	echo "LuCI não foi encontrado em /www/luci-static." >&2
	exit 1
}

install_tree() {
	src=$1
	dst=$2
	[ -d "$src" ] || return 0
	mkdir -p "$dst"
	cp -R "$src"/. "$dst"/
}

install_tree "$SOURCE_DIR/htdocs/luci-static/streamline" /www/luci-static/streamline
install_tree "$SOURCE_DIR/htdocs/luci-static/resources" /www/luci-static/resources
install_tree "$SOURCE_DIR/luasrc/view/themes/streamline" /usr/lib/lua/luci/view/themes/streamline
install_tree "$SOURCE_DIR/ucode/template/themes/streamline" /usr/share/ucode/luci/template/themes/streamline
cp "$SOURCE_DIR/htdocs/streamline-sw.js" /www/streamline-sw.js
cp "$SOURCE_DIR/htdocs/streamline-offline.html" /www/streamline-offline.html

uci set luci.themes.Streamline='/luci-static/streamline'
uci set luci.main.mediaurlbase='/luci-static/streamline'
uci commit luci

rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/uhttpd restart

	echo "Streamline instalado e ativado. Abra novamente o LuCI."
