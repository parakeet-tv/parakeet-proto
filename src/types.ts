import { ChannelId } from "./enums.js";

export type U32 = number; // 0..2^32-1

export interface Header {
  version: number; // u8
  channel: ChannelId; // u8
  type: number; // u8 (per-channel enum)
  flags: number; // u8 bitfield
  length: U32; // u32 be
  fileId: U32; // u32 be (0 for single-active-file mode)
  txnId: U32; // u32 be (0 for no transaction)
}

export type Frame = {
  header: Header;
  payload: Uint8Array; // raw bytes (msgpack or Yjs)
};

// ------- Control payloads (MessagePack) -------
export interface CtrlHello {
  v: number; // client impl version
  protocol: number; // wire version (PROTOCOL_VERSION)
  client: "vscode" | "web" | "server";
  lastSeq?: number; // for replay
  features?: string[];
}

export interface CtrlWelcome {
  v: number;
  protocol: number;
  roomId: string;
  seq: number; // current server sequence
}

export type CtrlSnapshotRequest = { filePath: string } | { fileId: U32 };

export interface CtrlReplayRequest {
  fromSeq: number;
  fileId?: U32; // if omitted, implies active file (fileId=0)
}

export interface CtrlAck {
  seq: number;
}

export interface CtrlError {
  code: string;
  message: string;
}

// ------- Chat payloads (MessagePack) -------
export type BadgeId = string; // e.g. "mod", "vip", "sub"

export interface ChatUser {
  id: string; // stable user id (ULID/snowflake)
  username: string; // immutable slug; use displayName if you later add it
  displayName?: string; // optional pretty casing
  color?: string; // optional color hex
  badgeIds: BadgeId[]; // e.g. ["mod","vip"] — unique, sorted not required
}

export interface ChatUserMsg {
  id: string; // server-generated message id (ULID), for de-dupe/links
  sentAt: number; // epoch ms
  user: ChatUser;
  content: string; // raw text. (You can add "parts" later for emotes)
  replyToId?: string; // optional thread/reply pointer
  mentions?: string[]; // optional array of user ids mentioned
}

// Minimal, italic in UI, low metadata.
export interface ChatSystemMsg {
  id: string; // ULID
  sentAt: number; // epoch ms
  content: string; // what to show (italic)
}
