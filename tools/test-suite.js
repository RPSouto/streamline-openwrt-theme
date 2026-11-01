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

// Test 6: Verify OLED and Light palettes synchronization
console.log('\n6. Verifying OLED and Light palette consistency across templates and CSS...');
const cascadeCss = fs.readFileSync(path.join(rootDir, 'htdocs/luci-static/streamline/cascade.css'), 'utf8');
assert(cascadeCss.includes('html[data-palette="oled"]'), 'cascade.css contains oled palette CSS rules');
assert(cascadeCss.includes('html[data-palette="light"]'), 'cascade.css contains light palette CSS rules');

const headerHtm = fs.readFileSync(path.join(rootDir, 'luasrc/view/themes/streamline/header.htm'), 'utf8');
assert(headerHtm.includes("oled:'#000000'") && headerHtm.includes("light:'#f8fafc'"),
  'header.htm inline script contains oled and light palette definitions');

const headerUt = fs.readFileSync(path.join(rootDir, 'ucode/template/themes/streamline/header.ut'), 'utf8');
assert(headerUt.includes("oled:'#000000'") && headerUt.includes("light:'#f8fafc'"),
  'header.ut inline script contains oled and light palette definitions');

const menuJs = fs.readFileSync(path.join(rootDir, 'htdocs/luci-static/resources/menu-streamline-v21.js'), 'utf8');
assert(menuJs.includes("oled: { title: 'OLED Black'") && menuJs.includes("light: { title: 'Light'"),
  'menu-streamline-v21.js PALETTES contains oled and light entries');

// Test 7: Verify version synchronization across build and source files
console.log('\n7. Verifying version consistency across all project files...');
const makefile = fs.readFileSync(path.join(rootDir, 'Makefile'), 'utf8');
const control = fs.readFileSync(path.join(rootDir, 'packaging/control'), 'utf8');
const swJs = fs.readFileSync(path.join(rootDir, 'htdocs/streamline-sw.js'), 'utf8');
const buildIpk = fs.readFileSync(path.join(rootDir, 'build-ipk.sh'), 'utf8');

assert(makefile.includes('PKG_VERSION:=1.0.56'), 'Makefile PKG_VERSION is 1.0.56');
assert(control.includes('Version: 1.0.56-1'), 'packaging/control Version is 1.0.56-1');
assert(buildIpk.includes('1.0.56-1'), 'build-ipk.sh default target is 1.0.56-1');
assert(menuJs.includes("THEME_VERSION = '1.0.56'"), 'menu-streamline-v21.js THEME_VERSION is 1.0.56');
assert(swJs.includes('streamline-static-v56'), 'streamline-sw.js CACHE_NAME matches v56');
assert(headerHtm.includes('?v=1.0.56'), 'header.htm asset query param matches v1.0.56');
assert(headerUt.includes('?v=1.0.56'), 'header.ut asset query param matches v1.0.56');

// Test 8: Verify postinst does not kill active LuCI connections
console.log('\n8. Verifying postinst does not abort LuCI web uploads...');
assert(!postinst.includes('/etc/init.d/uhttpd restart') && !postinst.includes('/etc/init.d/rpcd restart'),
  'postinst does not restart uhttpd/rpcd (prevents "XHR request aborted by browser")',
  'Restarting web server in postinst drops the HTTP connection when installing via Web GUI');

// Summary
console.log(`\n========================================`);
if (failures === 0) {
  console.log('🎉 ALL TESTS PASSED! Safe to build package.\n');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED. Fix issues before releasing.\n`);
  process.exit(1);
}
