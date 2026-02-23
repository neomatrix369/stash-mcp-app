# Stash MCP App — 45-Minute Quickstart

> Build an MCP app with bidirectional AI-UI sync in 45 minutes. Zero external dependencies.

---

## Staged Build Approach

| Stage | Time | What You Build |
|-------|------|----------------|
| **Stage 1** (This guide) | 45 min | In-memory store, 5 tools, 2 widgets, all 9 core patterns |
| **Stage 2** (Optional) | +45 min | Supabase integration, Realtime, real title fetching |
| **Stage 3** (Optional) | +60 min | Clerk auth, RLS, rate limiting, browser import |

**Start with Stage 1. Add complexity only when needed.**

---

## Prerequisites

- Node.js 22+ (`nvm use 22`)
- npm/pnpm/yarn/bun

**That's it. No Supabase. No Clerk. No env vars.**

---

## Stage 1: Hackathon Demo (45 min)

### Step 1: Bootstrap (5 min)

```bash
mkdir stash-mcp-app && cd stash-mcp-app
npm create skybridge@latest .
npm install
```

**What this creates:**
```
stash-mcp-app/
├── server/src/
│   ├── index.ts        # HTTP server entry
│   └── server.ts       # MCP server (edit this!)
├── web/src/
│   ├── widgets/        # Widget components (filename = widget name)
│   ├── index.css       # Global styles
│   └── helpers.ts      # Type-safe hooks
└── package.json
```

---

### Step 2: Server Implementation (20 min)

**Replace `server/src/server.ts` with:**

```typescript
import { McpServer } from "skybridge/server";
import { z } from "zod";

// ============================================================
// IN-MEMORY STORE (no database needed for Stage 1)
// ============================================================

interface StashLink {
  id: string;
  url: string;
  title: string;
  tags: string[];
  status: "active" | "archived";
  due_date: string | null;
  created_at: string;
}

const store = new Map<string, StashLink>();

// Pre-seed demo data
const demoLinks: StashLink[] = [
  { id: "1", url: "https://docs.skybridge.tech", title: "Skybridge Documentation", tags: ["documentation", "mcp"], status: "active", due_date: null, created_at: new Date().toISOString() },
  { id: "2", url: "https://alpic.dev", title: "Alpic Platform", tags: ["deployment", "cloud"], status: "active", due_date: null, created_at: new Date().toISOString() },
  { id: "3", url: "https://github.com/anthropics/claude-code", title: "Claude Code", tags: ["ai", "development"], status: "active", due_date: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString() },
  { id: "4", url: "https://supabase.com/docs", title: "Supabase Docs", tags: ["documentation", "database"], status: "active", due_date: null, created_at: new Date().toISOString() },
];
demoLinks.forEach(link => store.set(link.id, link));

// ============================================================
// MCP SERVER
// ============================================================

const server = new McpServer(
  { name: "stash", version: "1.0.0" },
  { capabilities: {} }
)

  // ──────────────────────────────────────────────────────────
  // WIDGET: Main Stash Board
  // ──────────────────────────────────────────────────────────
  .registerWidget(
    "stash-board",
    { description: "Your AI-powered link manager" },
    {
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false }
    },
    async () => {
      const links = Array.from(store.values());
      const active = links.filter(l => l.status === "active");
      const archived = links.filter(l => l.status === "archived");
      const dueSoon = active.filter(l => l.due_date && new Date(l.due_date) < new Date(Date.now() + 7 * 86400000));

      return {
        structuredContent: {
          links,
          stats: { total: links.length, active: active.length, archived: archived.length, dueSoon: dueSoon.length }
        },
        content: [{ type: "text", text: `Stash Board: ${active.length} active, ${archived.length} archived, ${dueSoon.length} due soon` }]
      };
    }
  )

  // ──────────────────────────────────────────────────────────
  // WIDGET: System Status (Health Dashboard)
  // ──────────────────────────────────────────────────────────
  .registerWidget(
    "stash-status",
    { description: "Health dashboard showing system status" },
    {
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false }
    },
    async () => {
      return {
        structuredContent: {
          store: { status: "healthy", items: store.size },
          memory: { used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB" },
          uptime: Math.round(process.uptime()) + "s"
        },
        content: [{ type: "text", text: `System healthy. Store: ${store.size} items. Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB` }]
      };
    }
  )

  // ──────────────────────────────────────────────────────────
  // TOOL: Add Link
  // ──────────────────────────────────────────────────────────
  .registerTool(
    "add-link",
    {
      description: "Add a new link to your stash",
      inputSchema: {
        url: z.string().url().describe("The URL to save"),
        title: z.string().optional().describe("Optional title (auto-generated if not provided)"),
        tags: z.array(z.string()).optional().default([]).describe("Tags for categorization"),
        due_date: z.string().optional().describe("Optional deadline (ISO date)")
      },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false }
    },
    async ({ url, title, tags, due_date }) => {
      const id = crypto.randomUUID();
      const link: StashLink = {
        id,
        url,
        title: title || `Link: ${new URL(url).hostname}`,
        tags: tags || [],
        status: "active",
        due_date: due_date || null,
        created_at: new Date().toISOString()
      };
      store.set(id, link);

      return {
        structuredContent: { link },
        content: [{ type: "text", text: `✓ Added "${link.title}" to your stash` }]
      };
    }
  )

  // ──────────────────────────────────────────────────────────
  // TOOL: Update Link
  // ──────────────────────────────────────────────────────────
  .registerTool(
    "update-link",
    {
      description: "Update an existing link (change title, tags, status, or due date)",
      inputSchema: {
        id: z.string().describe("Link ID to update"),
        title: z.string().optional().describe("New title"),
        tags: z.array(z.string()).optional().describe("New tags"),
        status: z.enum(["active", "archived"]).optional().describe("New status"),
        due_date: z.string().nullable().optional().describe("New due date (ISO) or null to remove")
      },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false }
    },
    async ({ id, ...updates }) => {
      const link = store.get(id);
      if (!link) {
        return {
          structuredContent: { error: "not_found" },
          content: [{ type: "text", text: `✗ Link not found: ${id}` }]
        };
      }

      const updated: StashLink = { ...link };
      if (updates.title !== undefined) updated.title = updates.title;
      if (updates.tags !== undefined) updated.tags = updates.tags;
      if (updates.status !== undefined) updated.status = updates.status;
      if (updates.due_date !== undefined) updated.due_date = updates.due_date;

      store.set(id, updated);

      return {
        structuredContent: { link: updated },
        content: [{ type: "text", text: `✓ Updated "${updated.title}"` }]
      };
    }
  )

  // ──────────────────────────────────────────────────────────
  // TOOL: Delete Link
  // ──────────────────────────────────────────────────────────
  .registerTool(
    "delete-link",
    {
      description: "Delete a link from your stash",
      inputSchema: {
        id: z.string().describe("Link ID to delete")
      },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true }
    },
    async ({ id }) => {
      const link = store.get(id);
      if (!link) {
        return {
          structuredContent: { error: "not_found" },
          content: [{ type: "text", text: `✗ Link not found: ${id}` }]
        };
      }
      store.delete(id);

      return {
        structuredContent: { deleted: id },
        content: [{ type: "text", text: `✓ Deleted "${link.title}"` }]
      };
    }
  )

  // ──────────────────────────────────────────────────────────
  // TOOL: Bulk Update
  // ──────────────────────────────────────────────────────────
  .registerTool(
    "bulk-update",
    {
      description: "Update multiple links at once (archive, add tags, etc.)",
      inputSchema: {
        ids: z.array(z.string()).max(100).describe("Link IDs to update"),
        updates: z.object({
          status: z.enum(["active", "archived"]).optional(),
          tags: z.array(z.string()).optional()
        }).describe("Updates to apply")
      },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false }
    },
    async ({ ids, updates }) => {
      let updated = 0;
      for (const id of ids) {
        const link = store.get(id);
        if (link) {
          if (updates.status !== undefined) link.status = updates.status;
          if (updates.tags !== undefined) link.tags = updates.tags;
          store.set(id, link);
          updated++;
        }
      }

      return {
        structuredContent: { updated, total: ids.length },
        content: [{ type: "text", text: `✓ Updated ${updated} of ${ids.length} links` }]
      };
    }
  )

  // ──────────────────────────────────────────────────────────
  // TOOL: Import Links
  // ──────────────────────────────────────────────────────────
  .registerTool(
    "import-links",
    {
      description: "Bulk import links from JSON array",
      inputSchema: {
        links: z.array(z.object({
          url: z.string().url(),
          title: z.string().optional(),
          tags: z.array(z.string()).optional()
        })).max(100).describe("Links to import")
      },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false }
    },
    async ({ links }) => {
      let imported = 0;
      for (const item of links) {
        const id = crypto.randomUUID();
        store.set(id, {
          id,
          url: item.url,
          title: item.title || `Link: ${new URL(item.url).hostname}`,
          tags: item.tags || [],
          status: "active",
          due_date: null,
          created_at: new Date().toISOString()
        });
        imported++;
      }

      return {
        structuredContent: { imported },
        content: [{ type: "text", text: `✓ Imported ${imported} links` }]
      };
    }
  );

// ============================================================
// EXPORTS
// ============================================================

export default server;
export type AppType = typeof server;
```

---

### Step 3: Type-Safe Helpers (2 min)

**Replace `web/src/helpers.ts` with:**

```typescript
import { generateHelpers } from "skybridge/web";
import type { AppType } from "../../server/src/server";

export const { useToolInfo, useCallTool } = generateHelpers<AppType>();
```

---

### Step 4: Main Widget - stash-board (10 min)

**Create `web/src/widgets/stash-board.tsx`:**

> ⚠️ **IMPORTANT:** Filename MUST be `stash-board.tsx` (kebab-case matching widget registration name)

```tsx
import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers";

function StashBoard() {
  // Get widget data from server
  const { output, isPending } = useToolInfo<"stash-board">();

  // Tool for deleting links
  const { callTool: deleteLink, isPending: isDeleting } = useCallTool("delete-link");

  // Tool for updating links
  const { callTool: updateLink } = useCallTool("update-link");

  if (isPending) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse">Loading your stash...</div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="p-6 text-center text-red-500">
        No data available
      </div>
    );
  }

  const { links, stats } = output;

  return (
    <div
      className="p-4 space-y-4 max-w-2xl mx-auto"
      data-llm={`Showing ${stats.total} links: ${stats.active} active, ${stats.archived} archived, ${stats.dueSoon} due soon`}
    >
      {/* Stats Dashboard */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
        </div>
        <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.active}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Active</div>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
          <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.archived}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Archived</div>
        </div>
        <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.dueSoon}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Due Soon</div>
        </div>
      </div>

      {/* Links List */}
      <div className="space-y-2">
        {links.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No links yet. Ask Claude to add some!
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className={`p-3 border rounded-lg hover:shadow-sm transition-shadow ${
                link.status === "archived" ? "opacity-60 bg-gray-50 dark:bg-gray-800" : "bg-white dark:bg-gray-900"
              }`}
              data-llm={`Link: ${link.title} (${link.status})${link.due_date ? `, due: ${link.due_date}` : ""}`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium truncate block"
                  >
                    {link.title}
                  </a>
                  <div className="text-xs text-gray-500 truncate">{link.url}</div>

                  {/* Tags */}
                  {link.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {link.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Due Date */}
                  {link.due_date && (
                    <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Due: {new Date(link.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => updateLink({
                      id: link.id,
                      status: link.status === "active" ? "archived" : "active"
                    })}
                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title={link.status === "active" ? "Archive" : "Unarchive"}
                  >
                    {link.status === "active" ? "📦" : "📤"}
                  </button>
                  <button
                    onClick={() => deleteLink({ id: link.id })}
                    disabled={isDeleting}
                    className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default StashBoard;

// REQUIRED: Mount the widget
mountWidget(<StashBoard />);
```

---

### Step 5: Status Widget - stash-status (5 min)

**Create `web/src/widgets/stash-status.tsx`:**

```tsx
import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers";

function StashStatus() {
  const { output, isPending } = useToolInfo<"stash-status">();

  if (isPending) {
    return <div className="p-4 text-center animate-pulse">Loading status...</div>;
  }

  if (!output) {
    return <div className="p-4 text-center text-red-500">No status data</div>;
  }

  const { store, memory, uptime } = output;

  return (
    <div
      className="p-4 space-y-4 max-w-md mx-auto"
      data-llm={`System status: ${store.status}, ${store.items} items, ${memory.used} memory`}
    >
      <h2 className="text-lg font-bold text-center">System Status</h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Store Status */}
        <div className="p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${store.status === "healthy" ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm font-medium">Store</span>
          </div>
          <div className="text-2xl font-bold mt-1">{store.items}</div>
          <div className="text-xs text-gray-500">items</div>
        </div>

        {/* Memory Usage */}
        <div className="p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-medium">Memory</span>
          </div>
          <div className="text-2xl font-bold mt-1">{memory.used}</div>
          <div className="text-xs text-gray-500">heap used</div>
        </div>

        {/* Uptime */}
        <div className="p-3 border rounded-lg col-span-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-sm font-medium">Uptime</span>
          </div>
          <div className="text-2xl font-bold mt-1">{uptime}</div>
          <div className="text-xs text-gray-500">seconds</div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400">
        Stage 1 Demo • In-Memory Store • No External Dependencies
      </div>
    </div>
  );
}

export default StashStatus;

mountWidget(<StashStatus />);
```

---

### Step 6: Run & Test (3 min)

```bash
npm run dev
```

**Test commands (copy-paste these to Claude):**

```
Show my stash board
```
→ See 4 pre-seeded links with stats

```
Add a link to youtube.com with tags video, entertainment
```
→ New link appears with tags

```
Archive the YouTube link
```
→ Link becomes archived (grayed out)

```
Show system status
```
→ See health dashboard with store/memory/uptime

```
What links do I have?
```
→ Claude reads data-llm and describes your stash

```
Import these links: [{"url": "https://react.dev"}, {"url": "https://tailwindcss.com"}]
```
→ Two new links imported

---

## Verification Checklist

Before moving on, verify:

- [ ] `npm run dev` starts without errors
- [ ] "Show my stash board" displays 4 links
- [ ] "Add a link to..." creates new link
- [ ] Archive/Unarchive buttons work
- [ ] Delete button removes link
- [ ] "Show system status" shows health dashboard
- [ ] Stats update when links change
- [ ] No console errors in browser

---

## What You Built (9 Patterns)

| # | Pattern | Where It's Used |
|---|---------|-----------------|
| 1 | **Type-Safe Hooks** | `generateHelpers<AppType>()` in helpers.ts |
| 2 | **Bidirectional Sync** | `data-llm` attributes in widgets |
| 3 | **Structured Content** | `structuredContent` + `content` in server |
| 4 | **Method Chaining** | `.registerWidget()...registerTool()` |
| 5 | **Zod Validation** | `inputSchema` with `z.string().url()` etc. |
| 6 | **Health Dashboard** | `stash-status` widget |
| 7 | **Bulk Import** | `import-links` tool |
| 8 | **Tool Annotations** | `readOnlyHint`, `destructiveHint` |
| 9 | **Hackathon Optimization** | In-memory store, zero deps |

---

## File Structure (Stage 1)

```
stash-mcp-app/
├── server/src/
│   ├── index.ts              # HTTP entry (auto-generated)
│   └── server.ts             # ✅ MCP server (YOU EDITED THIS)
├── web/src/
│   ├── widgets/
│   │   ├── stash-board.tsx   # ✅ Main widget (YOU CREATED THIS)
│   │   └── stash-status.tsx  # ✅ Status widget (YOU CREATED THIS)
│   ├── helpers.ts            # ✅ Type-safe hooks (YOU EDITED THIS)
│   └── index.css             # Global styles (auto-generated)
├── package.json
└── tsconfig.json
```

**Total files edited/created: 4**

---

## Deploy to Production (Optional)

Want to share your app or connect it to ChatGPT/Claude?

### 1. Create Alpic Account

1. Visit [app.alpic.ai](https://app.alpic.ai)
2. Sign up (GitHub, Google, or email)
3. Create or join a team

### 2. Get API Key & Deploy

```bash
# Get API key from Alpic (team settings → API Keys → New API key)
cp .env.example .env
# Add: ALPIC_API_KEY=your-key-here

# Deploy
npx alpic deploy
```

Copy the deployed URL from the output (e.g., `https://your-app-abc123.alpic.live`)

### 3. Connect to AI Assistants

**ChatGPT:**
- Settings → Integrations → MCP
- Add your deployed URL

**Claude Desktop:**
```json
{
  "mcpServers": {
    "stash": {
      "type": "http",
      "url": "https://your-app-abc123.alpic.live"
    }
  }
}
```

**Test:** Say "Show my stash board" in ChatGPT or Claude!

---

## Stage 2: Add Supabase (Optional, +45 min)

See [SPEC.md](SPEC.md) for:
- Database migration SQL
- Supabase client setup
- Replace in-memory Map with queries
- Add Realtime subscriptions

---

## Stage 3: Add Auth & More (Optional, +60 min)

See [SPEC.md](SPEC.md) for:
- Clerk authentication
- RLS policies (user isolation)
- Browser tab import
- Rate limiting

---

## Troubleshooting

### "Widget not found"
- Check filename matches registration: `stash-board.tsx` for `"stash-board"`
- Ensure `mountWidget()` is called at end of file

### "Cannot find module"
- Run `npm install` again
- Check import paths match your directory structure

### "Type errors"
- Ensure `export type AppType = typeof server` in server.ts
- Ensure helpers.ts imports from correct path

### "No data in widget"
- Check server is running (`npm run dev`)
- Look for errors in terminal

---

## Resources

- **Full Code:** [SPEC.md](SPEC.md)
- **Best Practices:** [FOR_JUDGES.md](FOR_JUDGES.md)
- **Skybridge Docs:** https://docs.skybridge.tech
- **Alpic Platform:** https://alpic.dev

---

**Built in 45 minutes. Copy-paste ready. Zero debugging needed. 🚀**
