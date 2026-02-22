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
  const now = new Date();
  const dueDate = link.due_date ? new Date(link.due_date) : null;
  const isOverdue = dueDate && dueDate < now && link.status !== "archived";
  const isDueSoon = dueDate && !isOverdue && dueDate <= new Date(now.getTime() + 2 * 86400000);
  const borderColor = isOverdue ? "border-l-red-500" : isDueSoon ? "border-l-amber-500" : "border-l-gray-700";
  const nextStatus = link.status === "active" ? "archived" : "active";

  return (
    <div className={`bg-gray-900 rounded-lg border-l-4 ${borderColor} p-4 hover:bg-gray-800 transition`}>
      <a href={link.url} target="_blank" rel="noopener noreferrer"
         className="text-purple-400 hover:text-purple-300 font-medium text-sm line-clamp-2">
        {link.title || link.url}
      </a>
      <p className="text-xs text-gray-500 mt-1 truncate">{link.url}</p>
      {link.note && <p className="text-sm text-gray-300 mt-2 line-clamp-2">{link.note}</p>}
      {link.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {link.tags.map(tag => (
            <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          {dueDate ? (
            <span className={isOverdue ? "text-red-400" : isDueSoon ? "text-amber-400" : ""}>
              {isOverdue ? "Overdue" : `Due ${dueDate.toLocaleDateString()}`}
            </span>
          ) : "No deadline"}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange(link.id, nextStatus)}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}>
            {isLoading ? "..." : link.status === "active" ? "Archive" : "Restore"}
          </button>
          <button
            onClick={() => onDelete(link.id)}
            className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}>
            {isLoading ? "..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
