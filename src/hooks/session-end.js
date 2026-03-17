#!/usr/bin/env node

/**
 * SessionEnd hook — auto-saves a session summary to Supermemory
 * when the Gemini CLI session ends.
 *
 * Reads: stdin JSON (session metadata from Gemini CLI)
 * Writes: stdout JSON (empty — advisory hook)
 * Env: SUPERMEMORY_API_KEY, GEMINI_CWD, GEMINI_SESSION_ID
 */

import { SupermemoryClient } from "../lib/supermemory-client.js";
import { getContainerContext } from "../lib/container-tag.js";
import { getFriendlyError } from "../lib/error-helper.js";

const PERSONAL_ENTITY_CONTEXT = `Developer coding session. Focus on USER intent.

EXTRACT:
- Actions: "built auth flow with JWT", "fixed memory leak in useEffect"
- Preferences: "prefers Tailwind over CSS modules"
- Decisions: "chose SQLite for local storage"
- Learnings: "learned about React Server Components"

SKIP:
- Every fact assistant mentions (condense to user's action)
- Generic assistant explanations user didn't confirm/use`;

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      try {
        resolve(data.trim() ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    process.stdin.on("error", () => resolve({}));
    if (process.stdin.isTTY) resolve({});
  });
}

function output(json) {
  process.stdout.write(JSON.stringify(json));
}

async function main() {
  try {
    const input = await readStdin();

    const apiKey = process.env.SUPERMEMORY_API_KEY;
    if (!apiKey) {
      output({});
      return;
    }

    const sessionId = process.env.GEMINI_SESSION_ID || input.session_id;
    if (!sessionId) {
      output({});
      return;
    }

    const cwd = process.env.GEMINI_CWD || process.cwd();
    const { personalTag, projectName } = getContainerContext(cwd);

    // Build a summary from whatever session data is available
    const parts = [];
    parts.push(`Session in project: ${projectName}`);
    parts.push(`Session ID: ${sessionId}`);
    parts.push(`Timestamp: ${new Date().toISOString()}`);

    if (input.summary) {
      parts.push(`\nSummary:\n${input.summary}`);
    }
    if (input.transcript) {
      // If Gemini CLI provides transcript text, include it
      const trimmed =
        input.transcript.length > 50000
          ? input.transcript.slice(-50000)
          : input.transcript;
      parts.push(`\nTranscript:\n${trimmed}`);
    }

    const content = parts.join("\n");

    const client = new SupermemoryClient({ apiKey });

    await client.addMemory(content, {
      containerTag: personalTag,
      metadata: {
        type: "session_summary",
        project: projectName,
        sessionId,
        timestamp: new Date().toISOString(),
      },
      customId: `session_${sessionId}`,
      entityContext: PERSONAL_ENTITY_CONTEXT,
    });

    console.error(`Supermemory: Session saved for ${projectName}`);
    output({});
  } catch (err) {
    console.error(`Supermemory: ${getFriendlyError(err)}`);
    output({});
  }
}

main();
