# Stash MCP App — Detailed Patterns & Code

**For judges who want to dive deeper.** ← [Back to Quick Guide](FOR_JUDGES.md)

---

## All Reusable Patterns

### 1. Type-Safe Hook Generator

```typescript
// server/src/index.ts
const server = new McpServer(...)
  .registerWidget("stash-board", {...})
  .registerTool("add-link", {...});

export type AppType = typeof server;

// web/src/helpers.ts
import type { AppType } from "../../server/src/index";
export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
```

**Why it matters:** TypeScript catches wrong tool names at compile time, not runtime.

---

### 2. Bidirectional Context Sync

```tsx
const llmContext = `User is viewing ${filtered.length} links (filter: ${activeFilter}). ${overdue.length} overdue.`;

return <div data-llm={llmContext}>...</div>;
```

**Why it matters:** Claude can answer "What's overdue?" without a separate API call.

---

### 3. Structured Content Dual-Purpose

```typescript
return {
  structuredContent: { links, stats },  // Widget consumes JSON
  content: [{ type: "text", text: `Your stash has ${stats.total} links` }],  // Claude reads text
};
```

**Why it matters:** One response serves two consumers, no duplication.

---

### 4. Method Chaining Server

```typescript
const server = new McpServer({ name: "stash", version: "1.0.0" })
  .registerWidget("stash-board", {...}, {...}, async () => {...})
  .registerWidget("stash-status", {...}, {...}, async () => {...})
  .registerTool("add-link", {...}, async () => {...})
  .registerTool("update-link", {...}, async () => {...})
  .registerTool("delete-link", {...}, async () => {...});
```

**Why it matters:** All definitions in one place, TypeScript infers full type.

---

### 5. Zod Schema Validation

```typescript
inputSchema: {
  url: z.string().url().describe("The URL to save"),
  title: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(10),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}
```

**Why it matters:** Runtime + compile-time safety, auto-generated docs from `.describe()`.

---

### 6. Health Dashboard Widget

```typescript
.registerWidget("stash-status",
  { description: "System health dashboard" },
  { annotations: { readOnlyHint: true } },
  async () => ({
    structuredContent: {
      store: { status: "healthy", items: store.size },
      memory: { used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB" },
      uptime: Math.round(process.uptime()) + "s"
    },
    content: [{ type: "text", text: `System healthy. Store: ${store.size} items.` }]
  })
)
```

**Why it matters:** Instant debugging visibility during demos.

---

### 7. Bulk Import Tool

```typescript
.registerTool("import-links", {
  inputSchema: {
    links: z.array(z.object({
      url: z.string().url(),
      title: z.string().optional(),
      tags: z.array(z.string()).optional()
    })).max(100)
  }
}, async ({ links }) => {
  for (const item of links) {
    store.set(crypto.randomUUID(), {...});
  }
  return { content: [{ type: "text", text: `✓ Imported ${links.length} links!` }] };
})
```

**Why it matters:** Seed demo data in seconds.

---

### 8. Per-Card Loading States

```tsx
const [loadingId, setLoadingId] = useState<string | null>(null);

const handleStatusChange = async (id: string, status: string) => {
  setLoadingId(id);
  await updateLink({ id, status });
  setLoadingId(null);
};

<StashCard isLoading={loadingId === link.id} />
```

**Why it matters:** User can interact with other cards while one updates.

---

### 9. CSP Configuration

```typescript
.registerWidget("stash-board", {
  _meta: {
    ui: {
      csp: { redirectDomains: ["*"] },  // Allow opening any saved URL
    },
  },
})
```

**Why it matters:** Explicit security policy, sandboxed iframes.

---

## Architecture Decisions

### Decision 1: 2 Widgets, Not 9
**Why:** Widget per flow, not per tool. Better UX, simpler state.

### Decision 2: Client-Side Filtering
**Why:** All data loaded once, instant search. Good for <1000 items.

### Decision 3: In-Memory for Demo
**Why:** Zero deps, instant deploy, all patterns still visible.

---

## Copy-Paste Nuggets

### SSRF Protection
```typescript
const hostname = new URL(url).hostname.toLowerCase();
if (hostname === 'localhost' || hostname.startsWith('127.') ||
    hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
  throw new Error("Cannot fetch from private networks");
}
```

### Auto-Categorization
```typescript
function inferTags(url: string, title: string): string[] {
  const text = (url + " " + title).toLowerCase();
  const tags = [];
  if (text.match(/github|stackoverflow/)) tags.push("development");
  if (text.match(/youtube|video/)) tags.push("video");
  if (text.match(/docs|documentation/)) tags.push("documentation");
  return tags.length ? tags : ["uncategorized"];
}
```

---

## Metrics

| Metric | Value |
|--------|-------|
| Widgets | 2 |
| Tools | 5 |
| Components | 4 |
| External Deps | 0 |
| Type Coverage | 100% |

---

## References

- [SPEC.md](SPEC.md) — Full technical specification with all code
- [STATUS.md](STATUS.md) — Current implementation status
- [ROADMAP.md](ROADMAP.md) — Future enhancements

---

**Built for Claude Code London Hack Night — Feb 20, 2026**
