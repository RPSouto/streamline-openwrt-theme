#!/bin/sh
set -eu

BASE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$BASE_DIR/packages/luci-proto-glinet/build-ipk.sh" "$@"
