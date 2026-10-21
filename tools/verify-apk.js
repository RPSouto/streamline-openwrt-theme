#!/usr/bin/env node
'use strict';

const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

const file = process.argv[2];
if (!file) {
  console.error('Usage: verify-apk.js PACKAGE.apk');
  process.exit(2);
}

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const buffer = fs.readFileSync(file);
if (buffer.length < 64) {
  throw new Error('APK file is too small');
}

if (buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
  throw new Error('APK does not start with gzip magic header (0x1f, 0x8b)');
}

function parseTar(tarBuf) {
  const members = [];
  let offset = 0;
  while (offset + 512 <= tarBuf.length) {
    const header = tarBuf.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '').trim();
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
    const size = parseInt(sizeText || '0', 8);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new Error(`Invalid TAR size for ${name}`);
    }
    const start = offset + 512;
    const end = start + size;
    if (end > tarBuf.length) {
      throw new Error(`Truncated TAR member ${name}`);
    }
    members.push({ name, size, data: tarBuf.subarray(start, end) });
    offset = start + Math.ceil(size / 512) * 512;
  }
  return members;
}

// Split concatenated gzip streams
function extractGzipStreams(buf) {
  const streams = [];
  let pos = 0;
  while (pos < buf.length) {
    if (buf[pos] !== 0x1f || buf[pos + 1] !== 0x8b) {
      throw new Error(`Expected gzip stream magic at byte ${pos}`);
    }
    let found = false;
    for (let end = pos + 18; end <= buf.length; end++) {
      try {
        const decompressed = zlib.gunzipSync(buf.subarray(pos, end));
        streams.push({
          start: pos,
          end,
          compressed: buf.subarray(pos, end),
          data: decompressed,
        });
        pos = end;
        found = true;
        break;
      } catch (err) {
        // Try next slice boundary
      }
    }
    if (!found) {
      throw new Error(`Could not find valid gzip stream ending from offset ${pos}`);
    }
  }
  return streams;
}

const streams = extractGzipStreams(buffer);
if (streams.length < 2) {
  throw new Error(`APK must contain at least 2 streams (control + data), found: ${streams.length}`);
}

const controlStream = streams[0];
const dataStream = streams[streams.length - 1];

const controlMembers = parseTar(controlStream.data);
const controlNames = controlMembers.map((m) => m.name.replace(/^\.\//, ''));

if (!controlNames.includes('.PKGINFO')) {
  throw new Error('control archive is missing .PKGINFO');
}

const pkgInfoMember = controlMembers.find((m) => m.name.replace(/^\.\//, '') === '.PKGINFO');
const pkgInfoText = pkgInfoMember.data.toString('utf8');

const pkgInfo = {};
for (const line of pkgInfoText.split(/\r?\n/)) {
  const match = line.match(/^\s*([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
  if (match) {
    pkgInfo[match[1]] = match[2].trim();
  }
}

if (!pkgInfo.pkgname || pkgInfo.pkgname !== 'luci-theme-streamline') {
  throw new Error(`Unexpected pkgname in .PKGINFO: ${pkgInfo.pkgname}`);
}

if (!pkgInfo.pkgver) {
  throw new Error('Missing pkgver in .PKGINFO');
}

if (pkgInfo.datahash) {
  const actualHash = crypto.createHash('sha256').update(dataStream.compressed).digest('hex');
  if (pkgInfo.datahash !== actualHash) {
    throw new Error(`datahash mismatch: expected ${pkgInfo.datahash}, got ${actualHash}`);
  }
}

const dataMembers = parseTar(dataStream.data);
const dataNames = dataMembers.map((m) => m.name.replace(/^\.\//, ''));

const expectedDataFiles = [
  'www/luci-static/streamline/cascade.css',
  'www/luci-static/streamline/mobile.css',
  'www/luci-static/resources/menu-streamline-v21.js',
];

for (const exp of expectedDataFiles) {
  if (!dataNames.includes(exp)) {
    throw new Error(`data archive missing expected asset: ${exp}`);
  }
}

console.log(`APK OpenWrt/Alpine válido: ${file} (versão: ${pkgInfo.pkgver}, ${dataMembers.length} ficheiros de dados)`);
