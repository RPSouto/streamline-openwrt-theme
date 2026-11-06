#!/bin/sh
set -eu

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PACKAGES_DIR="$REPO_ROOT/packages"

echo "=== Compilar Addons Streamline ==="

mkdir -p "$REPO_ROOT/releases"

if [ -d "$PACKAGES_DIR" ]; then
	for pkg_dir in "$PACKAGES_DIR"/*; do
		if [ -d "$pkg_dir" ] && [ -f "$pkg_dir/build-ipk.sh" ]; then
			pkg_name=$(basename "$pkg_dir")
			echo "A compilar pacote addon: $pkg_name ..."
			chmod 0755 "$pkg_dir/build-ipk.sh"
			(cd "$pkg_dir" && ./build-ipk.sh)
		fi
	done
fi

echo "=== Todos os addons foram compilados com sucesso! ==="
