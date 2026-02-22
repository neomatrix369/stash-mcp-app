interface Props {
  active: string;
  onChange: (filter: string) => void;
  counts: { all: number; active: number; archived: number };
}

export function FilterTabs({ active, onChange, counts }: Props) {
  const tabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "active", label: "Active", count: counts.active },
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
