import { useState } from "react";

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
  const [isExpanded, setIsExpanded] = useState(false);
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

  const urgentCount = overdue.length + dueSoon.length;

  const Section = ({ title, items, color, icon }: { title: string; items: StashItem[]; color: string; icon: string }) =>
    items.length > 0 ? (
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${color} mb-2 flex items-center gap-2`}>
          <span>{icon}</span>
          {title} <span className="font-normal opacity-75">({items.length})</span>
        </h3>
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-gray-800/50 transition-all duration-150 group"
          >
            <span className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")} flex-shrink-0`} />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-300 truncate flex-1 hover:text-purple-400 transition-colors duration-150 group-hover:translate-x-0.5"
              title={item.title || item.url}
            >
              {item.title || item.url}
            </a>
            <span className="text-xs text-gray-500 font-medium flex-shrink-0">
              {new Date(item.due_date!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-72 border-l border-gray-800 p-5 overflow-y-auto bg-gray-950 hidden lg:block" aria-label="Deadline radar">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-200 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            Deadline Radar
          </h2>
          {urgentCount > 0 && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30">
              {urgentCount}
            </span>
          )}
        </div>
        <Section title="Overdue" items={overdue} color="text-red-400" icon="🚨" />
        <Section title="Due Soon" items={dueSoon} color="text-amber-400" icon="⏰" />
        <Section title="This Week" items={thisWeek} color="text-green-400" icon="📅" />
        {withDue.length === 0 && (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-sm text-gray-500">No deadlines set</p>
          </div>
        )}
      </aside>

      {/* Mobile floating badge */}
      {urgentCount > 0 && (
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 active:scale-95"
            aria-label={`${urgentCount} urgent deadline${urgentCount > 1 ? 's' : ''}`}
          >
            <span className="text-2xl">🚨</span>
            <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-red-500">
              {urgentCount}
            </span>
          </button>

          {/* Mobile modal */}
          {isExpanded && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
              onClick={() => setIsExpanded(false)}
            >
              <div
                className="absolute bottom-20 right-4 left-4 bg-gray-900 border border-gray-700 rounded-xl p-5 shadow-2xl max-h-96 overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-200 flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    Urgent Deadlines
                  </h2>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <Section title="Overdue" items={overdue} color="text-red-400" icon="🚨" />
                <Section title="Due Soon" items={dueSoon} color="text-amber-400" icon="⏰" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
