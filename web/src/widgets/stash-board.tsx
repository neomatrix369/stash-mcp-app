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
      <div className="flex h-full items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">📚</div>
          <p className="text-gray-400 font-medium animate-pulse">Loading your stash...</p>
        </div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-red-400 font-semibold">No data available</p>
          <p className="text-gray-500 text-sm mt-2">Please check your connection</p>
        </div>
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
        <header className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-gray-900/50">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-purple-400">📚</span>
              Stash
            </h1>
            <p className="text-sm text-gray-400 mt-0.5 font-medium">
              <span className="text-purple-400 font-semibold">{links.length}</span> saved links
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSurprise}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 rounded-lg text-sm font-semibold text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50 shadow-sm hover:shadow-md"
              title="Pick a random link"
              aria-label="Pick a random link"
            >
              🎲 Surprise Me
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm hover:shadow-md"
              title="Add new link (⌘N)"
              disabled={isAdding}
              aria-label="Add new link"
            >
              {isAdding ? "⏳ Adding..." : "➕ Add Link"}
            </button>
          </div>
        </header>

        {/* Surprise Me overlay */}
        {surpriseLink && (
          <div className="mx-6 mt-4 p-5 bg-gradient-to-br from-purple-900/40 to-pink-900/30 border border-purple-500/50 rounded-xl shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-purple-300 font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="text-base">🎲</span>
                Surprise Pick
              </p>
              <button
                onClick={() => setSurpriseLink(null)}
                className="text-gray-400 hover:text-white transition-colors duration-150"
                aria-label="Dismiss surprise pick"
              >
                ✕
              </button>
            </div>
            <a
              href={surpriseLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-base font-semibold hover:text-purple-300 block mb-2 transition-colors duration-150"
            >
              {surpriseLink.title || surpriseLink.url}
            </a>
            {surpriseLink.note && (
              <p className="text-sm text-gray-300 mb-3 italic border-l-2 border-purple-500/50 pl-3">
                {surpriseLink.note}
              </p>
            )}
            {surpriseLink.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {surpriseLink.tags.map(tag => (
                  <span key={tag} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSurprise}
                className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                🎲 Try Another
              </button>
              <a
                href={surpriseLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
              >
                🚀 Open Link
              </a>
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
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-sm">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Search links by title, note, URL, or tags... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition-all duration-200"
              aria-label="Search links"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors duration-150"
                aria-label="Clear search"
              >
                <span className="text-lg">✕</span>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
              <span className="font-semibold text-purple-400">{filtered.length}</span>
              result{filtered.length !== 1 ? 's' : ''} for
              <span className="font-medium text-gray-300">"{searchQuery}"</span>
            </p>
          )}
        </div>

        {/* Category filter chips */}
        {allCategories.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-800 bg-gray-950/50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest mr-1">🏷️ Categories:</span>
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                  !activeCategory
                    ? "bg-purple-600 text-white shadow-sm border border-purple-500/50"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-transparent"
                }`}
                aria-pressed={!activeCategory}
              >
                All ({links.length})
              </button>
              {allCategories.slice(0, 12).map(category => {
                const count = links.filter(l => l.tags.includes(category)).length;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category === activeCategory ? null : category)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                      activeCategory === category
                        ? "bg-purple-600 text-white shadow-sm border border-purple-500/50"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-transparent"
                    }`}
                    aria-pressed={activeCategory === category}
                  >
                    {category} ({count})
                  </button>
                );
              })}
              {allCategories.length > 12 && (
                <span className="text-xs text-gray-500 font-medium px-2">+{allCategories.length - 12} more</span>
              )}
            </div>
          </div>
        )}

        {/* Links Grid */}
        <div className="flex-1 overflow-y-auto p-6" role="region" aria-label="Links list" id={`${activeFilter}-panel`}>
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <div className="text-5xl mb-4">
                {searchQuery || activeFilter !== "all" || activeCategory ? "🔍" : "📭"}
              </div>
              <p className="text-xl font-semibold text-gray-300 mb-3">
                {searchQuery || activeFilter !== "all" || activeCategory
                  ? "No matching links"
                  : "Your stash is empty"}
              </p>
              {searchQuery && (
                <p className="text-sm text-gray-400 mb-4">
                  Try adjusting your search or filters
                </p>
              )}
              {!searchQuery && activeFilter === "all" && !activeCategory && (
                <div className="text-sm space-y-3 max-w-md mx-auto">
                  <p className="text-gray-400 font-medium">Get started by asking Claude:</p>
                  <code className="block bg-gray-800/50 px-5 py-3 rounded-lg text-purple-400 text-left border border-gray-700 hover:border-purple-500/50 transition-colors duration-200">
                    "Save reddit.com/r/programming, tag dev"
                  </code>
                  <code className="block bg-gray-800/50 px-5 py-3 rounded-lg text-purple-400 text-left border border-gray-700 hover:border-purple-500/50 transition-colors duration-200">
                    "Add docs.docker.com, due Friday"
                  </code>
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-xs text-gray-500">
                      Or click <span className="text-purple-400 font-semibold">➕ Add Link</span> above
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
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
