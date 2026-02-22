# Stash MCP App

> **"Stash everything. Claude finds it."**

AI-powered link manager with **bidirectional AI-UI collaboration**.

**Claude Code London Hack Night — Feb 20, 2026**

---

## Live Demo

Deploy your own instance using:
```bash
npx alpic deploy
```

---

## What It Does

**2 Widgets:**
- **stash-board** — Main UI with filter tabs, search, category chips, deadline radar
- **stash-status** — Health dashboard

**5 Tools:**
- **add-link** — Save with auto-title
- **update-link** — Edit fields
- **delete-link** — Remove links
- **bulk-update** — Batch operations
- **import-links** — JSON import

---

## Quick Start

```bash
npm install
npx skybridge start
```

Open http://localhost:3000

**Try with Claude:**
```
"Show my stash board"
"Add a link to github.com, tag dev"
"What links do I have?"
"Archive all dev links"
```

---

## Key Features

- **Bidirectional sync** — Claude reads widget state via `data-llm`
- **Type-safe hooks** — `generateHelpers<AppType>()` pattern
- **Filter tabs** — All/Active/Archived
- **Search** — ⌘K to focus
- **Categories** — Click chips to filter
- **Deadline radar** — Sidebar showing overdue items
- **Surprise Me** — Random link picker

---

## Tech Stack

- **Skybridge** — Type-safe MCP framework
- **React + TypeScript + Tailwind**
- **Alpic** — Deployment platform
- In-memory store (no database needed)

---

## Deploy

```bash
npx alpic deploy
```

---

## Documentation

**Start here:**
1. **[FOR_JUDGES.md](FOR_JUDGES.md)** — 3-min overview, demo script, key patterns
2. **[STATUS.md](STATUS.md)** — What's implemented (checklist)

**Go deeper:**
3. **[FOR_JUDGES_DETAILED.md](FOR_JUDGES_DETAILED.md)** — All patterns with full code
4. **[SPEC.md](SPEC.md)** — Complete technical specification
5. **[QUICKSTART.md](QUICKSTART.md)** — Build guide

**Future:**
6. **[ROADMAP.md](ROADMAP.md)** — Stage 2/3 enhancements

---

**Built with Skybridge + Alpic**
