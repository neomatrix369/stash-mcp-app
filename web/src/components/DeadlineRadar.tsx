type StashItem = {
  id: string;
  url: string;
  title: string | null;
  due_date: string | null;
  status: string;
  tags: string[];
  note?: string | null;
};

export function DeadlineRadar({ links }: { links: StashItem[] }) {
  const now = new Date();
  const twoDays = new Date(now.getTime() + 2 * 86400000);
  const weekEnd = new Date(now.getTime() + 7 * 86400000);
  const withDue = links.filter(l => l.due_date && l.status !== "archived");

  const overdue = withDue.filter(l => new Date(l.due_date!) < now);
  const dueSoon = withDue.filter(l => {
    const d = new Date(l.due_date!);
    return d >= now && d <= twoDays;
  });
  const thisWeek = withDue.filter(l => {
    const d = new Date(l.due_date!);
    return d > twoDays && d <= weekEnd;
  });

  const Section = ({ title, items, color }: { title: string; items: StashItem[]; color: string }) =>
    items.length > 0 ? (
      <div className="mb-4">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${color} mb-2`}>
          {title} ({items.length})
        </h3>
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-800">
            <span className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`} />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 truncate flex-1 hover:text-purple-400"
            >
              {item.title || item.url}
            </a>
            <span className="text-xs text-gray-500">
              {new Date(item.due_date!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <aside className="w-64 border-l border-gray-800 p-4 overflow-y-auto bg-gray-950 hidden lg:block">
      <h2 className="text-sm font-bold text-gray-300 mb-4">Deadline Radar</h2>
      <Section title="Overdue" items={overdue} color="text-red-400" />
      <Section title="Due Soon" items={dueSoon} color="text-amber-400" />
      <Section title="This Week" items={thisWeek} color="text-green-400" />
      {withDue.length === 0 && (
        <p className="text-sm text-gray-600 text-center py-8">No deadlines set</p>
      )}
    </aside>
  );
}
