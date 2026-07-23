/**
 * Shared file logger for agent-canvas dev scripts.
 *
 * Writes log output to a daily-rotating file under
 * <state-dir>/logs/agent-canvas.YYYY-MM-DD.log (7-day retention) alongside
 * the existing console output (which is unchanged).
 *
 * rotating-file-stream is loaded dynamically and treated as optional: when it
 * isn't resolvable — most importantly inside the packaged Electron desktop app,
 * whose `afterPack` hook strips `Resources/app/node_modules/` — `fileLog`
 * becomes a no-op and console logging continues to work unchanged. See
 * AGENTS.md "Electron desktop packaging" for the strip-hook details.
 */

import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

// Mirror the state-directory logic from dev-safe.mjs so log files live
// alongside all other agent-canvas runtime state (e.g. ~/.openhands/agent-canvas).
// The same env var (OH_CANVAS_SAFE_STATE_DIR) overrides both.
const stateDir =
  process.env.OH_CANVAS_SAFE_STATE_DIR ||
  join(homedir(), ".openhands", "agent-canvas");
const logDir = join(stateDir, "logs");

// Matches any ANSI CSI escape sequence (colors, cursor movement, etc.).
const ANSI_RE = /\x1b\[[0-9;]*m/g;

/**
 * Remove ANSI escape codes so log files contain clean plain text.
 * @param {string} str
 * @returns {string}
 */
export function stripAnsi(str) {
  return typeof str === "string" ? str.replace(ANSI_RE, "") : String(str);
}

/**
 * Attempt to construct a rotating file logger. Returns `null` when
 * rotating-file-stream isn't installed (packaged desktop app) or any setup
 * step fails; `fileLog` then degrades to a no-op.
 *
 * @returns {Promise<((level: string, message: string) => void) | null>}
 */
async function createFileLogger() {
  let rotatingFileStream;
  try {
    rotatingFileStream = await import("rotating-file-stream");
  } catch {
    return null;
  }

  try {
    mkdirSync(logDir, { recursive: true });

    const pad = (num) => (num > 9 ? "" : "0") + num;

    const fileStream = rotatingFileStream.createStream(
      (time) => {
        if (!time) return "agent-canvas.log";
        const year = time.getFullYear();
        const month = pad(time.getMonth() + 1);
        const day = pad(time.getDate());
        return `agent-canvas.${year}-${month}-${day}.log`;
      },
      {
        path: logDir,
        interval: "1d",
        size: "10M",
      },
    );

    // Swallow any transport-level errors (e.g. disk full) so a logging
    // failure never crashes the dev server.
    fileStream.on("error", () => {});

    return (level, message) => {
      const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
      const line = `${timestamp} [${level.toUpperCase().padEnd(5)}] ${stripAnsi(message)}\n`;
      fileStream.write(line);
    };
  } catch {
    return null;
  }
}

const fileLogger = await createFileLogger();

/**
 * Write a message to the rotating log file. No-ops when rotating-file-stream
 * isn't available (e.g. the packaged desktop app). ANSI escape codes are
 * stripped automatically; console output is unaffected.
 *
 * @param {'info' | 'warn' | 'error' | 'debug'} level
 * @param {string} message
 */
export function fileLog(level, message) {
  if (!fileLogger) return;
  fileLogger(level, message);
}
