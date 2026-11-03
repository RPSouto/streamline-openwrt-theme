#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
let failures = 0;

function assert(condition, testName, details) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failures++;
  }
}

console.log('🧪 Starting Streamline Automated Test Suite...\n');

// Test 1: JavaScript syntax verification on all JS files
console.log('1. Verifying JavaScript syntax...');
const jsFiles = [
  'htdocs/luci-static/resources/menu-streamline.js',
  'htdocs/luci-static/resources/menu-streamline-v17.js',
  'htdocs/luci-static/resources/menu-streamline-v19.js',
  'htdocs/luci-static/resources/menu-streamline-v20.js',
  'htdocs/luci-static/resources/menu-streamline-v21.js',
  'htdocs/luci-static/streamline/dashboard.js',
  'htdocs/luci-static/streamline/pwa.js',
  'htdocs/streamline-sw.js'
];

for (const rel of jsFiles) {
  const full = path.join(rootDir, rel);
  if (!fs.existsSync(full)) {
    assert(false, `JS file exists: ${rel}`, 'File not found');
    continue;
  }
  try {
    execSync(`node -c "${full}"`);
    assert(true, `Syntax valid: ${rel}`);
  } catch (err) {
    assert(false, `Syntax valid: ${rel}`, err.message);
  }
}

// Test 2: Verify presence of all legacy compatibility scripts
console.log('\n2. Verifying legacy menu compatibility scripts...');
const legacyScripts = [
  'menu-streamline.js',
  'menu-streamline-v17.js',
  'menu-streamline-v19.js',
  'menu-streamline-v20.js',
  'menu-streamline-v21.js'
];
for (const script of legacyScripts) {
  const p = path.join(rootDir, 'htdocs/luci-static/resources', script);
  assert(fs.existsSync(p), `Legacy script present: ${script}`, 'Missing file causes opkg obsolete unlinking errors');
}

// Test 3: Check postinst does not delete installed menu scripts
console.log('\n3. Verifying postinst safety...');
const postinst = fs.readFileSync(path.join(rootDir, 'packaging/postinst'), 'utf8');
assert(!postinst.includes('rm -f /www/luci-static/resources/menu-streamline'),
  'postinst does not delete installed menu files',
  'Deleting installed files causes opkg ENOENT unlink failures on subsequent upgrades');

assert(postinst.includes("uci set luci.main.mediaurlbase='/luci-static/streamline'"),
  'postinst unconditionally activates Streamline in UCI',
  'Missing mediaurlbase causes LuCI to remain on bootstrap theme');

// Test 4: Check uci-defaults unconditionally activates theme
console.log('\n4. Verifying uci-defaults activation...');
const uciDefaults = fs.readFileSync(path.join(rootDir, 'root/etc/uci-defaults/30_luci-theme-streamline'), 'utf8');
assert(uciDefaults.includes("uci set luci.main.mediaurlbase='/luci-static/streamline'"),
  'uci-defaults unconditionally activates Streamline in UCI',
  'Conditional activation breaks theme on reinstall/upgrade');

// Test 5: Verify postrm safety on upgrade
console.log('\n5. Verifying postrm upgrade safety...');
const postrm = fs.readFileSync(path.join(rootDir, 'packaging/postrm'), 'utf8');
assert(postrm.includes('[ "$1" = "upgrade" ] && exit 0'),
  'postrm exits cleanly on upgrade without resetting theme to bootstrap',
  'Missing $1 = upgrade check causes opkg to reset mediaurlbase on upgrade');

// Test 6: Verify Palettes synchronization, order, and GL.iNet default
console.log('\n6. Verifying Palette consistency, GL.iNet default, and list ordering...');
const cascadeCss = fs.readFileSync(path.join(rootDir, 'htdocs/luci-static/streamline/cascade.css'), 'utf8');
assert(cascadeCss.includes('html[data-palette="glinet"]'), 'cascade.css contains glinet palette CSS rules');
assert(cascadeCss.includes('html[data-palette="oled"]'), 'cascade.css contains oled palette CSS rules');
assert(cascadeCss.includes('html[data-palette="light"]'), 'cascade.css contains light palette CSS rules');

const headerHtm = fs.readFileSync(path.join(rootDir, 'luasrc/view/themes/streamline/header.htm'), 'utf8');
assert(headerHtm.includes("p='glinet'"), 'header.htm predefines glinet as default palette');
assert(headerHtm.includes("logo-glinet.svg"), 'header.htm predefines logo-glinet.svg as default favicon');
assert(headerHtm.includes("oled:'#000000'") && headerHtm.includes("light:'#f8fafc'"),
  'header.htm inline script contains oled and light palette definitions');

const headerUt = fs.readFileSync(path.join(rootDir, 'ucode/template/themes/streamline/header.ut'), 'utf8');
assert(headerUt.includes("p='glinet'"), 'header.ut predefines glinet as default palette');
assert(headerUt.includes("logo-glinet.svg"), 'header.ut predefines logo-glinet.svg as default favicon');
assert(headerUt.includes("oled:'#000000'") && headerUt.includes("light:'#f8fafc'"),
  'header.ut inline script contains oled and light palette definitions');

const menuJs = fs.readFileSync(path.join(rootDir, 'htdocs/luci-static/resources/menu-streamline-v21.js'), 'utf8');
assert(/const PALETTES\s*=\s*\{\s*glinet:/.test(menuJs),
  'menu-streamline-v21.js PALETTES has glinet as the first entry in the list');
assert(menuJs.includes("name : 'glinet'") && menuJs.includes("savedPalette : 'glinet'"),
  'menu-streamline-v21.js defaults to glinet in applyPalette and showPalettePicker');
assert(menuJs.includes("oled: { title: 'OLED Black'") && menuJs.includes("light: { title: 'Light'"),
  'menu-streamline-v21.js PALETTES contains oled and light entries');

// Test 7: Verify version synchronization across build and source files
console.log('\n7. Verifying version consistency across all project files...');
const makefile = fs.readFileSync(path.join(rootDir, 'Makefile'), 'utf8');
const control = fs.readFileSync(path.join(rootDir, 'packaging/control'), 'utf8');
const swJs = fs.readFileSync(path.join(rootDir, 'htdocs/streamline-sw.js'), 'utf8');
const buildIpk = fs.readFileSync(path.join(rootDir, 'build-ipk.sh'), 'utf8');

assert(makefile.includes('PKG_VERSION:=1.0.57') && makefile.includes('PKG_RELEASE:=2'), 'Makefile PKG_VERSION is 1.0.57 and PKG_RELEASE is 2');
assert(control.includes('Version: 1.0.57-2'), 'packaging/control Version is 1.0.57-2');
assert(buildIpk.includes('1.0.57-2'), 'build-ipk.sh default target is 1.0.57-2');
assert(menuJs.includes("THEME_VERSION = '1.0.57-2'"), 'menu-streamline-v21.js THEME_VERSION is 1.0.57-2');
assert(swJs.includes('streamline-static-v57-2'), 'streamline-sw.js CACHE_NAME matches v57-2');
assert(headerHtm.includes('?v=1.0.57.2'), 'header.htm asset query param matches v1.0.57.2');
assert(headerUt.includes('?v=1.0.57.2'), 'header.ut asset query param matches v1.0.57.2');

// Test 8: Verify postinst does not kill active LuCI connections
console.log('\n8. Verifying postinst does not abort LuCI web uploads...');
assert(!postinst.includes('/etc/init.d/uhttpd restart') && !postinst.includes('/etc/init.d/rpcd restart'),
  'postinst does not restart uhttpd/rpcd (prevents "XHR request aborted by browser")',
  'Restarting web server in postinst drops the HTTP connection when installing via Web GUI');

// Test 9: Verify Click-to-Copy implementation & exclusions
console.log('\n9. Verifying Click-to-Copy implementation and exclusions...');
assert(menuJs.includes('setupClickToCopy()'), 'menu-streamline-v21.js defines setupClickToCopy()');
assert(menuJs.includes('this.setupClickToCopy()'), 'menu-streamline-v21.js initializes setupClickToCopy in __init__');
assert(menuJs.includes('isCopyExcluded(target)'), 'menu-streamline-v21.js implements isCopyExcluded()');
assert(menuJs.includes('.modal, .modal-dialog, .cbi-modal'), 'isCopyExcluded() excludes modal windows');
assert(menuJs.includes('button, .btn, .cbi-button'), 'isCopyExcluded() excludes buttons');
assert(menuJs.includes('form, input, textarea, select'), 'isCopyExcluded() excludes forms and form inputs');
assert(menuJs.includes('fallbackCopy(text)'), 'menu-streamline-v21.js implements fallbackCopy for plain HTTP OpenWrt routers');
assert(menuJs.includes('showToast(value, type)'), 'menu-streamline-v21.js implements showToast()');
assert(cascadeCss.includes('.sl-copyable-address'), 'cascade.css contains .sl-copyable-address styling');
assert(cascadeCss.includes('.sl-toast-container') && cascadeCss.includes('.sl-toast'), 'cascade.css contains toast notification styles');

// Test 10: Verify mobile table layout and horizontal scrolling architecture
console.log('\n10. Verifying mobile layout table responsiveness and horizontal drag/scroll...');
const mobileCss = fs.readFileSync(path.join(rootDir, 'htdocs/luci-static/streamline/mobile.css'), 'utf8');
assert(mobileCss.includes('.cbi-section-node') && mobileCss.includes('overflow-x: auto !important'),
  'mobile.css enables horizontal scrolling on .cbi-section-node');
assert(mobileCss.includes('[data-page="admin-network-wireless"] .cbi-section-table') &&
       mobileCss.includes('overflow-x: auto !important'),
  'mobile.css unlocks horizontal scrolling on wireless overview tables');
assert(mobileCss.includes('div[data-chain]') && mobileCss.includes('white-space: nowrap !important'),
  'mobile.css preserves firewall chain columns with non-collapsing nowrap styling');
assert(mobileCss.includes('.cbi-section-actions') && mobileCss.includes('white-space: nowrap !important'),
  'mobile.css keeps action buttons inline and prevents awkward button stacking');
assert(mobileCss.includes('table[style*="table-layout:fixed"]') && mobileCss.includes('table-layout: auto !important'),
  'mobile.css unlocks fixed realtime tables to allow natural column widths');
assert(!cascadeCss.includes('overflow: hidden !important;\n  border-radius: 12px !important;\n  border: 1px solid var(--sl-border) !important;\n  background: var(--sl-surface) !important;'),
  'cascade.css does not lock wireless tables with overflow: hidden !important');
assert(menuJs.includes('setupResponsiveTables()'), 'menu-streamline-v21.js defines setupResponsiveTables()');
assert(menuJs.includes('this.setupResponsiveTables()'), 'menu-streamline-v21.js initializes setupResponsiveTables in __init__');
assert(menuJs.includes('setupTableDragScroll()'), 'menu-streamline-v21.js enables mouse/touch table drag scrolling');

// Test 11: Verify Active DHCP Leases and Status table responsiveness
console.log('\n11. Verifying Active DHCP Leases table responsiveness and layout...');
assert(cascadeCss.includes('table#status_leases') && cascadeCss.includes('min-width: max-content !important'),
  'cascade.css ensures Active DHCP leases have min-width: max-content to prevent column clipping');
assert(cascadeCss.includes('.cbi-section > div, .cbi-section-node, .table-wrapper { width: 100%; max-width: 100%; overflow-x: auto;'),
  'cascade.css enables horizontal scrolling on .cbi-section > div containers');
assert(mobileCss.includes('table#status_leases') && mobileCss.includes('width: max-content !important'),
  'mobile.css ensures Active DHCP leases have max-content width on mobile');
assert(mobileCss.includes('.cbi-section > div,') && mobileCss.includes('overflow-x: auto !important'),
  'mobile.css enables horizontal scrolling on .cbi-section and .cbi-section > div');
assert(menuJs.includes('table#status_leases') && menuJs.includes('.cbi-section > div'),
  'menu-streamline-v21.js table drag scroll includes DHCP leases table and status containers');

// Test 12: Verify Wireless Overview enhancements
console.log('\n12. Verifying Wireless Overview enhancements and layout...');
assert(cascadeCss.includes('repeat(auto-fit, minmax(min(100%, 380px), 1fr))'),
  'cascade.css uses auto-fit grid to fill width symmetrically across all radio chips');
assert(cascadeCss.includes('.network-status-table .ifacebox-head') && cascadeCss.includes('.sl-radio-band'),
  'cascade.css includes modern radio hardware header and frequency pill styling');
assert(cascadeCss.includes('.network-status-table .ifacebadge') && cascadeCss.includes('.has-associations'),
  'cascade.css styles SSID cards with prominent titles, chip metadata and client highlights');
assert(mobileCss.includes('.network-status-table { grid-template-columns: 1fr !important'),
  'mobile.css stacks wireless radio cards to full width on mobile screens');
assert(menuJs.includes('normalizeWirelessOverview()') && menuJs.includes('this.normalizeWirelessOverview()'),
  'menu-streamline-v21.js defines and initializes normalizeWirelessOverview');

// Test 13: Verify Associated Stations table and mobile touch drag scrolling
console.log('\n13. Verifying Associated Stations table responsiveness and mobile touch drag scrolling...');
assert(cascadeCss.includes('table#wifi_assoclist_table') && cascadeCss.includes('table.assoclist'),
  'cascade.css styles Associated Stations table with non-clipping max-content width');
assert(mobileCss.includes('table#wifi_assoclist_table') && mobileCss.includes('table.assoclist'),
  'mobile.css ensures Associated Stations table has max-content width on mobile');
assert(mobileCss.includes('white-space: nowrap !important;\n    min-width: 90px;\n    padding: 10px 14px;'),
  'mobile.css prevents awkward cell word wrapping across all mobile table cells');
assert(menuJs.includes('touchstart') && menuJs.includes('touchmove') && menuJs.includes('touchend'),
  'menu-streamline-v21.js implements touch drag scrolling for mobile devices');
assert(menuJs.includes('table#wifi_assoclist_table'),
  'menu-streamline-v21.js table drag scroll includes Associated Stations table');

// Summary
console.log(`\n========================================`);
if (failures === 0) {
  console.log('🎉 ALL TESTS PASSED! Safe to build package.\n');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED. Fix issues before releasing.\n`);
  process.exit(1);
}

