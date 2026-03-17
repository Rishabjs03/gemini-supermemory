import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


import { SupermemoryClient } from "./lib/supermemory-client.js";
import { getContainerContext } from "./lib/container-tag.js";
import { getFriendlyError } from "./lib/error-helper.js";
import { formatSearchResults } from "./lib/format-context.js";

const PERSONAL_ENTITY_CONTEXT = `Developer coding session. Focus on USER intent.

EXTRACT:
- Actions: "built auth flow with JWT", "fixed memory leak in useEffect"
- Preferences: "prefers Tailwind over CSS modules"
- Decisions: "chose SQLite for local storage"
- Learnings: "learned about React Server Components"

SKIP:
- Every fact assistant mentions (condense to user's action)
- Generic assistant explanations user didn't confirm/use`;

const REPO_ENTITY_CONTEXT = `Project/codebase knowledge for team sharing.

EXTRACT:
- Architecture: "uses monorepo with turborepo", "API in /apps/api"
- Conventions: "components in PascalCase", "hooks prefixed with use"
- Patterns: "all API routes use withAuth wrapper"
- Setup: "requires .env with DATABASE_URL", "run pnpm db:migrate first"
- Decisions: "chose Drizzle over Prisma for performance"`;

function getClient() {
    return new SupermemoryClient({
        apiKey: process.env.SUPERMEMORY_API_KEY,
    })
}

function ctx() {
    return getContainerContext(process.cwd());
}



const server = new McpServer({
    name: "supermemory",
    version: "1.0.0",
});

server.registerTool(
    "search_memory",
    {
        description:
            "Search your past memories and coding sessions. Use when the user asks about past work, previous sessions, or at the start of a session to load context.",
        inputSchema: {
            query: z.string().describe("What to search for"),
            scope: z
                .enum(["user", "repo", "both"])
                .default("both")
                .describe("Search personal memories, project/team memories, or both"),
        },
    },
    async ({ query, scope }) => {
        try {
            const client = getClient();
            const { personalTag, repoTag, projectName } = ctx();
            let output = `Project: ${projectName}\n\n`;
            if (scope === "both" || scope === "user") {
                const personal = await client.search(query, {
                    containerTag: personalTag,
                    limit: 5,
                });
                output += `### Personal Memories\n${formatSearchResults(personal.results, "personal")}\n\n`;
            }
            if (scope === "both" || scope === "repo") {
                const repo = await client.search(query, {
                    containerTag: repoTag,
                    limit: 5,
                });
                output += `### Project Memories\n${formatSearchResults(repo.results, "project")}\n`;
            }
            return { content: [{ type: "text", text: output }] };
        } catch (err) {
            return {
                content: [{ type: "text", text: `Error: ${getFriendlyError(err)}` }],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "add_memory",
    {
        description:
            "Save something important to your personal memory. Use when the user wants to remember a decision, preference, learning, or fix.",
        inputSchema: {
            content: z.string().describe("The memory content to save"),
        },
    },
    async ({ content }) => {
        try {
            const client = getClient();
            const { personalTag, projectName } = ctx();
            const result = await client.addMemory(content, {
                containerTag: personalTag,
                metadata: {
                    type: "manual",
                    project: projectName,
                    timestamp: new Date().toISOString(),
                },
                entityContext: PERSONAL_ENTITY_CONTEXT,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Memory saved to project: ${projectName}\nID: ${result.id}`,
                    },
                ],
            };
        } catch (err) {
            return {
                content: [{ type: "text", text: `Error: ${getFriendlyError(err)}` }],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "save_project_memory",
    {
        description:
            "Save project knowledge that should be shared across the team. Use for architecture decisions, conventions, setup instructions.",
        inputSchema: {
            content: z.string().describe("The project knowledge to save"),
        },
    },
    async ({ content }) => {
        try {
            const client = getClient();
            const { repoTag, projectName } = ctx();
            const result = await client.addMemory(content, {
                containerTag: repoTag,
                metadata: {
                    type: "project-knowledge",
                    project: projectName,
                    timestamp: new Date().toISOString(),
                },
                entityContext: REPO_ENTITY_CONTEXT,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Project knowledge saved: ${projectName}\nID: ${result.id}`,
                    },
                ],
            };
        } catch (err) {
            return {
                content: [{ type: "text", text: `Error: ${getFriendlyError(err)}` }],
                isError: true,
            };
        }
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);