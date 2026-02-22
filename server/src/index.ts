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
// RUN SERVER
// ============================================================

server.run();

export type AppType = typeof server;
