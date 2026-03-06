// minizip.js — Tiny ZIP file builder. No dependencies.
// Creates uncompressed ZIP archives (STORE method) from {name, blob} entries.

class MiniZip {
  constructor() {
    this.files = [];
  }

  addFile(name, data) {
    // data: Uint8Array
    this.files.push({ name: new TextEncoder().encode(name), data });
  }

  async addBlob(name, blob) {
    const buf = await blob.arrayBuffer();
    this.addFile(name, new Uint8Array(buf));
  }

  generate() {
    const files = this.files;
    const centralDir = [];
    const fileEntries = [];
    let offset = 0;

    for (const f of files) {
      const crc = crc32(f.data);
      const localHeader = this._localFileHeader(f.name, f.data.length, crc);
      fileEntries.push(localHeader, f.data);

      centralDir.push(this._centralDirEntry(f.name, f.data.length, crc, offset));
      offset += localHeader.length + f.data.length;
    }

    const centralDirData = concatArrays(centralDir);
    const endRecord = this._endOfCentralDir(files.length, centralDirData.length, offset);

    return new Blob([...fileEntries, centralDirData, endRecord], { type: "application/zip" });
  }

  _localFileHeader(name, size, crc) {
    const buf = new ArrayBuffer(30 + name.length);
    const v = new DataView(buf);
    const u = new Uint8Array(buf);
    v.setUint32(0, 0x04034b50, true);  // signature
    v.setUint16(4, 20, true);           // version needed
    v.setUint16(6, 0, true);            // flags
    v.setUint16(8, 0, true);            // compression: STORE
    v.setUint16(10, 0, true);           // mod time
    v.setUint16(12, 0, true);           // mod date
    v.setUint32(14, crc, true);         // crc32
    v.setUint32(18, size, true);        // compressed size
    v.setUint32(22, size, true);        // uncompressed size
    v.setUint16(26, name.length, true); // filename length
    v.setUint16(28, 0, true);           // extra field length
    u.set(name, 30);
    return u;
  }

  _centralDirEntry(name, size, crc, localOffset) {
    const buf = new ArrayBuffer(46 + name.length);
    const v = new DataView(buf);
    const u = new Uint8Array(buf);
    v.setUint32(0, 0x02014b50, true);   // signature
    v.setUint16(4, 20, true);            // version made by
    v.setUint16(6, 20, true);            // version needed
    v.setUint16(8, 0, true);             // flags
    v.setUint16(10, 0, true);            // compression: STORE
    v.setUint16(12, 0, true);            // mod time
    v.setUint16(14, 0, true);            // mod date
    v.setUint32(16, crc, true);          // crc32
    v.setUint32(20, size, true);         // compressed size
    v.setUint32(24, size, true);         // uncompressed size
    v.setUint16(28, name.length, true);  // filename length
    v.setUint16(30, 0, true);            // extra field length
    v.setUint16(32, 0, true);            // comment length
    v.setUint16(34, 0, true);            // disk number start
    v.setUint16(36, 0, true);            // internal file attributes
    v.setUint32(38, 0, true);            // external file attributes
    v.setUint32(42, localOffset, true);  // relative offset of local header
    u.set(name, 46);
    return u;
  }

  _endOfCentralDir(count, cdSize, cdOffset) {
    const buf = new ArrayBuffer(22);
    const v = new DataView(buf);
    v.setUint32(0, 0x06054b50, true);   // signature
    v.setUint16(4, 0, true);             // disk number
    v.setUint16(6, 0, true);             // disk with central dir
    v.setUint16(8, count, true);         // entries on this disk
    v.setUint16(10, count, true);        // total entries
    v.setUint32(12, cdSize, true);       // size of central dir
    v.setUint32(16, cdOffset, true);     // offset of central dir
    v.setUint16(20, 0, true);            // comment length
    return new Uint8Array(buf);
  }
}

function concatArrays(arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { result.set(a, off); off += a.length; }
  return result;
}

// CRC-32 lookup table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
