# Streamline for LuCI

Streamline is a dark, responsive theme for the OpenWrt LuCI web interface. Its visual language is inspired by the Stremio Server dashboard: compact navigation, understated cards, purple accents, clear status colors, and high information density. It does not include Stremio code or branding.

## Highlights

- Collapsible sidebar and expandable navigation sections, with their state saved in the browser.
- Responsive layouts for desktop, tablet, and mobile devices.
- Improved forms, tables, action buttons, interface cards, firewall zones, and package manager controls.
- Full-width viewers with independent scrolling for system logs, kernel logs, and command output.
- Login screen displaying the router hostname.
- Clean login footer with OpenWrt attribution.
- Home shortcut that closes open navigation sections and returns to the LuCI overview.
- Persistent Router Health gauges that render immediately and fill in as data arrives.
- Six switchable color palettes—Streamline, GL.iNet, Ocean, Forest, Sunset, and Rose—saved in the browser.
- Four interface font options—System, Arial, Georgia, and Monospace—with a browser-local preference.
- Optional Progressive Web App installation.

## Compatibility

- OpenWrt 21.02, 22.03, 23.05, 24.10, 25.12, and current LuCI releases.
- Legacy Lua (`.htm`) and modern ucode (`.ut`) templates in the same package.
- `opkg`/IPK, `apk`, and direct SSH installation.
- Architecture-independent package (`all`): HTML, CSS, JavaScript, and SVG only.
- GL.iNet Flint 2 (GL-MT6000). Streamline changes only the LuCI interface opened from **System → Advanced Settings**. It does not replace the main GL.iNet administration panel.

## Install the IPK

Copy the package to the router and install it with `opkg`:

```sh
scp releases/luci-theme-streamline_1.0.41-1_all.ipk root@192.168.8.1:/tmp/
ssh root@192.168.8.1 'opkg install --force-reinstall /tmp/luci-theme-streamline_1.0.41-1_all.ipk'
```

### Complementary Package: `luci-proto-glinet`

To fix **"Unsupported protocol type"** in LuCI for GL.iNet's custom VPN protocols (`wgclient`, `wgserver`, `ovpnclient`, `ovpnserver`, `tethering`):

```sh
scp luci-proto-glinet_1.0.0-1_all.ipk root@192.168.8.1:/tmp/
ssh root@192.168.8.1 'opkg install /tmp/luci-proto-glinet_1.0.0-1_all.ipk'
```

Keep the SSH session open during the first test. Open LuCI again and perform a hard refresh (`Ctrl+F5`) if the previous theme is still cached.

## Direct installation from the source tree

Copy the complete project directory to the router:

```sh
scp -r luci-theme-streamline root@192.168.8.1:/tmp/
ssh root@192.168.8.1 'sh /tmp/luci-theme-streamline/install.sh'
```

On a Flint 2, open **System → Advanced Settings → Go to LuCI** from the GL.iNet panel.

To uninstall a direct installation:

```sh
ssh root@192.168.8.1 'sh /tmp/luci-theme-streamline/uninstall.sh'
```

## Recovery

Recovery always selects Bootstrap, the default OpenWrt LuCI theme. It does not depend on Argon or any other third-party theme.

If LuCI fails to load after installation, run:

```sh
uci set luci.main.mediaurlbase='/luci-static/bootstrap'
uci commit luci
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/uhttpd restart
```

Then reload LuCI. Argon and other themes remain optional personal choices and are not part of the Streamline recovery path.

## Progressive Web App

Streamline includes a web app manifest and service worker. Open LuCI over HTTPS and choose **Install app** in Chrome or Edge, or **Add to Home screen** on Android.

The service worker caches only static theme assets and the offline information page. LuCI navigation, authentication, RPC/ubus requests, and configuration pages are never cached. When the router is unavailable, the PWA only explains how to reconnect to the local network or VPN.

If LuCI does not provide HTTPS yet, install the SSL variant appropriate for the firmware (`luci-ssl` on typical OpenWrt installations) and open the router's HTTPS address. A self-signed certificate must be accepted on the device before the browser can offer PWA installation.

## Color palettes

Open **Appearance** at the bottom of the desktop sidebar or near the top of the mobile navigation drawer. Choose **Streamline** for purple and graphite, **GL.iNet** for navy and turquoise, **Ocean** for cool blue and deep sea, **Forest** for fresh green and pine, **Sunset** for warm orange and ember accents, or **Rose** for soft pink and plum. Choose a font in the same dialog: System, Arial, Georgia, or Monospace. Both preferences are stored locally in the browser and applied before the interface is drawn.

## Build an IPK

On Linux, or another environment with POSIX shell tools and GNU `tar`, run:

```sh
sh build-ipk.sh
```

The generated package is `luci-theme-streamline_1.0.28-1_all.ipk`. The outer package is a gzip-compressed GNU tar archive in the OpenWrt format and contains `debian-binary`, `control.tar.gz`, and `data.tar.gz`.

Validate the resulting package before uploading it:

```sh
node tools/verify-ipk.js luci-theme-streamline_1.0.28-1_all.ipk
```

## Build with the OpenWrt SDK or buildroot

Copy this directory to `feeds/luci/themes/luci-theme-streamline` in the buildroot for the target OpenWrt release, then run:

```sh
./scripts/feeds update luci
./scripts/feeds install luci-theme-streamline
make package/luci-theme-streamline/compile V=s
```

The buildroot determines the output format: `opkg`-based releases produce an `.ipk`, while `apk`-based releases produce an `.apk`.

## Development

The main colors and dimensions are CSS custom properties at the beginning of `htdocs/luci-static/streamline/cascade.css`. When changing PWA assets, increment `CACHE` in `htdocs/streamline-sw.js` so browsers discard the previous static cache.

## License

Apache-2.0. The LuCI integration follows the public APIs and reference templates of the LuCI project, which is also licensed under Apache-2.0.
