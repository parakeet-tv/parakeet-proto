# parakeet-proto

A tiny, zero-nonsense binary protocol for streaming collaborative code edits and side channels (chat, control) over a single WebSocket.

- **Header-first**: a fixed 16-byte header lets your server route/fan-out **without decoding** payloads.
- **Yjs for code**: ship Yjs updates as raw `Uint8Array` for minimal CPU.
- **MessagePack for everything else**: compact, fast, schema-friendly.
- **Ready to extend**: header reserves `fileId` and `txnId` for multi-file and grouped edits (AI refactors).

Works in **Cloudflare Workers / Durable Objects**, browsers, Node, Bun, and Deno (ESM-only, no Node APIs).

---

## Install

```bash
npm install
```

## Why this library?

Most CPU goes to serializing/deserializing. Here, the Durable Object can route on the header alone:

- Code channel payloads are raw Yjs updates (no JSON, no parse).
- Control/Chat are MessagePack — compact and forgiving for schema evolution.
- A tiny header contains everything to multiplex channels and (later) multiple files/transactions.


## Concepts

- Channel: logical stream (CONTROL, CODE, CHAT) sharing one WebSocket.
- Message type: per-channel enums (HELLO, SNAPSHOT, DELTA, etc.).
- Header: 16 bytes describing the frame so you can route without touching the payload.
- Payload: either raw Yjs update (Uint8Array) or MessagePack-encoded object.

## Header layout (16 bytes)

```text
ver(1) | ch(1) | type(1) | flags(1) | length(4 BE) | fileId(4 BE) | txnId(4 BE)
```

- `ver`: protocol version (bump on breaking wire changes).
- `ch`: channel id (CONTROL, CODE, CHAT).
- `type`: message type within the channel.
- `flags`: bitfield; reserved for compression, acks, etc.
- `length`: payload length in bytes.
- `fileId`: reserved (0 for single active file; later use hash of path).
- `txnId`: reserved (0 for no transaction; later for AI multi-file batches).

> For "one active file now", you can keep fileId=0, txnId=0. You won’t need to change the header when you add multi-file later.

## Channels & message types

```ts
// src/enums.ts

ChannelId = { CONTROL=0, CODE=1, CHAT=2 }

ControlType = {
  HELLO=0, WELCOME=1,
  SNAPSHOT_REQUEST=2,   // ask for full state (for inactive doc)
  REPLAY_REQUEST=3,     // ask for deltas from seq
  ACK=4, ERROR=5
}

CodeType = { SNAPSHOT=0, DELTA=1 }

ChatType = { USER=0, SYSTEM=1 }
```

## Repository structure

```text
proto-streaming/
  package.json           # ESM-only; exports ./dist
  tsconfig.json          # strict TS; outputs to dist
  src/
    index.ts             # public exports
    enums.ts             # channel/type/enums, version/flags
    types.ts             # TS types for headers and payloads
    header.ts            # pack/unpack the 16B header
    frame.ts             # encodeFrame / decodeHeaderOnly / unpackMsgpack
    utils/
      hash.ts            # (optional) path -> u32 fileId (FNV-1a)
    channels/
      control.ts         # HELLO/WELCOME/REQ/ACK/ERROR encoders
      code.ts            # Yjs SNAPSHOT/DELTA encoders
      chat.ts            # user/system messages
  test/
    test.ts              # Vitest conformance tests
    vitest.config.ts     # (optional) minimal config
```

### What each file does

- `enums.ts` – canonical list of channels, message types, flags, and `PROTOCOL_VERSION`.
- `types.ts` – `Header`, `Frame`, and typed payload shapes (`CtrlHello`, `ChatUserMsg`, etc.).
- `header.ts` – packs/unpacks the 16-byte header (big-endian u32s).
- `frame.ts`
    - `encodeFrame(...)`: builds a full frame. If the payload is a `Uint8Array` (e.g., Yjs), it’s used as-is. Otherwise it MessagePacks the object.
    - `decodeHeaderOnly(...)`: returns `{ header, payloadView }` without parsing the body.
    - `unpackMsgpack(...)`: decodes a MessagePack payload (don’t use for Yjs payloads).
- `channels/control.ts` – helpers that return fully-encoded frames for control messages.
- `channels/code.ts` – Yjs helpers:
    - `encodeSnapshot(doc: Y.Doc)`
    - `encodeDelta(update: Uint8Array)`
- `channels/chat.ts` – chat helper:
    - `chat.user({ id, from, text, ts })`
- `utils/hash.ts` – stable path hashing (u32) to later populate `fileId` (unused for single-file).

## Usage

### VS Code extension (sender)

```ts
import * as Y from "yjs";
import { PROTOCOL_VERSION, Control, Code } from "@your-scope/proto-streaming";

ws.send(Control.hello({
  v: 1, protocol: PROTOCOL_VERSION, client: "vscode",
  features: ["delta"]
}));

// initial full state
ws.send(Code.encodeSnapshot(doc));

// stream deltas
doc.on("update", (u: Uint8Array) => ws.send(Code.encodeDelta(u)));
```

### Durable Object (router/fan-out)

```ts
import {
  decodeHeaderOnly, unpackMsgpack,
  ChannelId, ControlType
} from "@your-scope/proto-streaming";

ws.addEventListener("message", (evt) => {
  const bytes = new Uint8Array(evt.data as ArrayBuffer);
  const { header, payloadView } = decodeHeaderOnly(bytes);

  switch (header.channel) {
    case ChannelId.CODE: {
      // Pass-through: no decoding needed for Yjs
      broadcastToOthers(bytes);
      // Optionally: occasionally apply Y.applyUpdate(doc, payloadView)
      break;
    }
    case ChannelId.CONTROL: {
      const msg = unpackMsgpack<any>(payloadView);
      if (header.type === ControlType.SNAPSHOT_REQUEST) {
        // load/generate snapshot and respond with Code.encodeSnapshot(...)
      }
      if (header.type === ControlType.REPLAY_REQUEST) {
        // send stored deltas since msg.fromSeq
      }
      break;
    }
    case ChannelId.CHAT:
      broadcastToOthers(bytes);
      break;
  }
});
```

### Browser client (viewer)

```ts
import * as Y from "yjs";
import { decodeHeaderOnly, unpackMsgpack, ChannelId, CodeType } from "@your-scope/proto-streaming";

const doc = new Y.Doc();
ws.onmessage = (e) => {
  const { header, payloadView } = decodeHeaderOnly(new Uint8Array(e.data));
  if (header.channel === ChannelId.CODE) {
    // Yjs frames
    if (header.type === CodeType.SNAPSHOT || header.type === CodeType.DELTA) {
      Y.applyUpdate(doc, payloadView);
    }
  }
  // ... handle chat/control similarly
};
```

### Extending Later

- Multiple files: start populating `fileId` (e.g., from `utils/hash.fileIdFromPath(path)`), add `SUBSCRIBE/UNSUBSCRIBE` control messages. DO routes by `fileId` without touching payloads.
- AI multi-file edits: start assigning non-zero `txnId` for `TXN_BEGIN/COMMIT` envelopes (future addition). The header already has the slot.

## Build & Test

```sh
# build library
npm run build

# run the test suite
npm test

# during development
npm run test:watch
```

## Notes

- ESM-only. Avoid Node built-ins in library code. Works in Workers and browsers.
- `msgpackr` supports `Uint8Array` and Date efficiently.
- For performance, batch small frames client-side before sending (optional).

## Using as a dependency

1. Tag the release: `git tag v0.1.0`
2. Push the tag: `git push --tags`
3. Point consumers at the tag: `"parakeet-proto": "git+ssh://git@github.com/benank/parakeet-proto.git#v0.1.0"`
4. Install latest version in consumers with `npm i`