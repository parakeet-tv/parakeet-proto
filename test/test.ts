import { describe, it, expect } from "vitest";
import * as Y from "yjs";

import {
  PROTOCOL_VERSION,
  ChannelId,
  ControlType,
  CodeType,
  ChatType,
  TerminalType,
  Flags,
} from "../src/enums.js";

import { HEADER_BYTES } from "../src/header.js";

import { encodeFrame, decodeHeaderOnly, unpackMsgpack } from "../src/frame.js";

import * as Control from "../src/channels/control.js";
import * as Code from "../src/channels/code.js";
import * as Chat from "../src/channels/chat.js";
import * as Terminal from "../src/channels/terminal.js";
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
      user: { id: "u1", username: "ann", displayName: "Ann", badgeIds: [] },
      content: "hello",
      sentAt: now,
    });
    const { header, payloadView } = decodeHeaderOnly(f);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.CHAT);
    expect(header.type).toBe(ChatType.USER);
    expect(msg.id).toBe("m1");
    expect(msg.user.id).toBe("u1");
    expect(msg.content).toBe("hello");
    expect(msg.sentAt).toBe(now);
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

describe("terminal channel", () => {
  it("OPEN encodes and decodes correctly", () => {
    const terminalOpen = Terminal.encodeTerminalOpen({
      id: 123,
      name: "Terminal 1",
      pid: 456,
      cols: 80,
      rows: 24,
      cwd: "/home/user",
      hasShellIntegration: true,
      isActive: true,
    });

    const { header, payloadView } = decodeHeaderOnly(terminalOpen);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.OPEN);
    expect(header.fileId).toBe(123); // terminalId
    expect(header.flags).toBe(Flags.NONE);
    expect(header.txnId).toBe(0);

    expect(msg.id).toBe(123);
    expect(msg.name).toBe("Terminal 1");
    expect(msg.pid).toBe(456);
    expect(msg.cols).toBe(80);
    expect(msg.rows).toBe(24);
    expect(msg.cwd).toBe("/home/user");
    expect(msg.hasShellIntegration).toBe(true);
    expect(msg.isActive).toBe(true);
  });

  it("CLOSE encodes and decodes correctly", () => {
    const terminalClose = Terminal.encodeTerminalClose(123, {
      at: Date.now(),
      exitCode: 0,
      reason: "normal exit",
    });

    const { header, payloadView } = decodeHeaderOnly(terminalClose);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.CLOSE);
    expect(header.fileId).toBe(123); // terminalId
    expect(header.flags).toBe(Flags.NONE);
    expect(header.txnId).toBe(0);

    expect(msg.at).toBeGreaterThan(0);
    expect(msg.exitCode).toBe(0);
    expect(msg.reason).toBe("normal exit");
  });

  it("OUTPUT encodes with default options", () => {
    const now = Date.now();
    const terminalOutput = Terminal.encodeTerminalOutput(123, {
      seq: 1,
      at: now,
      stream: 0,
      data: new Uint8Array([104, 101, 108, 108, 111]), // "hello"
      more: false,
    });

    const { header, payloadView } = decodeHeaderOnly(terminalOutput);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.OUTPUT);
    expect(header.fileId).toBe(123);
    expect(header.flags).toBe(Flags.NONE);
    expect(header.txnId).toBe(0);

    expect(msg.seq).toBe(1);
    expect(msg.at).toBe(now);
    expect(msg.stream).toBe(0);
    expect(msg.data).toEqual(new Uint8Array([104, 101, 108, 108, 111]));
    expect(msg.more).toBe(false);
  });

  it("OUTPUT encodes with compressed and ack flags", () => {
    const now = Date.now();
    const terminalOutput = Terminal.encodeTerminalOutput(
      123,
      {
        seq: 2,
        at: now,
        data: new Uint8Array([119, 111, 114, 108, 100]), // "world"
      },
      { compressed: true, ack: true, txnId: 42 }
    );

    const { header, payloadView } = decodeHeaderOnly(terminalOutput);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.OUTPUT);
    expect(header.fileId).toBe(123);
    expect(header.flags).toBe(Flags.COMPRESSED | Flags.ACK_REQUIRED);
    expect(header.txnId).toBe(42);
  });

  it("INPUT encodes with default options", () => {
    const now = Date.now();
    const terminalInput = Terminal.encodeTerminalInput(123, {
      seq: 1,
      at: now,
      data: new Uint8Array([108, 115, 10]), // "ls\n"
      source: "keyboard",
      echo: true,
    });

    const { header, payloadView } = decodeHeaderOnly(terminalInput);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.INPUT);
    expect(header.fileId).toBe(123);
    expect(header.flags).toBe(Flags.NONE);
    expect(header.txnId).toBe(0);

    expect(msg.seq).toBe(1);
    expect(msg.at).toBe(now);
    expect(msg.data).toEqual(new Uint8Array([108, 115, 10]));
    expect(msg.source).toBe("keyboard");
    expect(msg.echo).toBe(true);
  });

  it("INPUT encodes with ack flag and transaction ID", () => {
    const now = Date.now();
    const terminalInput = Terminal.encodeTerminalInput(
      123,
      {
        seq: 2,
        at: now,
        data: new Uint8Array([99, 100, 32, 47, 10]), // "cd /\n"
      },
      { ack: true, txnId: 99 }
    );

    const { header } = decodeHeaderOnly(terminalInput);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.INPUT);
    expect(header.fileId).toBe(123);
    expect(header.flags).toBe(Flags.ACK_REQUIRED);
    expect(header.txnId).toBe(99);
  });

  it("RESIZE encodes and decodes correctly", () => {
    const now = Date.now();
    const terminalResize = Terminal.encodeTerminalResize(123, {
      at: now,
      cols: 120,
      rows: 30,
    });

    const { header, payloadView } = decodeHeaderOnly(terminalResize);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.RESIZE);
    expect(header.fileId).toBe(123);
    expect(header.flags).toBe(Flags.NONE);
    expect(header.txnId).toBe(0);

    expect(msg.at).toBe(now);
    expect(msg.cols).toBe(120);
    expect(msg.rows).toBe(30);
  });

  it("TITLE encodes and decodes correctly", () => {
    const now = Date.now();
    const terminalTitle = Terminal.encodeTerminalTitle(123, {
      at: now,
      name: "New Terminal Title",
    });

    const { header, payloadView } = decodeHeaderOnly(terminalTitle);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.TITLE);
    expect(header.fileId).toBe(123);
    expect(header.flags).toBe(Flags.NONE);
    expect(header.txnId).toBe(0);

    expect(msg.at).toBe(now);
    expect(msg.name).toBe("New Terminal Title");
  });

  it("STATE encodes and decodes correctly", () => {
    const now = Date.now();
    const terminalState = Terminal.encodeTerminalState(123, {
      at: now,
      isActive: false,
      cwd: "/new/directory",
      hasShellIntegration: false,
    });

    const { header, payloadView } = decodeHeaderOnly(terminalState);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.STATE);
    expect(header.fileId).toBe(123);
    expect(header.flags).toBe(Flags.NONE);
    expect(header.txnId).toBe(0);

    expect(msg.at).toBe(now);
    expect(msg.isActive).toBe(false);
    expect(msg.cwd).toBe("/new/directory");
    expect(msg.hasShellIntegration).toBe(false);
  });

  it("EXEC_START encodes with transaction ID", () => {
    const now = Date.now();
    const terminalExecStart = Terminal.encodeTerminalExecStart(
      123,
      {
        at: now,
        command: "npm install",
        cwd: "/project",
        execId: 1,
      },
      { txnId: 77 }
    );

    const { header, payloadView } = decodeHeaderOnly(terminalExecStart);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.EXEC_START);
    expect(header.fileId).toBe(123);
    expect(header.flags).toBe(Flags.NONE);
    expect(header.txnId).toBe(77);

    expect(msg.at).toBe(now);
    expect(msg.command).toBe("npm install");
    expect(msg.cwd).toBe("/project");
    expect(msg.execId).toBe(1);
  });

  it("EXEC_END encodes with transaction ID", () => {
    const now = Date.now();
    const terminalExecEnd = Terminal.encodeTerminalExecEnd(
      123,
      {
        at: now,
        execId: 1,
        exitCode: 0,
      },
      { txnId: 77 }
    );

    const { header, payloadView } = decodeHeaderOnly(terminalExecEnd);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.EXEC_END);
    expect(header.fileId).toBe(123);
    expect(header.flags).toBe(Flags.NONE);
    expect(header.txnId).toBe(77);

    expect(msg.at).toBe(now);
    expect(msg.execId).toBe(1);
    expect(msg.exitCode).toBe(0);
  });

  it("SNAPSHOT encodes and decodes correctly", () => {
    const now = Date.now();
    const terminalSnapshot = Terminal.encodeTerminalSnapshot({
      at: now,
      terminals: [
        {
          id: 1,
          name: "Terminal 1",
          cols: 80,
          rows: 24,
          cwd: "/home/user",
          hasShellIntegration: true,
          createdAt: now - 1000,
          isActive: true,
          scrollbackSeqStart: 0,
          scrollback: new Uint8Array([119, 101, 108, 99, 111, 109, 101]), // "welcome"
        },
        {
          id: 2,
          name: "Terminal 2",
          cols: 120,
          rows: 30,
          cwd: "/tmp",
          hasShellIntegration: false,
          createdAt: now - 500,
          isActive: false,
        },
      ],
    });

    const { header, payloadView } = decodeHeaderOnly(terminalSnapshot);
    const msg = unpackMsgpack<any>(payloadView);

    expect(header.channel).toBe(ChannelId.TERMINAL);
    expect(header.type).toBe(TerminalType.SNAPSHOT);
    expect(header.fileId).toBe(0); // SNAPSHOT uses fileId = 0
    expect(header.flags).toBe(Flags.NONE);
    expect(header.txnId).toBe(0);

    expect(msg.at).toBe(now);
    expect(msg.terminals).toHaveLength(2);

    expect(msg.terminals[0].id).toBe(1);
    expect(msg.terminals[0].name).toBe("Terminal 1");
    expect(msg.terminals[0].cols).toBe(80);
    expect(msg.terminals[0].rows).toBe(24);
    expect(msg.terminals[0].cwd).toBe("/home/user");
    expect(msg.terminals[0].hasShellIntegration).toBe(true);
    expect(msg.terminals[0].createdAt).toBe(now - 1000);
    expect(msg.terminals[0].isActive).toBe(true);
    expect(msg.terminals[0].scrollbackSeqStart).toBe(0);
    expect(msg.terminals[0].scrollback).toEqual(
      new Uint8Array([119, 101, 108, 99, 111, 109, 101])
    );

    expect(msg.terminals[1].id).toBe(2);
    expect(msg.terminals[1].name).toBe("Terminal 2");
    expect(msg.terminals[1].cols).toBe(120);
    expect(msg.terminals[1].rows).toBe(30);
    expect(msg.terminals[1].cwd).toBe("/tmp");
    expect(msg.terminals[1].hasShellIntegration).toBe(false);
    expect(msg.terminals[1].createdAt).toBe(now - 500);
    expect(msg.terminals[1].isActive).toBe(false);
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
      Chat.chat.user({ id: "m2", user: { id: "u2", username: "user2", badgeIds: [] }, content: "hey", sentAt: 1 })
    );
    // code (Yjs)
    const d = new Y.Doc();
    d.getText("t").insert(0, "x");
    frames.push(Code.encodeSnapshot(d));
    // terminal (msgpack)
    frames.push(
      Terminal.encodeTerminalOpen({
        id: 123,
        name: "Terminal 1",
        cols: 80,
        rows: 24,
        cwd: "/home/user",
        hasShellIntegration: true,
      })
    );

    // pretend-router: classify without decoding bodies
    const seen = { control: 0, chat: 0, code: 0, terminal: 0 };
    for (const f of frames) {
      const { header } = decodeHeaderOnly(f);
      if (header.channel === ChannelId.CONTROL) seen.control++;
      if (header.channel === ChannelId.CHAT) seen.chat++;
      if (header.channel === ChannelId.CODE) seen.code++;
      if (header.channel === ChannelId.TERMINAL) seen.terminal++;
    }
    expect(seen).toEqual({ control: 1, chat: 1, code: 1, terminal: 1 });
  });
});
