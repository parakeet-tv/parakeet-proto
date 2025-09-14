import { ChannelId, ControlType } from "../enums.js";
import type {
  CtrlAck,
  CtrlError,
  CtrlHello,
  CtrlReplayRequest,
  CtrlSnapshotRequest,
  CtrlStreamStatus,
  CtrlUpdateMetadata,
  CtrlWelcome,
} from "../types.js";
import { encodeFrame } from "../frame.js";

// ---- Encoders (MessagePack payloads) ----

export const control = {
  hello: (p: CtrlHello) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.HELLO,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      p
    ),

  welcome: (p: CtrlWelcome) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.WELCOME,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      p
    ),

  snapshotRequest: (p: CtrlSnapshotRequest, fileId = 0) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.SNAPSHOT_REQUEST,
        flags: 0,
        fileId,
        txnId: 0,
      },
      p
    ),

  replayRequest: (p: CtrlReplayRequest, fileId = 0) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.REPLAY_REQUEST,
        flags: 0,
        fileId,
        txnId: 0,
      },
      { ...p, fileId }
    ),

  ack: (p: CtrlAck) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.ACK,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      p
    ),

  error: (p: CtrlError) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.ERROR,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      p
    ),
  fileInfo: (p: { fileId: number; path: string; displayName?: string }) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.FILE_INFO,
        flags: 0,
        fileId: p.fileId >>> 0,
        txnId: 0,
      },
      p
    ),
  cursor: (
    p: {
      cursors: Array<{
        anchor: { line: number; ch: number };
        head: { line: number; ch: number };
      }>;
    },
    fileId = 0
  ) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.CURSOR,
        flags: 0,
        fileId: fileId >>> 0,
        txnId: 0,
      },
      p
    ),

  /** Highlight ranges for a file (e.g., VS Code document highlights). */
  highlights: (
    p: {
      ranges: Array<{
        sl: number;
        sc: number;
        el: number;
        ec: number;
        kind?: number; // VS Code DocumentHighlightKind (0:text,1:read,2:write)
      }>;
    },
    fileId = 0
  ) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.HIGHLIGHTS,
        flags: 0,
        fileId: fileId >>> 0,
        txnId: 0,
      },
      p
    ),
  viewerCount: (p: { count: number }, fileId = 0) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.VIEWER_COUNT,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      p
    ),
  startStream: () =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.START_STREAM,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      {}
    ),
  stopStream: () =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.STOP_STREAM,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      {}
    ),
  streamStatus: (p: CtrlStreamStatus) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.STREAM_STATUS,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      p
    ),
  updateMetadata: (p: CtrlUpdateMetadata) =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.UPDATE_METADATA,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      p
    ),
  broadcaster: () =>
    encodeFrame(
      {
        channel: ChannelId.CONTROL,
        type: ControlType.BROADCASTER,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      {}
    ),
} as const;
