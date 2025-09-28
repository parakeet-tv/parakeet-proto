import { ChannelId, AudioType } from "../enums.js";
import type {
  AudioStartIntent,
  AudioWebrtcOffer,
  AudioWebrtcAnswer,
  AudioTracksPublish,
  AudioAvailable,
  AudioUnavailable,
  AudioCatalog,
  AudioGrantMic,
  AudioRevokeMic,
  AudioSpeakEnable,
  AudioSpeakDisable,
  AudioTracksAdded,
  AudioTracksRemoved,
  AudioSubscribe,
  AudioSubscribeAll,
  AudioRenegotiateOffer,
  AudioRenegotiateAnswer,
  AudioSubscribed,
} from "../types.js";
import { encodeFrame } from "../frame.js";

// ---- Encoders (MessagePack payloads) ----
// Note: audio channel uses fileId=0 and txnId=0 (not file-scoped)

export const audio = {
  // ---- Single/primary publisher flow ----
  startIntent: (p: AudioStartIntent = {}) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.START_INTENT,
      },
      p
    ),

  webrtcOffer: (p: AudioWebrtcOffer) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.WEBRTC_OFFER,
      },
      p
    ),

  webrtcAnswer: (p: AudioWebrtcAnswer) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.WEBRTC_ANSWER,
      },
      p
    ),

  tracksPublish: (p: AudioTracksPublish) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.TRACKS_PUBLISH,

      },
      p
    ),

  available: (p: AudioAvailable) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.AVAILABLE,
      },
      p
    ),

  unavailable: (p: AudioUnavailable = {}) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.UNAVAILABLE,
      },
      p
    ),

  // ---- Multi-publisher catalog & permissions ----
  catalog: (p: AudioCatalog) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.CATALOG,
      },
      p
    ),

  grantMic: (p: AudioGrantMic) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.GRANT_MIC,
      },
      p
    ),

  revokeMic: (p: AudioRevokeMic) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.REVOKE_MIC,
      },
      p
    ),

  speakEnable: (p: AudioSpeakEnable) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.SPEAK_ENABLE,
      },
      p
    ),

  speakDisable: (p: AudioSpeakDisable = {}) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.SPEAK_DISABLE,
      },
      p
    ),

  tracksAdded: (p: AudioTracksAdded) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.TRACKS_ADDED,
      },
      p
    ),

  tracksRemoved: (p: AudioTracksRemoved) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.TRACKS_REMOVED,
      },
      p
    ),

  // ---- Subscription & renegotiation ----
  subscribe: (p: AudioSubscribe) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.SUBSCRIBE,
      },
      p
    ),

  subscribeAll: (p: AudioSubscribeAll) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.SUBSCRIBE_ALL,
      },
      p
    ),

  renegotiateOffer: (p: AudioRenegotiateOffer) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.RENEGOTIATE_OFFER,
      },
      p
    ),

  renegotiateAnswer: (p: AudioRenegotiateAnswer) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.RENEGOTIATE_ANSWER,
      },
      p
    ),

  subscribed: (p: AudioSubscribed) =>
    encodeFrame(
      {
        channel: ChannelId.AUDIO,
        type: AudioType.SUBSCRIBED,
      },
      p
    ),
} as const;
