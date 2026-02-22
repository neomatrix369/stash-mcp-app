import { useState } from "react";

interface Props {
  onSubmit: (data: { url: string; title?: string; note?: string; tags?: string[]; due_date?: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AddLinkForm({ onSubmit, onCancel, isLoading = false }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    onSubmit({
      url,
      title: title || undefined,
      note: note || undefined,
      tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      due_date: dueDate || undefined,
    });
  };

  const inputClass = "bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="url"
          placeholder="URL *"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className={`col-span-2 ${inputClass}`}
          required
          disabled={isLoading}
        />
        <input
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className={inputClass}
          disabled={isLoading}
        />
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className={inputClass}
          disabled={isLoading}
        />
        <input
          type="text"
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={e => setTags(e.target.value)}
          className={inputClass}
          disabled={isLoading}
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={e => setNote(e.target.value)}
          className={inputClass}
          disabled={isLoading}
        />
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md text-sm font-medium disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm text-gray-400"
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
