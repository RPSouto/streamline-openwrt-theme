#!/bin/sh
set -eu

BASE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUTPUT=${1:-"$BASE_DIR/luci-theme-streamline_1.0.10-1_all.ipk"}
BUILD_DIR=$(mktemp -d "${TMPDIR:-/tmp}/streamline-ipk.XXXXXX")
trap 'rm -rf "$BUILD_DIR"' EXIT HUP INT TERM

CONTROL_DIR="$BUILD_DIR/control"
DATA_DIR="$BUILD_DIR/data"
mkdir -p "$CONTROL_DIR" \
	"$DATA_DIR/www" \
	"$DATA_DIR/usr/lib/lua/luci" \
	"$DATA_DIR/usr/share/ucode/luci"

cp "$BASE_DIR/packaging/control" "$CONTROL_DIR/control"
cp "$BASE_DIR/packaging/postinst" "$CONTROL_DIR/postinst"
cp "$BASE_DIR/packaging/postrm" "$CONTROL_DIR/postrm"
chmod 0755 "$CONTROL_DIR/postinst" "$CONTROL_DIR/postrm"

cp -R "$BASE_DIR/htdocs/." "$DATA_DIR/www/"
cp -R "$BASE_DIR/luasrc/." "$DATA_DIR/usr/lib/lua/luci/"
cp -R "$BASE_DIR/ucode/." "$DATA_DIR/usr/share/ucode/luci/"
cp -R "$BASE_DIR/root/." "$DATA_DIR/"
chmod 0755 "$DATA_DIR/etc/uci-defaults/30_luci-theme-streamline"

printf '2.0\n' > "$BUILD_DIR/debian-binary"
tar --format=gnu --sort=name --owner=0 --group=0 --numeric-owner --mtime='@0' \
	-C "$CONTROL_DIR" -czf "$BUILD_DIR/control.tar.gz" .
tar --format=gnu --sort=name --owner=0 --group=0 --numeric-owner --mtime='@0' \
	-C "$DATA_DIR" -czf "$BUILD_DIR/data.tar.gz" .

rm -f "$OUTPUT"
tar --format=gnu --owner=0 --group=0 --numeric-owner --mtime='@0' \
	-C "$BUILD_DIR" -czf "$OUTPUT" \
	./debian-binary ./data.tar.gz ./control.tar.gz

if command -v node >/dev/null 2>&1; then
	node "$BASE_DIR/tools/verify-ipk.js" "$OUTPUT"
fi

echo "Criado: $OUTPUT"
