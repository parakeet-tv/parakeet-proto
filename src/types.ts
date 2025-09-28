import { ChannelId } from "./enums.js";

export type U32 = number; // 0..2^32-1

export interface Header {
  version: number; // u8
  channel: ChannelId; // u8
  type: number; // u8 (per-channel enum)
  flags: number; // u8 bitfield
  length: U32; // u32 be
  fileId: U32; // u32 be (0 for single-active-file mode) - for terminal, it's the terminal id
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

export interface CtrlUpdateMetadata {
  title: string;
  description: string;
  tags: string[];
}

export interface CtrlStreamStatus {
  isLive: boolean;
  startTime: number;
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

// ------- Terminal payloads (MessagePack) -------
// Note: header.fileId === terminalId for all TERMINAL frames except SNAPSHOT (fileId = 0)

export type TerminalId = U32;

export interface TerminalOpen {
  id: TerminalId; // echoed for convenience; also in header.fileId
  name: string; // vscode.Terminal.name
  pid?: number | null; // terminal.processId
  cols?: number;
  rows?: number;
  cwd?: string | null; // shellIntegration?.cwd
  hasShellIntegration?: boolean;
  isActive?: boolean; // whether this is the active terminal on sender
}

export interface TerminalClose {
  at: number; // epoch ms
  exitCode?: number | null; // if available
  reason?: string; // optional human string
}

export type TerminalStream = 0 | 1; // 0=stdout, 1=stderr (stdout if unknown)

export interface TerminalOutput {
  seq: U32; // per-terminal monotonic counter
  at: number; // epoch ms
  stream?: TerminalStream; // default 0
  data: Uint8Array; // raw bytes (UTF-8 encoded if from VS Code string)
  more?: boolean; // hint: additional chunks immediately follow
}

export interface TerminalInput {
  seq: U32; // per-terminal monotonic counter
  at: number; // epoch ms
  data: Uint8Array; // text sent to the terminal
  source?: "keyboard" | "paste" | "api";
  echo?: boolean; // if input already appears in OUTPUT
}

export interface TerminalResize {
  at: number; // epoch ms
  cols: number;
  rows: number;
}

export interface TerminalTitle {
  at: number; // epoch ms
  name: string; // new name/title
}

export interface TerminalState {
  at: number; // epoch ms
  isActive?: boolean;
  cwd?: string | null;
  hasShellIntegration?: boolean;
}

export interface TerminalExecStart {
  at: number;
  command?: string; // event.execution.commandLine?.value
  cwd?: string | null;
  execId: U32; // per-terminal execution id
}

export interface TerminalExecEnd {
  at: number;
  execId: U32;
  exitCode: number | null;
}

export interface TerminalSnapshotTerminal {
  id: TerminalId;
  name: string;
  cols?: number;
  rows?: number;
  cwd?: string | null;
  hasShellIntegration?: boolean;
  createdAt: number;
  isActive?: boolean;

  // Optional scrollback preview so new viewers see context
  // If present, this is the last N bytes as raw data with its first seq
  scrollbackSeqStart?: U32;
  scrollback?: Uint8Array;
}

export interface TerminalSnapshot {
  at: number; // epoch ms
  terminals: TerminalSnapshotTerminal[];
}

// ------- Audio payloads (MessagePack) -------

export type AudioRole = "publisher" | "viewer";

export interface AudioStartIntent {
  trackName?: string; // default "audio-main" on server if omitted
}

export interface AudioWebrtcOffer {
  role: AudioRole; // "publisher" | "viewer"
  sdp: string;     // local offer SDP
}

export interface AudioWebrtcAnswer {
  role: AudioRole;
  sdp: string;        // remote answer SDP
  sessionId: string;  // Cloudflare session id for this peer
}

export interface AudioTracksPublish {
  sessionId: string;  // publisher's own CF session id
  offer: string;      // local offer that includes the publishing transceiver(s)
  tracks: Array<{ mid: string; trackName: string }>;
}

export interface AudioAvailable {
  publisherSessionId: string;
  trackName: string; // e.g. "audio-main"
}

export interface AudioUnavailable {} // empty payload

// ---- Multi-publisher support ----
export interface AudioCatalogTrack {
  userId: string;
  sessionId: string;
  trackName: string;
  label?: string;
}

export interface AudioCatalog {
  tracks: AudioCatalogTrack[];
}

export interface AudioGrantMic {
  targetUserId: string;
  trackName?: string; // default "guest:<userId>"
  label?: string;     // optional UI label
}

export interface AudioRevokeMic {
  targetUserId: string;
}

export interface AudioSpeakEnable {
  trackName: string;
  label?: string;
}

export interface AudioSpeakDisable {} // empty payload

export interface AudioTracksAdded {
  added: AudioCatalogTrack[];
}

export interface AudioTracksRemoved {
  removed: Array<{ userId: string; trackName: string }>;
}

// Subscribe to one or more remote tracks on the viewer session
export interface AudioSubscribe {
  viewerSessionId: string;
  wants: Array<{ sessionId: string; trackName: string }>;
}

// Convenience: subscribe viewer to *all* tracks currently in the catalog
export interface AudioSubscribeAll {
  viewerSessionId: string;
}

// Cloudflare renegotiation dance (viewer <-> server)
export interface AudioRenegotiateOffer {
  reason: "subscribe";
  sdp: string;        // remote offer for the viewer
  sessionId: string;  // viewer session id
}

export interface AudioRenegotiateAnswer {
  sessionId: string;  // viewer session id
  sdp: string;        // viewer's local answer
}

export interface AudioSubscribed {
  sessionId: string;  // viewer session id
}
