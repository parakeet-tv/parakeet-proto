import { pack as mpack, unpack as munpack } from "msgpackr";
import { HEADER_BYTES, packHeader, unpackHeader } from "./header.js";
import type { Header, Frame } from "./types.js";
import { PROTOCOL_VERSION } from "./enums.js";

/**
 * Encode a frame. If `payload` is a Uint8Array, it's used as-is (Yjs etc.).
 * Otherwise it's MessagePack-encoded.
 */
export function encodeFrame(
  h: { channel: Header["channel"]; type: Header["type"]; version?: number; flags?: number; fileId?: number; txnId?: number },
  payload: Uint8Array | object
): Uint8Array {
  const body = payload instanceof Uint8Array ? payload : mpack(payload);
  const header: Header = {
    version: h.version ?? PROTOCOL_VERSION,
    channel: h.channel,
    type: h.type,
    flags: h.flags ?? 0,
    length: body.byteLength >>> 0,
    fileId: h.fileId ?? 0,
    txnId: h.txnId ?? 0,
  };
  const ab = new ArrayBuffer(HEADER_BYTES + body.byteLength);
  const view = new DataView(ab);
  packHeader(view, header);
  new Uint8Array(ab, HEADER_BYTES).set(body);
  return new Uint8Array(ab);
}

/** Fast path: read just the header and return a view onto the payload bytes. */
export function decodeHeaderOnly(buf: ArrayBuffer | Uint8Array): {
  header: Header;
  payloadView: Uint8Array;
} {
  const header = unpackHeader(buf);
  const u8 =
    buf instanceof ArrayBuffer ? new Uint8Array(buf) : (buf as Uint8Array);
  const payloadView = u8.subarray(HEADER_BYTES, HEADER_BYTES + header.length);
  return { header, payloadView };
}

/** Unpack a msgpack payload (do not use for CODE/Yjs frames). */
export function unpackMsgpack<T>(payloadView: Uint8Array): T {
  return munpack(payloadView) as T;
}
