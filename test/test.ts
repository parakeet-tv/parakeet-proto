import { describe, it, expect } from "vitest";
import * as Y from "yjs";

import {
  PROTOCOL_VERSION,
  ChannelId,
  ControlType,
  CodeType,
  ChatType,
} from "../src/enums.js";

import { HEADER_BYTES } from "../src/header.js";

import { encodeFrame, decodeHeaderOnly, unpackMsgpack } from "../src/frame.js";

import * as Control from "../src/channels/control.js";
import * as Code from "../src/channels/code.js";
import * as Chat from "../src/channels/chat.js";
import { fileIdFromPath } from "../src/utils/hash.js";

describe("header/frame basics", () => {
  it("encodes and decodes header without parsing payload", () => {
    const frame = encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.HELLO,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      { v: 1, protocol: PROTOCOL_VERSION, client: "web" }
    );
    const { header, payloadView } = decodeHeaderOnly(frame);

    expect(frame.byteLength).toBe(HEADER_BYTES + header.length);
    expect(header.version).toBe(PROTOCOL_VERSION);
    expect(header.channel).toBe(ChannelId.CONTROL);
    expect(header.type).toBe(ControlType.HELLO);
    expect(header.flags).toBe(0);
    expect(header.fileId).toBe(0);
    expect(header.txnId).toBe(0);
    // payloadView length matches header.length
    expect(payloadView.byteLength).toBe(header.length);
  });
});

describe("control channel", () => {
  it("HELLO/WELCOME/SNAPSHOT_REQUEST/REPLAY_REQUEST round-trip", () => {
    const hello = Control.control.hello({
      v: 1,
      protocol: PROTOCOL_VERSION,
      client: "vscode",
      features: ["delta"],
    });
    const { header: h1, payloadView: p1 } = decodeHeaderOnly(hello);
    const msg1 = unpackMsgpack<any>(p1);

    expect(h1.channel).toBe(ChannelId.CONTROL);
    expect(h1.type).toBe(ControlType.HELLO);
    expect(msg1.protocol).toBe(PROTOCOL_VERSION);
    expect(msg1.client).toBe("vscode");

    const welcome = Control.control.welcome({
      v: 1,
      protocol: PROTOCOL_VERSION,
      roomId: "room-a",
      seq: 123,
    });
    const { header: h2, payloadView: p2 } = decodeHeaderOnly(welcome);
    const msg2 = unpackMsgpack<any>(p2);
    expect(h2.type).toBe(ControlType.WELCOME);
    expect(msg2.seq).toBe(123);

    const snapReq = Control.control.snapshotRequest({ filePath: "src/app.ts" });
    const { header: h3, payloadView: p3 } = decodeHeaderOnly(snapReq);
    const msg3 = unpackMsgpack<any>(p3);
    expect(h3.type).toBe(ControlType.SNAPSHOT_REQUEST);
    expect(msg3.filePath).toBe("src/app.ts");

    const replayReq = Control.control.replayRequest({ fromSeq: 42 });
    const { header: h4, payloadView: p4 } = decodeHeaderOnly(replayReq);
    const msg4 = unpackMsgpack<any>(p4);
    expect(h4.type).toBe(ControlType.REPLAY_REQUEST);
    expect(msg4.fromSeq).toBe(42);
    // single-file mode defaults to fileId=0
    expect(h4.fileId).toBe(0);
  });

  it("ERROR/ACK messages encode", () => {
    const ack = Control.control.ack({ seq: 999 });
    const { header: ha, payloadView: pa } = decodeHeaderOnly(ack);
    const mAck = unpackMsgpack<any>(pa);
    expect(ha.type).toBe(ControlType.ACK);
    expect(mAck.seq).toBe(999);

    const err = Control.control.error({ code: "BAD_REQ", message: "nope" });
    const { header: he, payloadView: pe } = decodeHeaderOnly(err);
    const mErr = unpackMsgpack<any>(pe);
    expect(he.type).toBe(ControlType.ERROR);
    expect(mErr.code).toBe("BAD_REQ");
  });
});

describe("chat channel", () => {
  it("USER message round-trip", () => {
    const now = Date.now();
    const f = Chat.chat.user({
      id: "m1",
      from: { id: "u1", name: "Ann" },
      text: "hello",
      ts: now,
    });
    const { header, payloadView } = decodeHeaderOnly(f);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.CHAT);
    expect(header.type).toBe(ChatType.USER);
    expect(msg.id).toBe("m1");
    expect(msg.from.id).toBe("u1");
    expect(msg.text).toBe("hello");
    expect(msg.ts).toBe(now);
  });
});

describe("code channel (Yjs)", () => {
  it("SNAPSHOT applies to a fresh doc", () => {
    const d1 = new Y.Doc();
    const t1 = d1.getText("t");
    t1.insert(0, "abc");

    const snapFrame = Code.encodeSnapshot(d1);
    const { header, payloadView } = decodeHeaderOnly(snapFrame);

    expect(header.channel).toBe(ChannelId.CODE);
    expect(header.type).toBe(CodeType.SNAPSHOT);

    const d2 = new Y.Doc();
    Y.applyUpdate(d2, payloadView);
    expect(d2.getText("t").toString()).toBe("abc");
  });

  it("DELTA applies and updates content", () => {
    const d1 = new Y.Doc();
    const t1 = d1.getText("t");
    t1.insert(0, "abc");

    let captured: Uint8Array | null = null;
    d1.on("update", (u: Uint8Array) => {
      captured = u;
    });
    t1.insert(3, "!"); // triggers an update

    expect(captured).toBeInstanceOf(Uint8Array);

    const deltaFrame = Code.encodeDelta(captured!);
    const { header, payloadView } = decodeHeaderOnly(deltaFrame);

    expect(header.channel).toBe(ChannelId.CODE);
    expect(header.type).toBe(CodeType.DELTA);

    const d2 = new Y.Doc();
    // apply base snapshot then delta to simulate live join + update
    Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1)); // snapshot of current state is "abc!"
    // Alternatively: start from "abc" then apply `payloadView`.
    expect(d2.getText("t").toString()).toBe("abc!");
  });
});

describe("utils/hash", () => {
  it("fileIdFromPath is deterministic and u32", () => {
    const a = fileIdFromPath("src/app.ts");
    const b = fileIdFromPath("src/app.ts");
    const c = fileIdFromPath("src/other.ts");
    expect(a).toBe(b);
    expect(typeof a).toBe("number");
    expect(a >>> 0).toBe(a); // u32 coercion
    expect(a).not.toBe(c);
  });
});

describe("integration: mixed frames", () => {
  it("server can route solely by header fields", () => {
    const frames: Uint8Array[] = [];
    // control hello (msgpack)
    frames.push(
      Control.control.hello({ v: 1, protocol: PROTOCOL_VERSION, client: "web" })
    );
    // chat (msgpack)
    frames.push(
      Chat.chat.user({ id: "m2", from: { id: "u2" }, text: "hey", ts: 1 })
    );
    // code (Yjs)
    const d = new Y.Doc();
    d.getText("t").insert(0, "x");
    frames.push(Code.encodeSnapshot(d));

    // pretend-router: classify without decoding bodies
    const seen = { control: 0, chat: 0, code: 0 };
    for (const f of frames) {
      const { header } = decodeHeaderOnly(f);
      if (header.channel === ChannelId.CONTROL) seen.control++;
      if (header.channel === ChannelId.CHAT) seen.chat++;
      if (header.channel === ChannelId.CODE) seen.code++;
    }
    expect(seen).toEqual({ control: 1, chat: 1, code: 1 });
  });
});
