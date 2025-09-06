import { ChannelId } from "./enums.js";

export type U32 = number; // 0..2^32-1

export interface Header {
  version: number;        // u8
  channel: ChannelId;     // u8
  type: number;           // u8 (per-channel enum)
  flags: number;          // u8 bitfield
  length: U32;            // u32 be
  fileId: U32;            // u32 be (0 for single-active-file mode)
  txnId: U32;             // u32 be (0 for no transaction)
}

export type Frame = {
  header: Header;
  payload: Uint8Array;    // raw bytes (msgpack or Yjs)
};

// ------- Control payloads (MessagePack) -------
export interface CtrlHello {
  v: number;              // client impl version
  protocol: number;       // wire version (PROTOCOL_VERSION)
  client: "vscode" | "web" | "server";
  lastSeq?: number;       // for replay
  features?: string[];
}

export interface CtrlWelcome {
  v: number;
  protocol: number;
  roomId: string;
  seq: number;            // current server sequence
}

export type CtrlSnapshotRequest =
  | { filePath: string }
  | { fileId: U32 };

export interface CtrlReplayRequest {
  fromSeq: number;
  fileId?: U32;           // if omitted, implies active file (fileId=0)
}

export interface CtrlAck { seq: number; }

export interface CtrlError {
  code: string;
  message: string;
}

// ------- Chat payloads (MessagePack) -------
export interface ChatUser {
  id: string;
  name?: string;
}

export interface ChatUserMsg {
  id: string;             // message id
  from: ChatUser;
  text: string;
  ts: number;             // epoch ms
}
