# STASH — MCP App Build Specification

> **"Stash everything. Claude finds it."**
> AI-powered second brain for links and deadlines with MCP bidirectional intelligence.

**📚 Documentation:**
- **[FOR_JUDGES.md](FOR_JUDGES.md)** — Best practices, reusable patterns, architectural decisions
- **[QUICKSTART.md](QUICKSTART.md)** — 45-minute Stage 1 build guide
- **[SPEC.md](SPEC.md)** — This file! Full technical specification (all stages)

---

## Staged Architecture

| Stage | Time | Dependencies | This File Contains |
|-------|------|--------------|-------------------|
| **Stage 1** | 45 min | None (in-memory) | Core patterns (see QUICKSTART.md) |
| **Stage 2** | +45 min | Supabase | Database schema, Realtime, queries |
| **Stage 3** | +60 min | Clerk | Auth, RLS policies, browser import |

**This SPEC.md contains ALL stages.** Sections are marked with stage indicators.

---

## Overview

Stash is an MCP App built with **Skybridge + React**, optionally extended with **Supabase + Clerk**. It demonstrates 11 reusable best practices for building MCP apps.

**What makes this an MCP App (not just a web app):**
1. **Claude IS the search** — no search bar, natural language queries across all fields
2. **Bidirectional awareness** — Claude knows widget state via `data-llm`, user interacts via chat OR widget
3. **Natural language ops** — "Archive everything I've read" = one sentence replaces 5+ clicks

**Best Practices Applied:**
- ✅ Type-safe `generateHelpers<AppType>()` pattern (Skybridge)
- ✅ Bidirectional sync via `data-llm` attributes (MCP)
- ✅ Structured content for dual consumption (Skybridge)
- ✅ Health monitoring widget for debugging (Reusable)
- ✅ Bulk import tool for demo data (Reusable)
- ✅ SSRF protection for user URLs (Security)
- ✅ CSP configuration in widget metadata (Security)
- ✅ Supabase Realtime for instant sync (Integration)
- ✅ Zod validation with TypeScript inference (Type Safety)
- ✅ Method chaining server API (Developer UX)

See [FOR_JUDGES.md](FOR_JUDGES.md) for detailed pattern documentation.

---

## Tech Stack

### Stage 1 (Required)
- **Framework:** Skybridge (`skybridge/server` + `skybridge/web`)
- **Frontend:** React + TypeScript + Tailwind
- **Deployment:** Alpic (one-click from GitHub)
- **Storage:** In-memory Map (demo purposes)

### Stage 2 (Optional - Persistence)
- **Database:** Supabase (Postgres + Realtime)
- **Dev tunnel:** Cloudflare (for local MCP testing)

### Stage 3 (Optional - Production)
- **Auth:** Clerk (per-user stash isolation)

---

## Database Schema (Stage 2)

> **Note:** Stage 1 uses an in-memory Map. This section is for Stage 2+ when you add Supabase.

### Migration: `supabase/migrations/001_stash_items.sql`

```sql
-- Drop starter's tasks table if it exists
DROP TABLE IF EXISTS tasks;

CREATE TABLE stash_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  url         text NOT NULL,
  title       text,
  note        text,
  tags        text[] DEFAULT '{}',
  status      text DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  due_date    date,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_stash_items_user_id ON stash_items(user_id);
CREATE INDEX idx_stash_items_status ON stash_items(user_id, status);
CREATE INDEX idx_stash_items_due_date ON stash_items(user_id, due_date);
CREATE INDEX idx_stash_items_tags ON stash_items USING GIN(tags);

-- Full-text search index
ALTER TABLE stash_items ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(note, '') || ' ' || coalesce(url, ''))
  ) STORED;
CREATE INDEX idx_stash_items_fts ON stash_items USING GIN(fts);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE stash_items;

-- Row Level Security
ALTER TABLE stash_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items"
  ON stash_items FOR SELECT
  USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own items"
  ON stash_items FOR INSERT
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own items"
  ON stash_items FOR UPDATE
  USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own items"
  ON stash_items FOR DELETE
  USING (auth.jwt() ->> 'sub' = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stash_items_updated_at
  BEFORE UPDATE ON stash_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## MCP Server (Skybridge)

### File: `server/src/index.ts`

**Architecture: 2 Widgets + 5 Tools** (Hackathon Optimized)
- **stash-board**: Main widget displays all links, handles filtering/sorting internally
- **stash-status**: Health dashboard for monitoring integrations (Supabase, Clerk, cache)
- **5 Tools**: add-link, update-link, delete-link, bulk-update, import-links
- Simplified rate limiting (50/min) and bulk limits (500) for fast iteration

```typescript
import { McpServer } from "skybridge/server";
import { z } from "zod";
import { supabase } from "./supabase";

// Rate limiting for title fetches (50 per minute per user) - Hackathon optimized
const titleFetchLimiter = new Map<string, { count: number; resetAt: number }>();

function checkTitleFetchRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = titleFetchLimiter.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    titleFetchLimiter.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (userLimit.count >= 50) {
    return false; // Rate limit exceeded
  }

  userLimit.count++;
  return true;
}

// Title cache (24 hour TTL)
const titleCache = new Map<string, { title: string; cachedAt: number }>();

function getCachedTitle(url: string): string | null {
  const cached = titleCache.get(url);
  if (cached && Date.now() - cached.cachedAt < 86400000) {
    return cached.title;
  }
  titleCache.delete(url); // Expired
  return null;
}

function setCachedTitle(url: string, title: string): void {
  titleCache.set(url, { title, cachedAt: Date.now() });
}

// Note: No periodic cleanup needed for hackathon (won't leak in 48hrs)

// Shared Zod schemas
const linkSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  title: z.string().nullable(),
  note: z.string().nullable(),
  tags: z.array(z.string()),
  status: z.enum(["unread", "read", "archived"]),
  due_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const statsSchema = z.object({
  total: z.number(),
  unread: z.number(),
  read: z.number(),
  archived: z.number(),
  overdue: z.number(),
  due_soon: z.number(),
});

const server = new McpServer(
  { name: "stash", version: "1.0.0" },
  { capabilities: {} }
)

// ============================================================
// WIDGET: stash-board (Main Widget — displays ALL links)
// ============================================================
.registerWidget(
  "stash-board",
  {
    description: "Main Stash board showing all saved links with deadline radar. Widget handles filtering/sorting internally.",
    _meta: {
      ui: {
        csp: {
          redirectDomains: ["*"], // Allow opening any saved URL
        },
      },
    },
  },
  {
    description: "Display all of the user's saved links. The widget UI handles filtering and sorting.",
    inputSchema: {},
    outputSchema: {
      links: z.array(linkSchema),
      stats: statsSchema,
    },
  },
  async (_input, { authInfo }) => {
    const userId = authInfo?.sub;

    // Fetch ALL links - widget will handle filtering
    // NOTE: For production with >500 links, implement pagination:
    // - Add limit/offset parameters
    // - Or use cursor-based pagination
    // - Or implement virtual scrolling in widget
    const { data: links, error } = await supabase
      .from("stash_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000); // Safety limit: max 1000 links

    if (error) throw new Error(error.message);

    const allItems = links || [];
    const now = new Date();
    const twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const stats = {
      total: allItems.length,
      unread: allItems.filter(l => l.status === "unread").length,
      read: allItems.filter(l => l.status === "read").length,
      archived: allItems.filter(l => l.status === "archived").length,
      overdue: allItems.filter(l => l.due_date && new Date(l.due_date) < now && l.status !== "archived").length,
      due_soon: allItems.filter(l => l.due_date && new Date(l.due_date) >= now && new Date(l.due_date) <= twoDays && l.status !== "archived").length,
    };

    return {
      structuredContent: { links: allItems, stats },
      content: [{ type: "text", text: `Your stash has ${stats.total} links. ${stats.unread} unread, ${stats.overdue} overdue, ${stats.due_soon} due soon.` }],
      isError: false,
    };
  }
)

// ============================================================
// WIDGET: stash-status (Hackathon Debug Tool)
// ============================================================
.registerWidget(
  "stash-status",
  {
    description: "System health dashboard showing connection status for Supabase, Clerk auth, cache stats, and storage metrics. Essential for debugging during development.",
  },
  {
    description: "Display connection status and system health metrics",
    inputSchema: {},
    outputSchema: {
      supabase: z.object({
        connected: z.boolean(),
        latency_ms: z.number(),
        error: z.string().nullable(),
      }),
      clerk: z.object({
        authenticated: z.boolean(),
        user_id: z.string().nullable(),
      }),
      cache: z.object({
        title_entries: z.number(),
        rate_limiters_active: z.number(),
      }),
      stats: z.object({
        total_links: z.number(),
        storage_mb: z.number(),
      }),
    },
  },
  async (_input, { authInfo }) => {
    const userId = authInfo?.sub;

    // Test Supabase connection with latency check
    const start = Date.now();
    let sbError = null;
    let count = 0;

    try {
      const { count: c, error } = await supabase
        .from("stash_items")
        .select("*", { count: "exact", head: true });
      count = c || 0;
      sbError = error ? error.message : null;
    } catch (err) {
      sbError = err instanceof Error ? err.message : "Unknown error";
    }

    const latency = Date.now() - start;

    // Check Clerk auth
    const clerkOk = !!userId;

    // Cache stats
    const titleEntries = titleCache.size;
    const rateLimitersActive = titleFetchLimiter.size;

    // Storage estimate (rough: ~2KB per link)
    const storage_mb = (count * 2) / 1000;

    const healthData = {
      supabase: { connected: !sbError, latency_ms: latency, error: sbError },
      clerk: { authenticated: clerkOk, user_id: userId || null },
      cache: { title_entries: titleEntries, rate_limiters_active: rateLimitersActive },
      stats: { total_links: count, storage_mb },
    };

    return {
      structuredContent: healthData,
      content: [{
        type: "text",
        text: `Supabase: ${!sbError ? '✅' : '❌'} (${latency}ms) | Clerk: ${clerkOk ? '✅' : '❌'} | Cache: ${titleEntries} titles | Links: ${count}`
      }],
      isError: false,
    };
  }
)

// ============================================================
// TOOL: add-link
// ============================================================
.registerTool(
  "add-link",
  {
    description: "Save a new link/bookmark to the user's stash with optional metadata",
    inputSchema: {
      url: z.string().url().describe("The URL to save"),
      title: z.string().max(200).optional().describe("Title for the link (auto-extracted from page if omitted, max 200 chars)"),
      note: z.string().max(1000).optional().describe("User's note or annotation (max 1000 chars)"),
      tags: z.array(z.string().max(50)).max(10).optional().describe("Tags for categorization, max 10 tags of 50 chars each"),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Optional deadline in YYYY-MM-DD format"),
    },
  },
  async ({ url, title, note, tags, due_date }, { authInfo }) => {
    const userId = authInfo?.sub;

    // SSRF Protection: Validate URL to prevent internal network scanning
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();

      // Block localhost and private IP ranges
      if (
        hostname === 'localhost' ||
        hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
      ) {
        throw new Error("Cannot save links to localhost or private networks");
      }
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error("Invalid URL format");
      }
      throw err;
    }

    // Auto-extract title from page if not provided
    let resolvedTitle = title;
    if (!resolvedTitle) {
      // Check cache first
      const cachedTitle = getCachedTitle(url);
      if (cachedTitle) {
        resolvedTitle = cachedTitle;
      } else {
        // Check rate limit
        if (!checkTitleFetchRateLimit(userId)) {
          resolvedTitle = url; // Rate limited, use URL as title
        } else {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(url, {
              signal: controller.signal,
              headers: { 'User-Agent': 'Stash/1.0' }
            });
            clearTimeout(timeoutId);

            const html = await res.text();
            const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const extractedTitle = match?.[1]?.trim();

            // Sanitize extracted title: remove HTML entities and limit length
            if (extractedTitle) {
              resolvedTitle = extractedTitle
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#x27;/g, "'")
                .substring(0, 200); // Max 200 chars

              // Cache the result
              setCachedTitle(url, resolvedTitle);
            } else {
              resolvedTitle = url;
            }
          } catch {
            resolvedTitle = url; // Graceful fallback on timeout or fetch error
          }
        }
      }
    }

    const { data, error } = await supabase
      .from("stash_items")
      .insert({
        user_id: userId,
        url,
        title: resolvedTitle,
        note: note || null,
        tags: tags || [],
        due_date: due_date || null,
      })
      .select()
      .single();

    if (error) {
      // User-friendly error messages
      if (error.code === '23505') {
        return {
          content: [{ type: "text", text: `⚠️ You've already saved this URL. Use update-link to modify it.` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: `❌ Failed to save link: ${error.message}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: `✓ Saved "${data.title}" to your stash${due_date ? ` (due ${due_date})` : ""}.` }],
      isError: false,
    };
  }
)

// ============================================================
// TOOL: update-link
// ============================================================
.registerTool(
  "update-link",
  {
    description: "Edit a saved link's title, note, tags, due date, or status",
    inputSchema: {
      id: z.string().uuid().describe("The link ID to update"),
      title: z.string().max(200).optional().describe("New title (max 200 chars)"),
      note: z.string().max(1000).optional().describe("New note (max 1000 chars)"),
      tags: z.array(z.string().max(50)).max(10).optional().describe("New tags (max 10 tags of 50 chars each)"),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$|^$/).optional().describe("New deadline (YYYY-MM-DD) or empty string to clear"),
      status: z.enum(["unread", "read", "archived"]).optional().describe("New status"),
    },
  },
  async ({ id, ...updates }, { authInfo }) => {
    const userId = authInfo?.sub;

    const cleanUpdates: Record<string, any> = {};
    if (updates.title !== undefined) cleanUpdates.title = updates.title;
    if (updates.note !== undefined) cleanUpdates.note = updates.note;
    if (updates.tags !== undefined) cleanUpdates.tags = updates.tags;
    if (updates.due_date !== undefined) cleanUpdates.due_date = updates.due_date || null;
    if (updates.status !== undefined) cleanUpdates.status = updates.status;

    const { data, error } = await supabase
      .from("stash_items")
      .update(cleanUpdates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      content: [{ type: "text", text: `✓ Updated "${data.title}".` }],
      isError: false,
    };
  }
)

// ============================================================
// TOOL: delete-link
// ============================================================
.registerTool(
  "delete-link",
  {
    description: "Permanently remove a link from the user's stash",
    inputSchema: {
      id: z.string().uuid().describe("The link ID to delete"),
    },
  },
  async ({ id }, { authInfo }) => {
    const userId = authInfo?.sub;

    const { error } = await supabase
      .from("stash_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    return {
      content: [{ type: "text", text: "✓ Link deleted." }],
      isError: false,
    };
  }
)

// ============================================================
// TOOL: bulk-update
// ============================================================
.registerTool(
  "bulk-update",
  {
    description: "Update multiple links at once. Filter by status or overdue, then apply an action. Max 500 links per operation.",
    inputSchema: {
      filter_status: z.enum(["unread", "read", "archived"]).optional()
        .describe("Filter by current status"),
      filter_overdue: z.boolean().optional()
        .describe("If true, only match overdue items"),
      action: z.enum(["archive", "mark_read", "mark_unread", "delete"])
        .describe("Action to apply"),
    },
  },
  async ({ filter_status, filter_overdue, action }, { authInfo }) => {
    const userId = authInfo?.sub;

    let query = supabase.from("stash_items").select("id").eq("user_id", userId);
    if (filter_status) query = query.eq("status", filter_status);
    if (filter_overdue) {
      const now = new Date().toISOString().split("T")[0];
      query = query.lt("due_date", now).neq("status", "archived");
    }

    const { data: matches } = await query;
    const ids = (matches || []).map(m => m.id);

    if (ids.length === 0) {
      return { content: [{ type: "text", text: "No matching links found." }], isError: false };
    }

    // Safety limit: max 500 items per bulk operation (hackathon optimized)
    if (ids.length > 500) {
      return {
        content: [{
          type: "text",
          text: `⚠️ This would affect ${ids.length} links. Bulk operations are limited to 500 items at a time. Please narrow your filter or run multiple operations.`
        }],
        isError: true,
      };
    }

    if (action === "delete") {
      await supabase.from("stash_items").delete().in("id", ids).eq("user_id", userId);
    } else {
      const statusMap: Record<string, string> = { archive: "archived", mark_read: "read", mark_unread: "unread" };
      await supabase.from("stash_items").update({ status: statusMap[action] }).in("id", ids).eq("user_id", userId);
    }

    return {
      content: [{ type: "text", text: `✓ ${action.replace("_", " ")} applied to ${ids.length} links.` }],
      isError: false,
    };
  }
)

// ============================================================
// TOOL: import-links (Hackathon Feature)
// ============================================================
.registerTool(
  "import-links",
  {
    description: "Bulk import links from JSON array. Perfect for seeding demo data or migrating bookmarks. Max 200 links at once.",
    inputSchema: {
      links: z.array(z.object({
        url: z.string().url().describe("The URL to save"),
        title: z.string().max(200).optional().describe("Title (auto-generated from URL if omitted)"),
        note: z.string().max(1000).optional().describe("Note or annotation"),
        tags: z.array(z.string().max(50)).max(10).optional().describe("Tags for categorization"),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Deadline in YYYY-MM-DD format"),
      })).max(200).describe("Array of links to import (max 200)"),
    },
  },
  async ({ links }, { authInfo }) => {
    const userId = authInfo?.sub;

    // Transform input to database format
    const items = links.map(link => ({
      user_id: userId,
      url: link.url,
      title: link.title || link.url,
      note: link.note || null,
      tags: link.tags || [],
      due_date: link.due_date || null,
    }));

    const { data, error } = await supabase
      .from("stash_items")
      .insert(items)
      .select();

    if (error) {
      // Handle duplicate URLs gracefully
      if (error.code === '23505') {
        return {
          content: [{ type: "text", text: `⚠️ Some URLs already exist. Try updating existing links instead.` }],
          isError: true,
        };
      }
      throw new Error(error.message);
    }

    return {
      content: [{
        type: "text",
        text: `✓ Successfully imported ${data.length} links to your stash!${data.length >= 10 ? ' 🎉' : ''}`
      }],
      isError: false,
    };
  }
)

// ============================================================
// TOOL: import-open-tabs-safari (Browser Integration)
// ============================================================
.registerTool(
  "import-open-tabs-safari",
  {
    description: "Import all currently open Safari tabs across all windows. Auto-categorizes by window name or content type. Mac only.",
    inputSchema: {
      categorize_by: z.enum(["window", "domain", "auto"]).optional().default("auto").describe("Categorization strategy: window (by Safari window), domain (by hostname), or auto (smart content-based)"),
      limit: z.number().max(500).optional().default(200).describe("Maximum number of tabs to import (default 200, max 500)"),
    },
  },
  async ({ categorize_by, limit }, { authInfo }) => {
    const userId = authInfo?.sub;

    // Check if running on macOS
    if (process.platform !== 'darwin') {
      return {
        content: [{
          type: "text",
          text: "❌ Safari tab import only works on macOS. Use import-tabs tool with browser extension instead."
        }],
        isError: true,
      };
    }

    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // AppleScript to extract all Safari tabs
      const script = `
        set output to ""
        tell application "Safari"
          repeat with w in windows
            set windowName to name of w
            repeat with t in tabs of w
              set tabURL to URL of t
              set tabTitle to name of t
              set output to output & tabURL & "|||" & tabTitle & "|||" & windowName & "\\n"
            end repeat
          end repeat
        end tell
        return output
      `;

      const { stdout } = await execAsync(`osascript -e '${script.replace(/\n/g, ' ')}'`);

      if (!stdout || stdout.trim() === '') {
        return {
          content: [{
            type: "text",
            text: "❌ No open Safari tabs found. Make sure Safari is running with open tabs."
          }],
          isError: true,
        };
      }

      // Parse AppleScript output
      const lines = stdout.trim().split('\n').filter(line => line.trim());
      const tabs = lines.map(line => {
        const [url, title, windowName] = line.split('|||');
        return { url: url?.trim(), title: title?.trim(), windowName: windowName?.trim() };
      }).filter(tab => tab.url && tab.url.startsWith('http'));

      if (tabs.length === 0) {
        return {
          content: [{
            type: "text",
            text: "❌ No valid HTTP(S) tabs found in Safari."
          }],
          isError: true,
        };
      }

      // Apply limit
      const limitedTabs = tabs.slice(0, limit);

      // Auto-categorize based on strategy
      const items = limitedTabs.map(tab => {
        let tags: string[] = [];

        if (categorize_by === "window") {
          tags = [tab.windowName || "default-window"];
        } else if (categorize_by === "domain") {
          try {
            const domain = new URL(tab.url).hostname.replace('www.', '');
            tags = [domain];
          } catch {
            tags = ["uncategorized"];
          }
        } else {
          // Auto-categorize by content
          tags = inferTags(tab.url, tab.title || "");
        }

        return {
          user_id: userId,
          url: tab.url,
          title: tab.title || tab.url,
          note: `Imported from Safari window: ${tab.windowName}`,
          tags,
          status: "unread" as const,
        };
      });

      // Check for duplicates
      const urls = items.map(item => item.url);
      const { data: existing } = await supabase
        .from("stash_items")
        .select("url")
        .eq("user_id", userId)
        .in("url", urls);

      const existingUrls = new Set(existing?.map(e => e.url) || []);
      const newItems = items.filter(item => !existingUrls.has(item.url));

      if (newItems.length === 0) {
        return {
          content: [{
            type: "text",
            text: `⚠️ All ${items.length} Safari tabs already exist in your stash.`
          }],
        };
      }

      // Batch insert
      const { data, error } = await supabase
        .from("stash_items")
        .insert(newItems)
        .select();

      if (error) throw new Error(error.message);

      const categories = [...new Set(data.map(d => d.tags).flat())];
      const skipped = items.length - newItems.length;

      return {
        structuredContent: {
          imported: data,
          categories,
          skipped,
        },
        content: [{
          type: "text",
          text: `✓ Imported ${data.length} tabs from Safari! Organized into ${categories.length} categories: ${categories.slice(0, 5).join(", ")}${categories.length > 5 ? `, +${categories.length - 5} more` : ""}${skipped > 0 ? ` (${skipped} duplicates skipped)` : ""}`
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to import Safari tabs: ${err instanceof Error ? err.message : 'Unknown error'}. Make sure Safari is running and you've granted terminal accessibility permissions.`
        }],
        isError: true,
      };
    }
  }
)

// ============================================================
// TOOL: import-tabs (Generic Browser Tab Import)
// ============================================================
.registerTool(
  "import-tabs",
  {
    description: "Import tabs from any browser. Accepts array of {url, title, category} objects. Use with browser extension or manual data collection.",
    inputSchema: {
      tabs: z.array(z.object({
        url: z.string().url().describe("The tab URL"),
        title: z.string().max(200).optional().describe("Tab title"),
        category: z.string().max(50).optional().describe("Manual category (e.g., window name, domain)"),
      })).max(500).describe("Array of tabs to import (max 500)"),
      auto_categorize: z.boolean().optional().default(true).describe("Auto-categorize tabs by content if category not provided"),
    },
  },
  async ({ tabs, auto_categorize }, { authInfo }) => {
    const userId = authInfo?.sub;

    if (tabs.length === 0) {
      return {
        content: [{
          type: "text",
          text: "❌ No tabs provided for import."
        }],
        isError: true,
      };
    }

    // Transform to database format
    const items = tabs.map(tab => {
      let tags: string[] = [];

      if (tab.category) {
        tags = [tab.category];
      } else if (auto_categorize) {
        tags = inferTags(tab.url, tab.title || "");
      } else {
        tags = ["imported"];
      }

      return {
        user_id: userId,
        url: tab.url,
        title: tab.title || tab.url,
        note: `Imported from browser tabs`,
        tags,
        status: "unread" as const,
      };
    });

    // Check for duplicates
    const urls = items.map(item => item.url);
    const { data: existing } = await supabase
      .from("stash_items")
      .select("url")
      .eq("user_id", userId)
      .in("url", urls);

    const existingUrls = new Set(existing?.map(e => e.url) || []);
    const newItems = items.filter(item => !existingUrls.has(item.url));

    if (newItems.length === 0) {
      return {
        content: [{
          type: "text",
          text: `⚠️ All ${items.length} tabs already exist in your stash.`
        }],
      };
    }

    // Batch insert
    const { data, error } = await supabase
      .from("stash_items")
      .insert(newItems)
      .select();

    if (error) throw new Error(error.message);

    const categories = [...new Set(data.map(d => d.tags).flat())];
    const skipped = items.length - newItems.length;

    return {
      structuredContent: {
        imported: data,
        categories,
        skipped,
      },
      content: [{
        type: "text",
        text: `✓ Imported ${data.length} tabs! Organized into ${categories.length} categories: ${categories.slice(0, 5).join(", ")}${categories.length > 5 ? `, +${categories.length - 5} more` : ""}${skipped > 0 ? ` (${skipped} duplicates skipped)` : ""}`
      }],
    };
  }
);

// ============================================================
// Helper: Auto-categorization function
// ============================================================
function inferTags(url: string, title: string): string[] {
  const tags: string[] = [];
  const text = (url + " " + title).toLowerCase();

  // Development & Code
  if (text.match(/github|gitlab|bitbucket|stackoverflow|stackexchange/)) {
    tags.push("development");
  }
  if (text.match(/\bdocs?\b|documentation|api|reference|guide/)) {
    tags.push("documentation");
  }

  // Learning & Education
  if (text.match(/tutorial|course|learn|udemy|coursera|edx/)) {
    tags.push("learning");
  }
  if (text.match(/youtube|vimeo|video|watch/)) {
    tags.push("video");
  }
  if (text.match(/article|blog|medium|dev\.to/)) {
    tags.push("article");
  }

  // Work & Productivity
  if (text.match(/figma|notion|slack|jira|asana|trello|linear/)) {
    tags.push("work");
  }
  if (text.match(/gmail|email|calendar|meet|zoom|teams/)) {
    tags.push("productivity");
  }

  // Social & News
  if (text.match(/twitter|reddit|linkedin|facebook|instagram|x\.com/)) {
    tags.push("social");
  }
  if (text.match(/news|bbc|cnn|nytimes|guardian|techcrunch|hackernews/)) {
    tags.push("news");
  }

  // Shopping & Commerce
  if (text.match(/amazon|shop|buy|cart|checkout|ebay|etsy/)) {
    tags.push("shopping");
  }

  // Design & Creative
  if (text.match(/dribbble|behance|design|adobe|sketch/)) {
    tags.push("design");
  }

  // AI & ML
  if (text.match(/openai|anthropic|claude|chatgpt|ai|machine learning|ml/)) {
    tags.push("ai");
  }

  // Cloud & Infrastructure
  if (text.match(/aws|azure|gcp|vercel|netlify|heroku|docker|kubernetes/)) {
    tags.push("cloud");
  }

  // Default if no matches
  if (tags.length === 0) {
    // Try to use domain as fallback
    try {
      const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
      tags.push(domain);
    } catch {
      tags.push("uncategorized");
    }
  }

  return tags;
}

export default server;
export type AppType = typeof server;
```

### File: `server/src/supabase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

---

## Skybridge Bridge File

### File: `web/src/skybridge.ts`

```typescript
import type { AppType } from "../../server/src/index";
import { generateHelpers } from "skybridge/web";

export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
```

---

## Widget Components

### File: `web/src/widgets/stash-board.tsx`

Primary widget rendered when Claude calls `stash-board`. Receives data via `useToolInfo()`, enables UI actions via `useCallTool()`, syncs state to Claude via `data-llm`.

```tsx
import { useToolInfo, useCallTool } from "../skybridge";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-client";
import { StashCard } from "../components/StashCard";
import { DeadlineRadar } from "../components/DeadlineRadar";
import { FilterTabs } from "../components/FilterTabs";
import { AddLinkForm } from "../components/AddLinkForm";

type StashItem = {
  id: string; url: string; title: string | null; note: string | null;
  tags: string[]; status: "unread" | "read" | "archived";
  due_date: string | null; created_at: string; updated_at: string;
};

export default function StashBoard() {
  const toolInfo = useToolInfo<{ links: StashItem[]; stats: any }>();
  const updateLink = useCallTool("update-link");
  const deleteLink = useCallTool("delete-link");
  const addLink = useCallTool("add-link");

  const [links, setLinks] = useState<StashItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [surpriseLink, setSurpriseLink] = useState<StashItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (toolInfo.isSuccess) {
      setLinks(toolInfo.output.structuredContent.links);
    }
  }, [toolInfo.isSuccess]);

  // Supabase Realtime for live updates
  useEffect(() => {
    const channel = supabase
      .channel("stash_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stash_items" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setLinks(prev => [payload.new as StashItem, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setLinks(prev => prev.map(l => l.id === (payload.new as StashItem).id ? payload.new as StashItem : l));
        } else if (payload.eventType === "DELETE") {
          setLinks(prev => prev.filter(l => l.id !== (payload.old as any).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
      // Cmd/Ctrl + N: New link
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowAddForm(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extract all categories from links
  const allCategories = Array.from(new Set(links.flatMap(l => l.tags))).sort();

  // Apply status filter
  const statusFiltered = activeFilter === "all" ? links : links.filter(l => l.status === activeFilter);

  // Apply category filter
  const categoryFiltered = activeCategory
    ? statusFiltered.filter(l => l.tags.includes(activeCategory))
    : statusFiltered;

  // Apply search filter (case-insensitive across title, note, url, tags)
  const filtered = searchQuery
    ? categoryFiltered.filter(l => {
        const q = searchQuery.toLowerCase();
        return (
          l.title?.toLowerCase().includes(q) ||
          l.note?.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          l.tags.some(tag => tag.toLowerCase().includes(q))
        );
      })
    : categoryFiltered;

  const now = new Date();
  const overdue = links.filter(l => l.due_date && new Date(l.due_date) < now && l.status !== "archived");
  const dueSoon = links.filter(l => {
    if (!l.due_date || l.status === "archived") return false;
    const d = new Date(l.due_date);
    return d >= now && d <= new Date(now.getTime() + 2 * 86400000);
  });

  const handleStatusChange = async (id: string, status: string) => {
    setIsLoading(prev => ({ ...prev, [id]: true }));
    setError(null);
    try {
      await updateLink.call({ id, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update link");
    } finally {
      setIsLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(prev => ({ ...prev, [id]: true }));
    setError(null);
    try {
      await deleteLink.call({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete link");
    } finally {
      setIsLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAddLink = async (data: any) => {
    setIsLoading(prev => ({ ...prev, add: true }));
    setError(null);
    try {
      await addLink.call(data);
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add link");
    } finally {
      setIsLoading(prev => ({ ...prev, add: false }));
    }
  };

  // Pure client-side — no tool call needed since all links are already loaded
  const handleSurprise = () => {
    const unread = links.filter(l => l.status === "unread");
    if (unread.length > 0)
      setSurpriseLink(unread[Math.floor(Math.random() * unread.length)]);
  };

  const llmContext = `User is viewing ${filtered.length} links (filter: ${activeFilter}${activeCategory ? `, category: "${activeCategory}"` : ""}${searchQuery ? `, search: "${searchQuery}"` : ""}). ${overdue.length} overdue, ${dueSoon.length} due soon. Total: ${links.length}. Available categories: ${allCategories.slice(0, 10).join(", ")}${allCategories.length > 10 ? `, +${allCategories.length - 10} more` : ""}.`;

  if (!toolInfo.isSuccess) return <div className="p-8 text-center text-gray-400">Loading your stash...</div>;

  return (
    <div data-llm={llmContext} className="flex h-full bg-gray-950 text-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Error banner */}
        {error && (
          <div className="bg-red-900/30 border-b border-red-700/50 px-6 py-3 flex items-center justify-between">
            <p className="text-sm text-red-400">❌ {error}</p>
            <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-400">Dismiss</button>
          </div>
        )}

        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h1 className="text-xl font-bold">Stash</h1>
            <p className="text-sm text-gray-400">{links.length} saved links</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSurprise}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium"
                    title="Pick a random unread link">
              🎲 Surprise Me
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add new link (⌘N)"
                    disabled={isLoading.add}>
              {isLoading.add ? "Adding..." : "+ Add Link"}
            </button>
          </div>
        </header>

        {/* Surprise Me overlay */}
        {surpriseLink && (
          <div className="mx-6 mt-4 p-4 bg-purple-900/30 border border-purple-700/50 rounded-xl">
            <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-1">🎲 Surprise Pick</p>
            <a href={surpriseLink.url} target="_blank" rel="noopener noreferrer"
               className="text-white font-medium hover:text-purple-300 block mb-1">
              {surpriseLink.title || surpriseLink.url}
            </a>
            {surpriseLink.note && <p className="text-sm text-gray-400 mb-2">{surpriseLink.note}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={handleSurprise} className="text-xs text-purple-400 hover:text-purple-300">Try another</button>
              <button onClick={() => setSurpriseLink(null)} className="text-xs text-gray-500 hover:text-gray-400">Dismiss</button>
            </div>
          </div>
        )}

        {showAddForm && <AddLinkForm onSubmit={handleAddLink} onCancel={() => setShowAddForm(false)} />}
        <FilterTabs active={activeFilter} onChange={setActiveFilter} counts={{
          all: links.length, unread: links.filter(l => l.status === "unread").length,
          read: links.filter(l => l.status === "read").length, archived: links.filter(l => l.status === "archived").length,
        }} />

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-gray-800">
          <input
            type="text"
            placeholder="Search links by title, note, URL, or tags... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          />
          {searchQuery && (
            <p className="text-xs text-gray-500 mt-2">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Category filter chips */}
        {allCategories.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Categories:</span>
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  !activeCategory
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                All ({links.length})
              </button>
              {allCategories.slice(0, 15).map(category => {
                const count = links.filter(l => l.tags.includes(category)).length;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category === activeCategory ? null : category)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === category
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    {category} ({count})
                  </button>
                );
              })}
              {allCategories.length > 15 && (
                <span className="text-xs text-gray-600">+{allCategories.length - 15} more</span>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg mb-3">
                {searchQuery || activeFilter !== "all" ? "No matching links" : "Your stash is empty"}
              </p>
              {!searchQuery && activeFilter === "all" && (
                <div className="text-sm space-y-2 max-w-md mx-auto">
                  <p className="text-gray-400">Try asking Claude:</p>
                  <code className="block bg-gray-800/50 px-4 py-2 rounded text-purple-400 text-left">
                    "Save reddit.com/r/programming, tag dev"
                  </code>
                  <code className="block bg-gray-800/50 px-4 py-2 rounded text-purple-400 text-left">
                    "Add docs.docker.com, due Friday"
                  </code>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(link => (
                <StashCard
                  key={link.id}
                  link={link}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  isLoading={isLoading[link.id]} />
              ))}
            </div>
          )}
        </div>
      </div>
      <DeadlineRadar links={links} />
    </div>
  );
}
```

### File: `web/src/widgets/stash-status.tsx`

Health dashboard widget for monitoring system integrations during development and hackathon demos.

```tsx
import { useToolInfo } from "../skybridge";

type HealthData = {
  supabase: { connected: boolean; latency_ms: number; error: string | null };
  clerk: { authenticated: boolean; user_id: string | null };
  cache: { title_entries: number; rate_limiters_active: number };
  stats: { total_links: number; storage_mb: number };
};

export default function StashStatus() {
  const toolInfo = useToolInfo<HealthData>();

  if (!toolInfo.isSuccess) {
    return (
      <div className="p-8 text-center text-gray-400 bg-gray-950 min-h-screen">
        <div className="animate-pulse">Loading health check...</div>
      </div>
    );
  }

  const { supabase, clerk, cache, stats } = toolInfo.output.structuredContent;

  return (
    <div className="p-6 bg-gray-950 text-white min-h-screen max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Stash System Status</h1>
        <p className="text-sm text-gray-400">Monitor your integrations and debug issues</p>
      </div>

      {/* Supabase Status */}
      <div className="mb-4 p-5 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{supabase.connected ? '✅' : '❌'}</span>
            <div>
              <h2 className="text-lg font-semibold">Supabase Database</h2>
              <p className="text-xs text-gray-500">PostgreSQL + Realtime</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold text-green-400">{supabase.latency_ms}ms</p>
            <p className="text-xs text-gray-500">Latency</p>
          </div>
        </div>
        {supabase.error && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-700/50 rounded text-xs text-red-400">
            <strong>Error:</strong> {supabase.error}
          </div>
        )}
      </div>

      {/* Clerk Auth Status */}
      <div className="mb-4 p-5 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{clerk.authenticated ? '✅' : '❌'}</span>
            <div>
              <h2 className="text-lg font-semibold">Clerk Authentication</h2>
              <p className="text-xs text-gray-500">User identity & auth</p>
            </div>
          </div>
        </div>
        <div className="text-sm">
          <p className="text-gray-400">User ID:</p>
          <code className="block mt-1 p-2 bg-gray-950 rounded text-purple-400 font-mono text-xs break-all">
            {clerk.user_id || 'Not authenticated'}
          </code>
        </div>
      </div>

      {/* Cache Stats */}
      <div className="mb-4 p-5 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition">
        <h2 className="text-lg font-semibold mb-3">In-Memory Cache</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-950 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Title Cache</p>
            <p className="text-2xl font-bold text-purple-400">{cache.title_entries}</p>
            <p className="text-xs text-gray-600 mt-1">entries</p>
          </div>
          <div className="text-center p-3 bg-gray-950 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Rate Limiters</p>
            <p className="text-2xl font-bold text-amber-400">{cache.rate_limiters_active}</p>
            <p className="text-xs text-gray-600 mt-1">active</p>
          </div>
        </div>
      </div>

      {/* Storage Stats */}
      <div className="mb-4 p-5 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition">
        <h2 className="text-lg font-semibold mb-3">Storage Metrics</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-950 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Total Links</p>
            <p className="text-3xl font-bold text-green-400">{stats.total_links}</p>
          </div>
          <div className="text-center p-3 bg-gray-950 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Est. Storage</p>
            <p className="text-3xl font-bold text-blue-400">{stats.storage_mb.toFixed(1)}</p>
            <p className="text-xs text-gray-600 mt-1">MB</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 p-4 bg-purple-900/10 border border-purple-700/30 rounded-lg">
        <h3 className="text-sm font-semibold text-purple-300 mb-2">💡 Quick Tips</h3>
        <ul className="text-xs text-purple-200 space-y-1">
          <li>• <strong>Import data:</strong> Ask Claude to "import links from JSON"</li>
          <li>• <strong>View all links:</strong> Say "show my stash board"</li>
          <li>• <strong>Refresh status:</strong> Say "show system status" again</li>
        </ul>
      </div>

      {/* Skybridge Feature Highlight */}
      <div className="mt-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-400">Powered by Skybridge:</strong> This status widget uses the same
          <code className="mx-1 px-1 py-0.5 bg-gray-800 rounded text-purple-400">useToolInfo()</code>
          hook as the main widget, demonstrating Skybridge's type-safe data fetching.
        </p>
      </div>
    </div>
  );
}
```

### File: `web/src/components/StashCard.tsx`

```tsx
type StashItem = {
  id: string; url: string; title: string | null; note: string | null;
  tags: string[]; status: string; due_date: string | null;
  created_at: string; updated_at: string;
};

interface Props {
  link: StashItem;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function StashCard({ link, onStatusChange, onDelete, isLoading = false }: Props) {
  const now = new Date();
  const dueDate = link.due_date ? new Date(link.due_date) : null;
  const isOverdue = dueDate && dueDate < now && link.status !== "archived";
  const isDueSoon = dueDate && !isOverdue && dueDate <= new Date(now.getTime() + 2 * 86400000);
  const borderColor = isOverdue ? "border-l-red-500" : isDueSoon ? "border-l-amber-500" : "border-l-gray-700";
  const nextStatus = link.status === "unread" ? "read" : link.status === "read" ? "archived" : "unread";

  return (
    <div className={`bg-gray-900 rounded-lg border-l-4 ${borderColor} p-4 hover:bg-gray-800 transition`}>
      <a href={link.url} target="_blank" rel="noopener noreferrer"
         className="text-purple-400 hover:text-purple-300 font-medium text-sm line-clamp-2">
        {link.title || link.url}
      </a>
      <p className="text-xs text-gray-500 mt-1 truncate">{link.url}</p>
      {link.note && <p className="text-sm text-gray-300 mt-2 line-clamp-2">{link.note}</p>}
      {link.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {link.tags.map(tag => (
            <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          {dueDate ? (
            <span className={isOverdue ? "text-red-400" : isDueSoon ? "text-amber-400" : ""}>
              {isOverdue ? "Overdue" : `Due ${dueDate.toLocaleDateString()}`}
            </span>
          ) : "No deadline"}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange(link.id, nextStatus)}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}>
            {isLoading ? "..." : link.status === "unread" ? "Mark Read" : link.status === "read" ? "Archive" : "Unread"}
          </button>
          <button
            onClick={() => onDelete(link.id)}
            className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}>
            {isLoading ? "..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### File: `web/src/components/DeadlineRadar.tsx`

```tsx
type StashItem = {
  id: string; url: string; title: string | null; due_date: string | null;
  status: string; tags: string[]; note: string | null; created_at: string; updated_at: string;
};

export function DeadlineRadar({ links }: { links: StashItem[] }) {
  const now = new Date();
  const twoDays = new Date(now.getTime() + 2 * 86400000);
  const weekEnd = new Date(now.getTime() + 7 * 86400000);
  const withDue = links.filter(l => l.due_date && l.status !== "archived");

  const overdue = withDue.filter(l => new Date(l.due_date!) < now);
  const dueSoon = withDue.filter(l => { const d = new Date(l.due_date!); return d >= now && d <= twoDays; });
  const thisWeek = withDue.filter(l => { const d = new Date(l.due_date!); return d > twoDays && d <= weekEnd; });

  const Section = ({ title, items, color }: { title: string; items: StashItem[]; color: string }) =>
    items.length > 0 ? (
      <div className="mb-4">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${color} mb-2`}>{title} ({items.length})</h3>
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-800">
            <span className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`} />
            <span className="text-sm text-gray-300 truncate flex-1">{item.title || item.url}</span>
            <span className="text-xs text-gray-500">
              {new Date(item.due_date!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <aside className="w-64 border-l border-gray-800 p-4 overflow-y-auto bg-gray-950">
      <h2 className="text-sm font-bold text-gray-300 mb-4">Deadline Radar</h2>
      <Section title="Overdue" items={overdue} color="text-red-400" />
      <Section title="Due Soon" items={dueSoon} color="text-amber-400" />
      <Section title="This Week" items={thisWeek} color="text-green-400" />
      {withDue.length === 0 && <p className="text-sm text-gray-600 text-center py-8">No deadlines set</p>}
    </aside>
  );
}
```

### File: `web/src/components/FilterTabs.tsx`

```tsx
interface Props {
  active: string;
  onChange: (filter: string) => void;
  counts: { all: number; unread: number; read: number; archived: number };
}

export function FilterTabs({ active, onChange, counts }: Props) {
  const tabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "unread", label: "Unread", count: counts.unread },
    { key: "read", label: "Read", count: counts.read },
    { key: "archived", label: "Archived", count: counts.archived },
  ];

  return (
    <div className="flex gap-1 px-6 py-2 border-b border-gray-800">
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
            active === tab.key ? "bg-purple-600/20 text-purple-400" : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}>
          {tab.label} <span className="text-xs opacity-60">({tab.count})</span>
        </button>
      ))}
    </div>
  );
}
```

### File: `web/src/components/AddLinkForm.tsx`

```tsx
import { useState } from "react";

interface Props {
  onSubmit: (data: { url: string; title?: string; note?: string; tags?: string[]; due_date?: string }) => void;
  onCancel: () => void;
}

export function AddLinkForm({ onSubmit, onCancel }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    onSubmit({
      url, title: title || undefined, note: note || undefined,
      tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      due_date: dueDate || undefined,
    });
  };

  const inputClass = "bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
      <div className="grid grid-cols-2 gap-3">
        <input type="url" placeholder="URL *" value={url} onChange={e => setUrl(e.target.value)} className={`col-span-2 ${inputClass}`} required />
        <input type="text" placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
        <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} className={inputClass} />
        <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className={inputClass} />
      </div>
      <div className="flex gap-2 mt-3">
        <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md text-sm font-medium">Save</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm text-gray-400">Cancel</button>
      </div>
    </form>
  );
}
```

---

## data-llm Sync Points

| Component | data-llm Value | Purpose |
|-----------|---------------|---------|
| `StashBoard` root | `"User is viewing {n} links (filter: {f}). {x} overdue, {y} due soon. Total: {t}."` | Global context |
| `StashCard` on expand | `"User expanded: {title} - {url}"` | Focus awareness |
| `DeadlineRadar` | `"Radar: {n} overdue, {m} due soon, {k} this week"` | Deadline context |

---

## Build Priority

### Layer 1 — MUST SHIP (60 min) ⏱️ Hackathon Core
1. Supabase migration (5min)
2. MCP Server: 2 widgets + 5 tools with **auto-title extraction** (20min)
   - Widgets: `stash-board`, `stash-status`
   - Tools: `add-link`, `update-link`, `delete-link`, `bulk-update`, `import-links`
3. Bridge file (2min)
4. Widget: `stash-board.tsx` with **search bar** (⌘K), **"Surprise Me"**, **keyboard shortcuts** (⌘N) (15min)
5. Widget: `stash-status.tsx` health dashboard (10min)
6. Components: `StashCard`, `DeadlineRadar`, `FilterTabs`, `AddLinkForm` (8min)
7. `data-llm` sync + Supabase Realtime (5min)
8. **Import sample data** (examples/sample-data.json) for instant demo (2min)

### Layer 2 — SHOULD SHIP (15 min) - Nice to Have
1. Sort dropdown (created_at, due_date, title)
2. Tag filtering chips
3. Link favicons

### Layer 3 — WEEKEND POLISH - Future Enhancements
1. AI tagging suggestions
2. Content summarization for links
3. Smart reading recommendations
4. Theme toggle
5. Framer Motion animations

---

## Claude Interaction Examples

**Adding Links:**
```
User: "Save docs.docker.com/multi-stage, tag devops, due Friday"
Claude: calls add-link tool → "✓ Saved [link] to your stash (due 2026-02-28)"
Widget: New card appears via Realtime, deadline radar updates
```

**Querying (Claude reads widget state via data-llm):**
```
User: "What's overdue?"
Claude: Reads data-llm context → "You have 2 overdue items: [Docker tutorial] and [K8s article]"
Widget: User can see same items highlighted in red in deadline radar
```

**Natural Language Search:**
```
User: "Find that Kubernetes article"
Claude: Reads all links from last stash-board call → "Found 3 Kubernetes links: [list]. Which one?"
Widget: User can also filter locally by typing in search
```

**Bulk Operations:**
```
User: "Archive everything I've read"
Claude: calls bulk-update(filter_status: "read", action: "archive")
Widget: Cards animate out, moved to Archived tab via Realtime
```

**Discovery:**
```
User: "Show me something random"
Claude: Reads unread links from data-llm → Picks random item → "How about this: [Docker multi-stage builds]?"
Widget: User clicks "Surprise Me" button for instant random pick
```

**Bulk Import (Hackathon Feature):**
```
User: "Import these 12 dev links from examples/sample-data.json"
Claude: Reads JSON file → calls import-links with array → "✓ Successfully imported 12 links to your stash! 🎉"
Widget: All cards appear via Realtime, organized by tags
```

**System Health Check (Hackathon Feature):**
```
User: "Show system status" or "Is everything connected?"
Claude: calls stash-status widget
Widget: Displays health dashboard:
  - Supabase ✅ (45ms latency)
  - Clerk ✅ (user: abc123)
  - Cache: 12 title entries, 3 rate limiters
  - Storage: 847 links (1.7 MB)
```

---

## Security

**Implemented protections:**

1. **Authentication & Authorization**
   - ✅ Clerk auth for user identification
   - ✅ Supabase RLS (Row Level Security) isolates user data
   - ✅ All tools check `authInfo?.sub` for user ID

2. **SSRF Protection**
   - ✅ Blocks localhost and private IP ranges (127.x, 192.168.x, 10.x, 172.16-31.x)
   - ✅ Validates URL format before fetching

3. **Input Validation**
   - ✅ Zod schema validation on all inputs
   - ✅ URL validation (valid HTTP/HTTPS URLs only)
   - ✅ Title max 200 chars
   - ✅ Note max 1000 chars
   - ✅ Max 10 tags, 50 chars each
   - ✅ Due date regex validation (YYYY-MM-DD)

4. **XSS Protection**
   - ✅ React escapes all user content by default
   - ✅ Fetched HTML titles are sanitized (HTML entities decoded, length limited)

5. **Content Security Policy**
   - ✅ CSP allows opening any saved URL via `redirectDomains: ["*"]`
   - ✅ Widget runs in sandboxed iframe

6. **Rate Limiting** (Hackathon Optimized)
   - ✅ Title fetches: **50 requests per minute per user** (raised for fast imports)
   - ✅ Title cache with 24-hour TTL reduces external fetches
   - ✅ Title fetch has 3s timeout to prevent long-running requests
   - ✅ Bulk operations limited to **500 items** at a time (raised for demo data)
   - ⚠️ Cache cleanup removed (not needed in 48hr hackathon)

---

## Files to Create/Modify

| Starter File | Action | Stash File |
|-------------|--------|-----------|
| `supabase/migrations/` | Replace | `001_stash_items.sql` |
| `server/src/index.ts` | Replace | **2 widgets + 5 tools** MCP server |
| `server/src/supabase.ts` | Keep | Same client |
| `web/src/skybridge.ts` | Replace | Stash types |
| `web/src/widgets/kanban.tsx` | Delete → Create | `stash-board.tsx` |
| `web/src/widgets/` | **Create NEW** | **`stash-status.tsx`** (health dashboard) |
| `web/src/components/` | Create | 4 new components |
| **`examples/`** | **Create NEW** | **`sample-data.json`** (demo data) |
| `.env` | Keep | Same vars |
| Cloudflare + Alpic | Keep | Same config |

---

## Design Tokens

```
bg-primary:    #0a0a0a (gray-950)
bg-card:       #111111 (gray-900)
border:        #1f1f1f (gray-800)
text-primary:  #ffffff
text-secondary:#9ca3af (gray-400)
accent:        #6c5ce7 (purple-600)
overdue:       #ff6b6b (red-400/500)
due-soon:      #ffa94d (amber-400/500)
ok:            #51cf66 (green-400)
```
