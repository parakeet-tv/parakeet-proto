import type { Header } from "./types.js";

export const HEADER_BYTES = 16 as const;

export function packHeader(view: DataView, h: Header): void {
  view.setUint8(0, h.version & 0xff);
  view.setUint8(1, h.channel & 0xff);
  view.setUint8(2, h.type & 0xff);
  view.setUint8(3, h.flags & 0xff);
  view.setUint32(4, h.length >>> 0, false); // big-endian
  view.setUint32(8, h.fileId >>> 0, false);
  view.setUint32(12, h.txnId >>> 0, false);
}

export function unpackHeader(buf: ArrayBuffer | Uint8Array): Header {
  const view =
    buf instanceof ArrayBuffer
      ? new DataView(buf)
      : new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const length = view.getUint32(4, false);
  return {
    version: view.getUint8(0),
    channel: view.getUint8(1) as any,
    type: view.getUint8(2),
    flags: view.getUint8(3),
    length,
    fileId: view.getUint32(8, false),
    txnId: view.getUint32(12, false),
  };
}
