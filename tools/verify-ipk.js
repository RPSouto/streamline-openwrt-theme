#!/usr/bin/env node
'use strict';

const fs = require('fs');
const zlib = require('zlib');
const file = process.argv[2];
if (!file) {
  console.error('Usage: verify-ipk.js PACKAGE.ipk');
  process.exit(2);
}

const compressed = fs.readFileSync(file);
if (compressed[0] !== 0x1f || compressed[1] !== 0x8b)
  throw new Error('IPK is not an outer gzip archive');

const archive = zlib.gunzipSync(compressed);
const members = [];
let offset = 0;
while (offset + 512 <= archive.length) {
  const header = archive.subarray(offset, offset + 512);
  if (header.every((byte) => byte === 0))
    break;
  const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
  const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
  const size = parseInt(sizeText || '0', 8);
  if (!Number.isSafeInteger(size) || size < 0)
    throw new Error(`Invalid TAR size for ${name}`);
  const start = offset + 512;
  const end = start + size;
  if (end > archive.length)
    throw new Error(`Truncated TAR member ${name}`);
  members.push({ name, data: archive.subarray(start, end) });
  offset = start + Math.ceil(size / 512) * 512;
}

const expected = ['./debian-binary', './data.tar.gz', './control.tar.gz'];
if (members.length !== expected.length || members.some((m, i) => m.name !== expected[i]))
  throw new Error(`Unexpected outer TAR members: ${members.map((m) => m.name).join(', ')}`);
if (members[0].data.toString('ascii') !== '2.0\n')
  throw new Error('Invalid debian-binary payload');
for (const member of members.slice(1)) {
  if (member.data[0] !== 0x1f || member.data[1] !== 0x8b)
    throw new Error(`${member.name} is not gzip data`);
}

console.log(`IPK OpenWrt tar.gz válido: ${file}`);
