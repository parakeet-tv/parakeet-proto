import { ChannelId, ControlType } from "../enums.js";
import type {
  CtrlAck,
  CtrlError,
  CtrlHello,
  CtrlReplayRequest,
  CtrlSnapshotRequest,
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
} as const;
