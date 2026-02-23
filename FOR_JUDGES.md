# Stash MCP App — Quick Guide for Judges

**Read time: 3 minutes**

---

## What Is This?

A link manager demonstrating **bidirectional AI-UI collaboration** using MCP + Skybridge.

---

## Quick Setup (2 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Start local server
npx skybridge start

# 3. Open http://localhost:3000
```

### Optional: Deploy Your Own Instance

**Quick Setup:**
```bash
# 1. Create account at https://app.alpic.ai (GitHub/Google/email signup)
# 2. Get API key (team settings → API Keys → New API key)
# 3. Create .env file
cp .env.example .env
# 4. Add your key: ALPIC_API_KEY=your-key-here
# 5. Deploy
npx alpic deploy
# 6. Copy the deployed URL from output
```

**Connect to ChatGPT/Claude:**
- Use the deployed URL as your MCP server endpoint
- In ChatGPT: Settings → Integrations → MCP → Add URL
- In Claude Desktop: Add to `claude_desktop_config.json`

No `.env` needed for local development - only for deployment!

---

## The Key Innovation

```
Traditional: User → UI → API → Database (AI separate)
MCP Way:     User ↔ Claude ↔ Widget (same data, instant sync)
```

Claude can **read what the user sees** via `data-llm` attributes, and both can **modify the same data** through MCP tools.

---

## 2-Minute Demo

| Step | Say This | What Happens |
|------|----------|--------------|
| 1 | "Show my stash board" | Widget with 4 demo links appears |
| 2 | "Add youtube.com, tag video" | New card appears instantly |
| 3 | "What's tagged dev?" | Claude reads widget state, responds |
| 4 | Click Archive on a card | Widget updates, Claude sees change |
| 5 | "Show system status" | Health dashboard appears |

---

## What's Implemented

**Widgets:** stash-board (main), stash-status (health)

**Tools:** add-link, update-link, delete-link, bulk-update, import-links

**UI Features:**
- Filter tabs (All/Active/Archived)
- Search bar (⌘K)
- Category chips
- Deadline radar sidebar
- Surprise Me button
- Add link form (⌘N)

---

## 3 Patterns Worth Noting

### 1. Type-Safe Hooks
```typescript
export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
// Full autocomplete, compile-time errors for wrong tool names
```

### 2. Bidirectional Sync
```tsx
<div data-llm={`Viewing ${links.length} links, ${overdue} overdue`}>
// Claude reads this → knows what user sees
```

### 3. Dual-Purpose Responses
```typescript
return {
  structuredContent: { links },  // Widget gets JSON
  content: [{ type: "text", text: "You have 5 links" }]  // Claude gets text
};
```

**Want all 9 patterns?** See [FOR_JUDGES_DETAILED.md](FOR_JUDGES_DETAILED.md) for complete patterns with full code examples.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Skybridge |
| Frontend | React + TypeScript + Tailwind |
| Storage | In-memory (Stage 1) |
| Deploy | Alpic |

---

## File Structure

```
server/src/index.ts     → 2 widgets + 5 tools
web/src/widgets/        → React widget components
web/src/components/     → StashCard, FilterTabs, AddLinkForm, DeadlineRadar
```

---

## Testing (Optional)

Want to verify everything works?

```bash
npm run test:local  # 24 tests, all passing
```

**Full test guide:** See **[tests/README.md](tests/README.md)** for testing all environments

---

## Navigation

| Next | Description |
|------|-------------|
| **[STATUS.md](STATUS.md)** | Full checklist of what's implemented |
| **[FOR_JUDGES_DETAILED.md](FOR_JUDGES_DETAILED.md)** | All 9 patterns with full code, copy-paste nuggets |
| **[SPEC.md](SPEC.md)** | Complete technical specification |
| **[tests/README.md](tests/README.md)** | Complete testing guide |
| **[ROADMAP.md](ROADMAP.md)** | Future enhancements (Stage 2/3) |

---

**Built for Claude Code London Hack Night — Feb 20, 2026**
