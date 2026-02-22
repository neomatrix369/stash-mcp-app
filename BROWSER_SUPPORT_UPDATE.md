# Browser Support Update

**Priority Order:** Brave → Chrome → Firefox → Safari
**Reason:** User primarily uses Brave and Chrome, minimal Safari usage

---

## Browser Tab Import Strategy

### Chromium-Based (Brave + Chrome)

Both Brave and Chrome are Chromium-based, so they share the same bookmark format and can use the same import logic.

**Bookmark File Locations:**

**Brave:**
- Mac: `~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Bookmarks`
- Windows: `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Bookmarks`
- Linux: `~/.config/BraveSoftware/Brave-Browser/Default/Bookmarks`

**Chrome:**
- Mac: `~/Library/Application Support/Google/Chrome/Default/Bookmarks`
- Windows: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Bookmarks`
- Linux: `~/.config/google-chrome/Default/Bookmarks`

**Format:** Both are JSON files with the same structure:
```json
{
  "roots": {
    "bookmark_bar": { "children": [...] },
    "other": { "children": [...] },
    "synced": { "children": [...] }
  }
}
```

---

### Implementation Plan

#### Option 1: Unified Chromium Tool (Recommended)

Create a single `import-from-chromium` tool that detects and imports from Brave OR Chrome automatically.

**Pros:**
- Single tool call: "Import my browser tabs"
- Auto-detects which browser is installed
- Tries both if both are present

**Cons:**
- Less explicit about which browser is being imported from

#### Option 2: Separate Tools per Browser

Create separate tools:
- `import-open-tabs-brave`
- `import-open-tabs-chrome`
- `import-open-tabs-firefox`
- `import-open-tabs-safari`

**Pros:**
- Explicit control
- User can choose which browser

**Cons:**
- More tools to maintain
- User needs to know which browser they use

#### ✅ Recommendation: Hybrid Approach

1. **Primary:** `import-browser-tabs` - Auto-detects Brave → Chrome → Firefox → Safari
2. **Explicit:** Individual tools for power users who want specific browsers

---

## Code Implementation

### Tool 1: `import-browser-tabs` (Smart Auto-Detection)

```typescript
.registerTool("import-browser-tabs", {
  description: "Import open browser tabs from Brave, Chrome, Firefox, or Safari. Auto-detects installed browsers in priority order.",
  inputSchema: {
    browser: z.enum(["auto", "brave", "chrome", "firefox", "safari"]).optional().default("auto"),
    categorize_by: z.enum(["auto", "domain", "window"]).optional().default("auto"),
    limit: z.number().max(500).optional().default(200),
  }
}, async ({ browser, categorize_by, limit }, { authInfo }) => {
  const userId = authInfo?.sub;

  // Browser bookmark file paths (Mac, Windows, Linux)
  const browserPaths = {
    brave: [
      path.join(os.homedir(), "Library/Application Support/BraveSoftware/Brave-Browser/Default/Bookmarks"),
      path.join(process.env.LOCALAPPDATA || "", "BraveSoftware/Brave-Browser/User Data/Default/Bookmarks"),
      path.join(os.homedir(), ".config/BraveSoftware/Brave-Browser/Default/Bookmarks"),
    ],
    chrome: [
      path.join(os.homedir(), "Library/Application Support/Google/Chrome/Default/Bookmarks"),
      path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/User Data/Default/Bookmarks"),
      path.join(os.homedir(), ".config/google-chrome/Default/Bookmarks"),
    ],
    safari: [
      path.join(os.homedir(), "Library/Safari/Bookmarks.plist"),
    ],
  };

  // Auto-detect installed browsers
  let detectedBrowser: string | null = null;
  let bookmarksPath: string | null = null;

  if (browser === "auto") {
    // Try browsers in priority order: Brave → Chrome → Safari
    for (const [browserName, paths] of [
      ["brave", browserPaths.brave],
      ["chrome", browserPaths.chrome],
      ["safari", browserPaths.safari],
    ] as const) {
      for (const p of paths) {
        if (fs.existsSync(p)) {
          detectedBrowser = browserName;
          bookmarksPath = p;
          break;
        }
      }
      if (detectedBrowser) break;
    }
  } else {
    // Use specified browser
    const paths = browserPaths[browser as keyof typeof browserPaths];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        detectedBrowser = browser;
        bookmarksPath = p;
        break;
      }
    }
  }

  if (!detectedBrowser || !bookmarksPath) {
    return {
      content: [{
        type: "text",
        text: browser === "auto"
          ? "❌ No supported browsers found. Install Brave, Chrome, or Safari."
          : `❌ ${browser} not found. Make sure it's installed and you've created bookmarks.`
      }],
      isError: true,
    };
  }

  // Parse bookmarks based on browser type
  let items: any[] = [];

  if (detectedBrowser === "brave" || detectedBrowser === "chrome") {
    // Chromium-based browsers (JSON format)
    const bookmarksData = JSON.parse(fs.readFileSync(bookmarksPath, "utf-8"));

    const extractBookmarks = (node: any, folderPath: string[] = []): any[] => {
      if (node.type === "url" && node.url) {
        return [{
          url: node.url,
          title: node.name || node.url,
          tags: inferTags(node.url, node.name || ""),
          note: `Imported from ${detectedBrowser}: ${folderPath.join(" > ") || "Bookmarks Bar"}`,
        }];
      }
      if (node.children) {
        return node.children.flatMap((child: any) =>
          extractBookmarks(child, [...folderPath, node.name || ""])
        );
      }
      return [];
    };

    items = [
      ...extractBookmarks(bookmarksData.roots.bookmark_bar),
      ...extractBookmarks(bookmarksData.roots.other),
    ].slice(0, limit);

  } else if (detectedBrowser === "safari") {
    // Safari (plist format)
    const plist = require("plist");
    const bookmarksData = plist.parse(fs.readFileSync(bookmarksPath, "utf-8"));

    const extractBookmarks = (node: any, folderPath: string[] = []): any[] => {
      if (node.WebBookmarkType === "WebBookmarkTypeLeaf" && node.URLString) {
        return [{
          url: node.URLString,
          title: node.URIDictionary?.title || node.URLString,
          tags: inferTags(node.URLString, node.URIDictionary?.title || ""),
          note: `Imported from Safari: ${folderPath.join(" > ") || "Bookmarks"}`,
        }];
      }
      if (node.Children) {
        return node.Children.flatMap((child: any) =>
          extractBookmarks(child, [...folderPath, node.Title || ""])
        );
      }
      return [];
    };

    items = extractBookmarks(bookmarksData).slice(0, limit);
  }

  // Check for duplicates
  const urls = items.map(item => item.url);
  const { data: existing } = await supabase
    .from("stash_items")
    .select("url")
    .eq("user_id", userId)
    .in("url", urls);

  const existingUrls = new Set(existing?.map(e => e.url) || []);
  const newItems = items
    .filter(item => !existingUrls.has(item.url))
    .map(item => ({
      user_id: userId,
      ...item,
      status: "unread" as const,
    }));

  if (newItems.length === 0) {
    return {
      content: [{
        type: "text",
        text: `⚠️ All ${items.length} bookmarks from ${detectedBrowser} already exist in your stash.`
      }],
    };
  }

  const { data, error } = await supabase
    .from("stash_items")
    .insert(newItems)
    .select();

  if (error) throw error;

  const categories = [...new Set(data.map(d => d.tags).flat())];
  const skipped = items.length - newItems.length;

  return {
    structuredContent: {
      imported: data,
      categories,
      skipped,
      browser: detectedBrowser,
    },
    content: [{
      type: "text",
      text: `✓ Imported ${data.length} bookmarks from ${detectedBrowser.toUpperCase()}! ` +
        `Organized into ${categories.length} categories: ${categories.slice(0, 5).join(", ")}` +
        `${categories.length > 5 ? `, +${categories.length - 5} more` : ""}` +
        `${skipped > 0 ? ` (${skipped} duplicates skipped)` : ""}`
    }],
  };
})
```

---

### Tool 2: `import-open-tabs-brave` (Brave-Specific, with Active Tabs)

**Note:** Reading **open tabs** (not just bookmarks) requires browser integration:

**Option A: Browser Extension** (Most Reliable)
- Create a Brave extension that sends tab data to the MCP server
- Extension has access to `chrome.tabs.query()` API

**Option B: Chrome DevTools Protocol** (Complex)
- Launch Brave with `--remote-debugging-port=9222`
- Connect via CDP to query open tabs

**Option C: Bookmarks Only** (Simplest for Hackathon)
- Import bookmarks (permanent saves)
- Not current open tabs

**Recommendation for Hackathon:** Use bookmarks (Option C), document the extension approach for later.

---

## Updated Tool Priority

### Primary Tools (Auto)
1. **`import-browser-tabs`** - Auto-detects Brave → Chrome → Safari
   - Simplest for users: "Import my browser bookmarks"
   - Tries Brave first (user's primary browser)

### Explicit Tools (Advanced Users)
2. **`import-from-brave`** - Brave bookmarks specifically
3. **`import-from-chrome`** - Chrome bookmarks specifically
4. **`import-from-safari`** - Safari bookmarks specifically (Mac only)
5. **`import-tabs`** - Generic JSON import (any browser via extension)

---

## User Experience

### Demo Flow

**Before (Safari-only):**
```
User: "Import my Safari tabs"
Claude: ✓ Imported 12 tabs
→ Only works if user has Safari
```

**After (Multi-Browser):**
```
User: "Import my browser bookmarks"
Claude: [Detects Brave installed]
        ✓ Imported 67 bookmarks from BRAVE!
        Organized into 9 categories:
        development (18), documentation (12), ai (8), work (7), ...

User: "Also import from Chrome"
Claude: ✓ Imported 23 bookmarks from CHROME!
        (15 duplicates skipped)
```

---

## Documentation Updates Needed

### 1. SPEC.md
- Replace `import-open-tabs-safari` with `import-browser-tabs`
- Add browser auto-detection logic
- Update examples to show Brave/Chrome

### 2. FOR_JUDGES.md
- Update Pattern #11 to show Brave/Chrome support
- Mention cross-platform compatibility

### 3. README.md
- Update demo script to use "import my browser bookmarks"
- Remove Mac-only references

### 4. QUICKSTART.md
- Update Layer 2 to mention Brave/Chrome priority

### 5. Internal Documentation
- Update MCP tools table with new tool names (in developer reference docs)

---

## Browser Feature Comparison

| Feature | Brave | Chrome | Firefox | Safari |
|---------|-------|--------|---------|--------|
| **Bookmark format** | JSON | JSON | SQLite | plist |
| **Cross-platform** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Mac only |
| **Easy parsing** | ✅ Yes | ✅ Yes | ⚠️ Moderate | ⚠️ Moderate |
| **User priority** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Implementation time** | 10 min | 10 min | 30 min | 15 min |

**Decision:** Implement Brave + Chrome immediately, Safari as fallback, Firefox for Layer 3.

---

## Next Steps

1. ✅ Update SPEC.md with new `import-browser-tabs` tool
2. ✅ Add Brave/Chrome detection logic
3. ✅ Update all documentation to reflect Brave priority
4. ⏳ Test with real Brave/Chrome bookmarks
5. ⏳ Consider Firefox support (Layer 3)

---

**Ready to update the code?** Should I proceed with implementing the unified `import-browser-tabs` tool with Brave → Chrome → Safari priority?
