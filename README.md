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

### Step 1: Create Your Alpic Account

If you don't have an Alpic account yet:

1. Visit [app.alpic.ai](https://app.alpic.ai)
2. Sign up with your preferred method (GitHub, Google, or email)
3. Complete the onboarding flow
4. Create or join a team (required for API access)

### Step 2: Get Your API Key

1. Sign in to [Alpic](https://app.alpic.ai)
2. Click your team name → **API Keys** → **New API key**
3. Copy the key (you won't see it again!)
4. Add to `.env`: `ALPIC_API_KEY=your-key-here`

### Step 3: Deploy Your App

```bash
# Copy .env.example to .env and fill in your API key
cp .env.example .env
# Edit .env and set: ALPIC_API_KEY=your-key-here

# Deploy
npx alpic deploy
```

The deploy command will:
- Build your app
- Upload to Alpic
- Return a public URL (e.g., `https://your-app-abc123.alpic.live`)

### Step 4: Connect to AI Assistants

After deployment, connect your app to ChatGPT or Claude:

**For ChatGPT:**
1. Copy your deployed URL from the deploy output
2. In ChatGPT, go to Settings → Integrations → MCP
3. Add your URL: `https://your-app-abc123.alpic.live`
4. Test: Say "Show my stash board"

**For Claude Desktop:**
1. Add to your `claude_desktop_config.json`:
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
2. Restart Claude Desktop
3. Test: Say "Show my stash board"

**For Claude Code CLI:**
- Your deployed app is automatically available if configured as an MCP server

---

## Environment Variables

### Quick Reference

| Variable | When You Need It | How to Get It |
|----------|------------------|---------------|
| **ALPIC_API_KEY** | 🚀 For deployment only | Get from [app.alpic.ai](https://app.alpic.ai) (team settings → API Keys) |
| **REMOTE_BASE_URL** | 🧪 For testing remote deployments | Your deployed URL (e.g., `https://your-app-abc123.alpic.live`) |
| **TEST_ENV** | ⚙️ Advanced testing | Auto-set by npm scripts - don't change manually |

### Setup by Scenario

**Just running locally?**
```bash
npm install
npx skybridge start
# No .env needed! ✨
```

**Want to deploy?**
```bash
cp .env.example .env
# Add: ALPIC_API_KEY=your-key-from-alpic
npx alpic deploy
```

**Want to test your deployment?**
```bash
# After deploying, add your deployed URL to .env:
# REMOTE_BASE_URL=https://your-app-abc123.alpic.live
npm run test:remote
```

See [.env.example](.env.example) for detailed comments on each variable.

---

## Testing

Comprehensive test suite with 72 tests across all environments.

**Quick test:**
```bash
npm run test:local  # Tests local server (no setup needed)
```

**Full test suite:**
See **[tests/README.md](tests/README.md)** for complete testing guide including:
- Setting up `.env` for remote testing
- Testing all 3 environments (local/remote/playground)
- Manual verification steps

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
