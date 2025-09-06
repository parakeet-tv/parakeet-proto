export const PROTOCOL_VERSION = 1 as const;

export enum ChannelId {
  CONTROL = 0,
  CODE = 1,
  CHAT = 2,
}

// Control messages
export enum ControlType {
  HELLO = 0,
  WELCOME = 1,
  SNAPSHOT_REQUEST = 2, // request full state for a (possibly inactive) file
  REPLAY_REQUEST = 3, // request deltas from seq (active or inactive)
  ACK = 4,
  ERROR = 5,
  FILE_INFO = 6,
  CURSOR = 7,
  HIGHLIGHTS = 8,
  VIEWER_COUNT = 9,
}

// Code update messages
export enum CodeType {
  SNAPSHOT = 0, // Yjs encoded state as update
  DELTA = 1, // Yjs update
}

// Chat messages
export enum ChatType {
  USER = 0,
  SYSTEM = 1,
}

// Flags
export enum Flags {
  NONE = 0,
  COMPRESSED = 1 << 0,
  ACK_REQUIRED = 1 << 1,
}
