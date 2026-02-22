import { useState } from "react";

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

interface Props {
  link: StashItem;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function StashCard({ link, onStatusChange, onDelete, isLoading = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const now = new Date();
  const dueDate = link.due_date ? new Date(link.due_date) : null;
  const isOverdue = dueDate && dueDate < now && link.status !== "archived";
  const isDueSoon = dueDate && !isOverdue && dueDate <= new Date(now.getTime() + 2 * 86400000);
  const borderColor = isOverdue ? "border-l-red-500" : isDueSoon ? "border-l-amber-500" : "border-l-gray-700";
  const nextStatus = link.status === "active" ? "archived" : "active";

  // Check if note is long enough to need expansion
  const noteNeedsExpansion = link.note && link.note.length > 100;

  return (
    <div className={`bg-gray-900 rounded-lg border-l-4 ${borderColor} p-4 hover:bg-gray-800 hover:shadow-lg transition-all duration-200 ease-in-out`}>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-purple-400 hover:text-purple-300 font-medium text-sm line-clamp-2 transition-colors duration-150"
        aria-label={`Open ${link.title || link.url}`}
      >
        {link.title || link.url}
      </a>
      <p className="text-xs text-gray-500 mt-1 truncate">{link.url}</p>
      {link.note && (
        <div className="mt-2">
          <p className={`text-sm text-gray-300 italic ${!isExpanded && noteNeedsExpansion ? 'line-clamp-2' : ''}`}>
            {link.note}
          </p>
          {noteNeedsExpansion && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-purple-400 hover:text-purple-300 mt-1 transition-colors duration-150"
              aria-label={isExpanded ? "Show less" : "Read more"}
            >
              {isExpanded ? "Show less" : "Read more..."}
            </button>
          )}
        </div>
      )}
      {link.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {link.tags.map(tag => (
            <span
              key={tag}
              className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full transition-colors duration-150 hover:bg-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
        <div className="text-xs text-gray-500 font-medium">
          {dueDate ? (
            <span className={`${isOverdue ? "text-red-400 font-semibold" : isDueSoon ? "text-amber-400 font-semibold" : ""}`}>
              {isOverdue ? "⚠️ Overdue" : `Due ${dueDate.toLocaleDateString()}`}
            </span>
          ) : "No deadline"}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange(link.id, nextStatus)}
            className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={isLoading}
            aria-label={link.status === "active" ? "Archive link" : "Restore link"}
          >
            {isLoading ? "..." : link.status === "active" ? "📦 Archive" : "↩️ Restore"}
          </button>
          <button
            onClick={() => onDelete(link.id)}
            className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-red-600/20 text-gray-400 hover:text-red-400 rounded-md border border-gray-700 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500/50"
            disabled={isLoading}
            aria-label="Delete link"
          >
            {isLoading ? "..." : "🗑️ Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
