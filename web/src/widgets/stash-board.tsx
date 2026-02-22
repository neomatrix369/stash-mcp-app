import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";
import { useState, useEffect } from "react";
import { StashCard } from "../components/StashCard.js";
import { DeadlineRadar } from "../components/DeadlineRadar.js";
import { FilterTabs } from "../components/FilterTabs.js";
import { AddLinkForm } from "../components/AddLinkForm.js";

type StashItem = {
  id: string;
  url: string;
  title: string | null;
  note?: string | null;
  tags: string[];
  status: "active" | "archived";
  due_date: string | null;
  created_at?: string;
};

function StashBoard() {
  const { output, isPending } = useToolInfo<"stash-board">();
  const { callTool: deleteLink, isPending: isDeleting } = useCallTool("delete-link");
  const { callTool: updateLink, isPending: isUpdating } = useCallTool("update-link");
  const { callTool: addLink, isPending: isAdding } = useCallTool("add-link");

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [surpriseLink, setSurpriseLink] = useState<StashItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
      // Escape: Close form
      if (e.key === 'Escape') {
        setShowAddForm(false);
        setSurpriseLink(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-950 text-gray-400">
        <div className="animate-pulse">Loading your stash...</div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-950 text-red-500">
        No data available
      </div>
    );
  }

  const links: StashItem[] = output.links || [];

  // Extract all categories from links
  const allCategories = Array.from(new Set(links.flatMap(l => l.tags))).sort();

  // Apply status filter
  const statusFiltered = activeFilter === "all"
    ? links
    : links.filter(l => l.status === activeFilter);

  // Apply category filter
  const categoryFiltered = activeCategory
    ? statusFiltered.filter(l => l.tags.includes(activeCategory))
    : statusFiltered;

  // Apply search filter
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
    setLoadingId(id);
    await updateLink({ id, status: status as "active" | "archived" });
    setLoadingId(null);
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    await deleteLink({ id });
    setLoadingId(null);
  };

  const handleAddLink = async (data: { url: string; title?: string; note?: string; tags?: string[]; due_date?: string }) => {
    await addLink({
      url: data.url,
      tags: data.tags || [],
      title: data.title,
      due_date: data.due_date,
    });
    setShowAddForm(false);
  };

  const handleSurprise = () => {
    const active = links.filter(l => l.status === "active");
    if (active.length > 0) {
      setSurpriseLink(active[Math.floor(Math.random() * active.length)]);
    }
  };

  const llmContext = `User is viewing ${filtered.length} links (filter: ${activeFilter}${activeCategory ? `, category: "${activeCategory}"` : ""}${searchQuery ? `, search: "${searchQuery}"` : ""}). ${overdue.length} overdue, ${dueSoon.length} due soon. Total: ${links.length}. Available categories: ${allCategories.slice(0, 10).join(", ")}${allCategories.length > 10 ? `, +${allCategories.length - 10} more` : ""}.`;

  return (
    <div data-llm={llmContext} className="flex h-full bg-gray-950 text-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h1 className="text-xl font-bold">Stash</h1>
            <p className="text-sm text-gray-400">{links.length} saved links</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSurprise}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium"
              title="Pick a random link"
            >
              🎲 Surprise Me
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
              title="Add new link (⌘N)"
              disabled={isAdding}
            >
              {isAdding ? "Adding..." : "+ Add Link"}
            </button>
          </div>
        </header>

        {/* Surprise Me overlay */}
        {surpriseLink && (
          <div className="mx-6 mt-4 p-4 bg-purple-900/30 border border-purple-700/50 rounded-xl">
            <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-1">🎲 Surprise Pick</p>
            <a
              href={surpriseLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-medium hover:text-purple-300 block mb-1"
            >
              {surpriseLink.title || surpriseLink.url}
            </a>
            {surpriseLink.note && <p className="text-sm text-gray-400 mb-2">{surpriseLink.note}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={handleSurprise} className="text-xs text-purple-400 hover:text-purple-300">
                Try another
              </button>
              <button onClick={() => setSurpriseLink(null)} className="text-xs text-gray-500 hover:text-gray-400">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Add Link Form */}
        {showAddForm && (
          <AddLinkForm
            onSubmit={handleAddLink}
            onCancel={() => setShowAddForm(false)}
            isLoading={isAdding}
          />
        )}

        {/* Filter Tabs */}
        <FilterTabs
          active={activeFilter}
          onChange={setActiveFilter}
          counts={{
            all: links.length,
            active: links.filter(l => l.status === "active").length,
            archived: links.filter(l => l.status === "archived").length,
          }}
        />

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
              {allCategories.slice(0, 12).map(category => {
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
              {allCategories.length > 12 && (
                <span className="text-xs text-gray-600">+{allCategories.length - 12} more</span>
              )}
            </div>
          </div>
        )}

        {/* Links Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg mb-3">
                {searchQuery || activeFilter !== "all" || activeCategory
                  ? "No matching links"
                  : "Your stash is empty"}
              </p>
              {!searchQuery && activeFilter === "all" && !activeCategory && (
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
                  isLoading={loadingId === link.id || isDeleting || isUpdating}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deadline Radar Sidebar */}
      <DeadlineRadar links={links} />
    </div>
  );
}

export default StashBoard;

// REQUIRED: Mount the widget
mountWidget(<StashBoard />);
