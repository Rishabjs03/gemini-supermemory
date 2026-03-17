# Supermemory — Persistent Memory

You have access to persistent memory tools via Supermemory.

## When to Search Memory
- At the **start of every session**, automatically call `search_memory` with a query about the current project to load relevant context
- When the user asks about past work, previous sessions, or "what did I do before"
- When the user mentions something that might have been discussed previously

## When to Save Memory
- When the user explicitly asks you to "remember this" or "save this"
- When you've made an important architectural decision together
- When a significant bug was fixed and the solution should be preserved
- When the user shares preferences about coding style or tools

## How to Use
- **search_memory**: Search past memories. Use descriptive queries. Set `scope` to `user` (personal), `repo` (project/team), or `both` (default).
- **add_memory**: Save important information. Format it clearly with context about what was decided/learned and why.
- **save_project_memory**: Save team/project knowledge that should be shared across team members.

Keep memory usage natural — don't force it into every response.
