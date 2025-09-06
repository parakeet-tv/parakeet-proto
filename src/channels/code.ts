import * as Y from "yjs";
import { ChannelId, CodeType } from "../enums.js";
import { encodeFrame } from "../frame.js";

/** Encode a Yjs snapshot (full state as update). */
export function encodeSnapshot(doc: Y.Doc, fileId = 0) {
  const snap = Y.encodeStateAsUpdate(doc);
  return encodeFrame(
    {
      channel: ChannelId.CODE,
      type: CodeType.SNAPSHOT,
      flags: 0,
      fileId,
      txnId: 0,
    },
    snap
  );
}

/** Encode a Yjs delta/update you receive from observe(). */
export function encodeDelta(update: Uint8Array, fileId = 0) {
  return encodeFrame(
    {
      channel: ChannelId.CODE,
      type: CodeType.DELTA,
      flags: 0,
      fileId,
      txnId: 0,
    },
    update
  );
}
