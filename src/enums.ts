export const PROTOCOL_VERSION = 1 as const;

export enum ChannelId {
  CONTROL = 0,
  CODE = 1,
  CHAT = 2,
  TERMINAL = 3,
  AUDIO = 4,
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
  START_STREAM = 10,
  UPDATE_METADATA = 11,
  BROADCASTER = 12,
  STOP_STREAM = 13,
  STREAM_STATUS = 14,
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

// Terminal messages
export enum TerminalType {
  OPEN = 0,        // terminal created
  CLOSE = 1,       // terminal disposed
  OUTPUT = 2,      // stdout/stderr chunk(s)
  INPUT = 3,       // text sent to the terminal
  RESIZE = 4,      // rows/cols changed
  TITLE = 5,       // name/title changed
  STATE = 6,       // focus/active/cwd/shell-integration changes
  SNAPSHOT = 7,    // current set of open terminals (+ optional scrollback)
  EXEC_START = 8,  // (optional) shell execution started
  EXEC_END = 9,    // (optional) shell execution ended
}

// Flags
export enum Flags {
  NONE = 0,
  COMPRESSED = 1 << 0,
  ACK_REQUIRED = 1 << 1,
}

// Audio messages
export enum AudioType {
  START_INTENT = 0,          // broadcaster -> server
  WEBRTC_OFFER = 1,          // any -> server
  WEBRTC_ANSWER = 2,         // server -> any

  TRACKS_PUBLISH = 3,        // publisher -> server
  AVAILABLE = 4,             // server -> all
  UNAVAILABLE = 5,           // server -> all

  // multi-publisher
  CATALOG = 6,               // server -> all
  GRANT_MIC = 7,             // host -> server
  REVOKE_MIC = 8,            // host -> server
  SPEAK_ENABLE = 9,          // server -> target user
  SPEAK_DISABLE = 10,        // server -> target user
  TRACKS_ADDED = 11,         // server -> all
  TRACKS_REMOVED = 12,       // server -> all

  SUBSCRIBE = 13,            // viewer -> server
  SUBSCRIBE_ALL = 14,        // viewer -> server
  RENEGOTIATE_OFFER = 15,    // server -> viewer
  RENEGOTIATE_ANSWER = 16,   // viewer -> server
  SUBSCRIBED = 17,           // server -> viewer (ack)
}
