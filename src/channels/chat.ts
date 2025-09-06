import { ChannelId, ChatType } from "../enums.js";
import type { ChatUserMsg } from "../types.js";
import { encodeFrame } from "../frame.js";

export const chat = {
  user: (p: ChatUserMsg) =>
    encodeFrame(
      {
        channel: ChannelId.CHAT,
        type: ChatType.USER,
        flags: 0,
        fileId: 0,
        txnId: 0,
      },
      p
    ),
} as const;
