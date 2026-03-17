/**
 * Format profile and search results into readable context strings.
 * Adapted from claude-supermemory for the Gemini CLI extension.
 */

function formatRelativeTime(isoTimestamp) {
  try {
    const dt = new Date(isoTimestamp);
    const now = new Date();
    const seconds = (now.getTime() - dt.getTime()) / 1000;
    const minutes = seconds / 60;
    const hours = seconds / 3600;
    const days = seconds / 86400;

    if (minutes < 30) return "just now";
    if (minutes < 60) return `${Math.floor(minutes)}mins ago`;
    if (hours < 24) return `${Math.floor(hours)}hrs ago`;
    if (days < 7) return `${Math.floor(days)}d ago`;

    const month = dt.toLocaleString("en", { month: "short" });
    if (dt.getFullYear() === now.getFullYear()) {
      return `${dt.getDate()} ${month}`;
    }
    return `${dt.getDate()} ${month}, ${dt.getFullYear()}`;
  } catch {
    return "";
  }
}

export function formatProfileContext(profileResult, maxItems = 5) {
  if (!profileResult) return null;

  const statics = (profileResult.profile?.static || []).slice(0, maxItems);
  const dynamics = (profileResult.profile?.dynamic || []).slice(0, maxItems);
  const search = (profileResult.searchResults?.results || []).slice(0, maxItems);

  if (!statics.length && !dynamics.length && !search.length) return null;

  const sections = [];

  if (statics.length) {
    sections.push(
      `**Persistent Facts**\n${statics.map((f) => `- ${f}`).join("\n")}`
    );
  }

  if (dynamics.length) {
    sections.push(
      `**Recent Context**\n${dynamics.map((f) => `- ${f}`).join("\n")}`
    );
  }

  if (search.length) {
    const lines = search.map((r) => {
      const text = r.text ?? r.memory ?? "";
      const timeStr = r.updatedAt ? formatRelativeTime(r.updatedAt) : "";
      const pct =
        r.similarity != null ? `[${Math.round(r.similarity * 100)}%]` : "";
      const prefix = timeStr ? `[${timeStr}] ` : "";
      return `- ${prefix}${text} ${pct}`.trim();
    });
    sections.push(`**Relevant Memories**\n${lines.join("\n")}`);
  }

  return sections.join("\n\n");
}

export function combineContextSections(sections) {
  const valid = sections.filter((s) => s.content);
  if (!valid.length) return null;

  const body = valid
    .map((s) => (s.label ? `### ${s.label}\n\n${s.content}` : s.content))
    .join("\n\n---\n\n");

  return [
    "<supermemory-context>",
    "The following is recalled context. Reference it only when relevant.",
    "",
    body,
    "",
    "Use these memories naturally when relevant but don't force them into every response.",
    "</supermemory-context>",
  ].join("\n");
}

export function formatSearchResults(results, label) {
  if (!results?.length) return `No ${label} memories found.`;
  return results
    .map((r) => {
      const text = r.text ?? r.memory ?? "";
      const timeStr = r.updatedAt ? formatRelativeTime(r.updatedAt) : "";
      const pct =
        r.similarity != null ? ` [${Math.round(r.similarity * 100)}%]` : "";
      const prefix = timeStr ? `[${timeStr}] ` : "";
      return `- ${prefix}${text}${pct}`;
    })
    .join("\n");
}
