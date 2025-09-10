// channels/terminal.ts
import { encodeFrame } from "../frame.js";
import { ChannelId, Flags, TerminalType } from "../enums.js";
import type {
  TerminalId,
  TerminalOpen,
  TerminalClose,
  TerminalOutput,
  TerminalInput,
  TerminalResize,
  TerminalTitle,
  TerminalState,
  TerminalExecStart,
  TerminalExecEnd,
  TerminalSnapshot,
} from "../types.js";
import { pack as mpack } from "msgpackr";

/** Helper to build a TERMINAL frame with MessagePack payload. */
function mp(
  type: TerminalType,
  payload: object | Uint8Array,
  fileId: TerminalId | 0,
  flags: number = Flags.NONE,
  txnId: number = 0
) {
  return encodeFrame(
    {
      channel: ChannelId.TERMINAL,
      type,
      flags,
      fileId,
      txnId,
    },
    payload
  );
}

/** OPEN — terminal created. fileId MUST be terminalId. */
export function encodeTerminalOpen(meta: TerminalOpen) {
  return mp(TerminalType.OPEN, meta, meta.id);
}

/** CLOSE — terminal disposed (send remove event). fileId MUST be terminalId. */
export function encodeTerminalClose(terminalId: TerminalId, payload: TerminalClose) {
  return mp(TerminalType.CLOSE, payload, terminalId);
}

/** OUTPUT — stream a chunk of output (stdout/stderr). fileId MUST be terminalId. */
export function encodeTerminalOutput(
  terminalId: TerminalId,
  payload: TerminalOutput,
  opts?: { compressed?: boolean; ack?: boolean; txnId?: number }
) {
  const flags =
    (opts?.compressed ? Flags.COMPRESSED : 0) |
    (opts?.ack ? Flags.ACK_REQUIRED : 0);
  return mp(TerminalType.OUTPUT, payload, terminalId, flags, opts?.txnId ?? 0);
}

/** INPUT — text sent to the terminal (optional echo). fileId MUST be terminalId. */
export function encodeTerminalInput(
  terminalId: TerminalId,
  payload: TerminalInput,
  opts?: { ack?: boolean; txnId?: number }
) {
  const flags = opts?.ack ? Flags.ACK_REQUIRED : 0;
  return mp(TerminalType.INPUT, payload, terminalId, flags, opts?.txnId ?? 0);
}

/** RESIZE — terminal resized. fileId MUST be terminalId. */
export function encodeTerminalResize(terminalId: TerminalId, payload: TerminalResize) {
  return mp(TerminalType.RESIZE, payload, terminalId);
}

/** TITLE — terminal title/name changed. fileId MUST be terminalId. */
export function encodeTerminalTitle(terminalId: TerminalId, payload: TerminalTitle) {
  return mp(TerminalType.TITLE, payload, terminalId);
}

/** STATE — focus/cwd/integration flipped. fileId MUST be terminalId. */
export function encodeTerminalState(terminalId: TerminalId, payload: TerminalState) {
  return mp(TerminalType.STATE, payload, terminalId);
}

/** EXEC_START — optional, useful for grouping output via txnId. */
export function encodeTerminalExecStart(
  terminalId: TerminalId,
  payload: TerminalExecStart,
  opts?: { txnId?: number }
) {
  return mp(TerminalType.EXEC_START, payload, terminalId, Flags.NONE, opts?.txnId ?? 0);
}

/** EXEC_END — optional, pairs with EXEC_START. */
export function encodeTerminalExecEnd(
  terminalId: TerminalId,
  payload: TerminalExecEnd,
  opts?: { txnId?: number }
) {
  return mp(TerminalType.EXEC_END, payload, terminalId, Flags.NONE, opts?.txnId ?? 0);
}

/**
 * SNAPSHOT — broadcast the current set of terminals.
 * fileId MUST be 0 (not per-terminal).
 */
export function encodeTerminalSnapshot(snapshot: TerminalSnapshot) {
  return mp(TerminalType.SNAPSHOT, snapshot, 0);
}
