# Streamline for LuCI

[![Release](https://img.shields.io/badge/release-v1.0.58--1-8b5cf6.svg)](https://github.com/RPSouto/streamline-openwrt-theme/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![OpenWrt](https://img.shields.io/badge/OpenWrt-21.02%20%7C%2022.03%20%7C%2023.05%20%7C%2024.10%20%7C%2025.12-25aee8.svg)](https://openwrt.org)

**Streamline** is a modern, high-density dark theme for the OpenWrt LuCI web interface. Its visual language features deep slate backgrounds, understated frosted cards, purple/cyan neon accents, crisp typography, and high information density.

---

## ✨ Highlights

* **Physical Ethernet Port Map (`Status → Overview`)**: Real-time visual RJ45 port status map directly on the homepage. Automatically discovers WAN and LAN switch ports via `/etc/board.json` and network topology. Displays active connection state, glowing multi-speed LED indicators (2.5 Gbps cyan neon, 1 Gbps emerald green, 100 Mbps amber), duplex modes, and live download/upload throughput counters with zero-shift background polling.
* **Dynamic OpenWrt Distribution & Version Badge**: Prominently displays the detected OpenWrt release (e.g. `OPENWRT 21`, `OPENWRT 23`, `IMMORTALWRT 23`) directly below the brand title in both the desktop sidebar and mobile navigation drawer.
* **Minimalist Right-Aligned Footer**: Clean footer displaying strictly `Streamline · <Distro> <Version>` (e.g., `Streamline · OpenWrt 21.02`), stripping verbose snapshot tags and git commit hashes.
* **Enhanced Mobile Table Scrolling & Touch Swipe**: Smooth horizontal touch swipe and drag scrolling across overview tables, DHCP leases, firewall rules, and associated stations tables without cell clipping.
* **Click-to-Copy for IP & MAC Addresses**: Click directly on any IPv4, IPv6, or MAC address across overview tables, status dashboards, wireless clients, DHCP leases, and routing tables to instantly copy it to your clipboard. Features a subtle hover affordance and sleek frosted glass toast notifications (smartly excludes forms, input fields, buttons, and modal dialogs, with HTTP fallback support).
* **Quick Search / Command Palette (`Ctrl + K` / `Cmd + K`)**: Instantly jump to any LuCI menu, page, or service with keyboard navigation and fuzzy search.
* **Harmonized Firewall Zone Badges (`Network → Firewall`)**: Dynamic color normalization and dark glassmorphic styling for all firewall zone badges (`lan`, `wan`, and user-defined zones). Eliminates harsh pastel blocks and black text with sleek dark-tinted surfaces, neon glowing borders, and crisp high-contrast white typography.
* **Normalized Realtime Graphs (`Status → Realtime Graphs`)**: Full dark-theme integration for Bandwidth, CPU Load, Wireless, and Connections SVG charts. Replaces legacy white boxes and harsh primary colors with theme-calibrated neon traces (cyan, purple, emerald, rose), technical dashed gridlines, and card-styled metrics tables.
* **Revamped Wireless Overview (`Network → Wireless`)**:
  * **Collapsible Radio Groups**: Expand and collapse physical radios and virtual SSIDs with smooth animated chevron toggles. Radios are closed by default for a clean overview.
  * **Interactive Network Counter**: Circular numeric pill badge showing the exact number of active virtual interfaces per radio.
  * **Auto-Fit Grid & Styled Chips**: Symmetrical auto-fit radio cards, styled SSID pills, and standardized Wi-Fi mode formatting (e.g., `802.11 b/g/n/ax`).
  * **Flicker-Free Polling**: Background statistics polling (`iwinfo` / assoclist every 5s) reconciles synchronously in microtasks, eliminating UI flashing and jitter.
  * **Parent-Child Visual Hierarchy**: Virtual interfaces are indented with a tree branch indicator (`↳`) under their parent physical controller.
* **Status Card Modernization & Dark Channel Analysis**: Sleek device badges, baseline card alignment across upstream interfaces, and dark theme styling for Channel Analysis charts.
* **Persistent Router Health Card**: Live CPU load, memory utilization, and flash storage meters rendered as unified full-width cards matching the system overview table.
* **Clean Modern Frosted Login Screen**: Distraction-free dark canvas with subtle glowing ambient aura matching the active palette, router hostname display, and floating frosted glass credential card.
* **Collapsible Sidebar & Navigation**: Auto-saving collapsible sidebar on desktop, closed accordion panels by default upon login, and a clean sliding drawer for mobile and tablet screens.
* **Full-Width Terminal Viewers**: Independent scrolling and monospaced typography for System Logs, Kernel Logs, and command output.
* **Normalized Actions & Spacing**: Standardized button heights, responsive action toolbars, and dedicated card separation across Firewall tables, DHCP leases, and network interfaces.
* **Eight Color Palettes**: Switch effortlessly between **GL.iNet** (navy/turquoise — default), **Streamline** (purple/cyan), **Ocean** (blue/sea green), **Forest** (emerald/pine), **Sunset** (amber/orange), **Rose** (plum/pink), **OLED Black** (pure AMOLED #000000), and **Light** (clean daytime slate).
* **Four Interface Fonts**: System, Arial, Georgia, or Monospace with instant browser-local persistence.
* **Progressive Web App (PWA)**: Installable on desktop (Chrome, Edge) and Android home screens with static asset caching.

---

## 💻 Compatibility

* **OpenWrt Releases**: 21.02, 22.03, 23.05, 24.10, 25.12, and current snapshot releases.
* **Template Engines**: Dual support for legacy Lua (`.htm`) and modern ucode (`.ut`) engines in the same package.
* **Package Formats**: `opkg` (`.ipk`), `apk` (OpenWrt 25+), and direct SSH script installation.
* **Target Devices**: Any OpenWrt-compatible hardware. Fully tested on the **GL.iNet Flint 2 (GL-MT6000)** (Streamline styles the LuCI interface opened via **System → Advanced Settings**).

---

## 📦 Installation

### Option A: Install via IPK (OpenWrt 21.02 / 22.03 / 23.05 / GL.iNet)

For routers running `opkg` (including all GL.iNet firmware releases):

```sh
scp releases/luci-theme-streamline_1.0.58-2_all.ipk root@192.168.8.1:/tmp/
ssh root@192.168.8.1 'opkg install --force-reinstall /tmp/luci-theme-streamline_1.0.58-2_all.ipk'
```

### Option B: Install via APK (OpenWrt 24.10 / 25.12+)

For modern OpenWrt releases using the Alpine Package Keeper (`apk`):

```sh
scp releases/luci-theme-streamline_1.0.58-r2_all.apk root@192.168.8.1:/tmp/
ssh root@192.168.8.1 'apk add --allow-untrusted /tmp/luci-theme-streamline_1.0.58-r2_all.apk'
```

### Complementary Package for GL.iNet Routers: `luci-proto-glinet`

If you run OpenWrt / LuCI on GL.iNet hardware and see **"Unsupported protocol type"** on VPN interfaces (`wgclient`, `wgserver`, `ovpnclient`, `ovpnserver`, `tethering`):

```sh
scp luci-proto-glinet_1.0.0-1_all.ipk root@192.168.8.1:/tmp/
ssh root@192.168.8.1 'opkg install /tmp/luci-proto-glinet_1.0.0-1_all.ipk'
```

> **Note**: Perform a hard refresh (**`Ctrl + F5`** or **`Cmd + Shift + R`**) in your browser after installing to ensure cached static files are renewed.

---

## 🔨 Building Release Packages

To build release packages locally for both package managers:

```sh
# Build OPKG package (.ipk) for OpenWrt <= 23.05
./build-ipk.sh

# Build Alpine/OpenWrt APK package (.apk) for OpenWrt >= 24.10 / 25.12
./build-apk.sh
```

---

## 🛠️ Direct Installation from Source

To deploy directly without building a package:

```sh
scp -r luci-theme-streamline root@192.168.8.1:/tmp/
ssh root@192.168.8.1 'sh /tmp/luci-theme-streamline/install.sh'
```

To remove a direct source installation:

```sh
ssh root@192.168.8.1 'sh /tmp/luci-theme-streamline/uninstall.sh'
```

---

## 🔄 Emergency Recovery

Streamline's post-removal and recovery scripts always point back to **Bootstrap**, OpenWrt's native fallback theme:

```sh
ssh root@192.168.8.1
uci set luci.main.mediaurlbase='/luci-static/bootstrap'
uci commit luci
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/uhttpd restart
```

---

## 🎨 Palettes & Typography

Open **Appearance** at the bottom of the desktop sidebar or within the mobile drawer:
* **Palettes**:
  * `GL.iNet` — Navy blue with turquoise highlights matching GL.iNet's aesthetic (default).
  * `Streamline` — Deep graphite with electric violet and sky blue accents.
  * `Ocean` — Marine blue with calm cyan and emerald hints.
  * `Forest` — Dark moss with fresh green and pine accents.
  * `Sunset` — Charcoal with warm amber, orange, and gold tones.
  * `Rose` — Velvet plum with soft pink and indigo accents.
  * `OLED Black` — Pure obsidian `#000000` canvas with luminous neon accents for AMOLED displays.
  * `Light` — Clean daytime slate `#f8fafc` with crisp white cards, dark typography, and indigo accents.
* **Fonts**: Choose between `System`, `Arial`, `Georgia`, or `Monospace`.
* Preferences are persisted locally in `localStorage` and applied before DOM paint to prevent flash of unstyled content (FOUC).

---

## 🏗️ Building from Source

### Building the IPK on Linux or Windows (Git Bash)

Ensure you have a POSIX shell with GNU `tar` and `gzip`:

```sh
./build-ipk.sh releases/luci-theme-streamline_1.0.58-2_all.ipk
node tools/verify-ipk.js releases/luci-theme-streamline_1.0.58-2_all.ipk
```

### Building via OpenWrt SDK / Buildroot

Copy the repository to `feeds/luci/themes/luci-theme-streamline` in your build environment:

```sh
./scripts/feeds update luci
./scripts/feeds install luci-theme-streamline
make package/luci-theme-streamline/compile V=s
```

---

## 📄 License

Licensed under the **Apache-2.0** License. See [LICENSE](LICENSE) for details.
