interface Props {
  active: string;
  onChange: (filter: string) => void;
  counts: { all: number; active: number; archived: number };
}

export function FilterTabs({ active, onChange, counts }: Props) {
  const tabs = [
    { key: "all", label: "All", count: counts.all, icon: "📑" },
    { key: "active", label: "Active", count: counts.active, icon: "⚡" },
    { key: "archived", label: "Archived", count: counts.archived, icon: "📦" },
  ];

  return (
    <div className="flex gap-2 px-6 py-3 border-b border-gray-800" role="tablist" aria-label="Link status filter">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          role="tab"
          aria-selected={active === tab.key}
          aria-controls={`${tab.key}-panel`}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
            active === tab.key
              ? "bg-purple-600/20 text-purple-400 shadow-sm border border-purple-500/30"
              : "text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent"
          }`}
        >
          <span className="mr-1.5">{tab.icon}</span>
          {tab.label}
          <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
            active === tab.key ? "bg-purple-500/30" : "bg-gray-700/50"
          } transition-colors duration-200`}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
