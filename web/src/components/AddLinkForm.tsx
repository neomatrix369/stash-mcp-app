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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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

  const inputClass = "bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out";
  const labelClass = "text-xs font-semibold text-gray-400 mb-1 block tracking-wider";

  return (
    <form
      onSubmit={handleSubmit}
      className="px-6 py-4 border-b border-gray-800 bg-gray-900/50 animate-in slide-in-from-top-2 duration-300"
      aria-label="Add new link form"
    >
      <h3 className="text-sm font-bold text-gray-200 mb-3">Add New Link</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label htmlFor="url-input" className={labelClass}>
            URL <span className="text-red-400">*</span>
          </label>
          <input
            id="url-input"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className={inputClass}
            required
            disabled={isLoading}
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="title-input" className={labelClass}>
            TITLE
          </label>
          <input
            id="title-input"
            type="text"
            placeholder="Link title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={inputClass}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="due-date-input" className={labelClass}>
            DUE DATE
          </label>
          <input
            id="due-date-input"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className={inputClass}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="tags-input" className={labelClass}>
            TAGS
          </label>
          <input
            id="tags-input"
            type="text"
            placeholder="dev, docs, learning"
            value={tags}
            onChange={e => setTags(e.target.value)}
            className={inputClass}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="note-input" className={labelClass}>
            NOTE
          </label>
          <input
            id="note-input"
            type="text"
            placeholder="Optional note"
            value={note}
            onChange={e => setNote(e.target.value)}
            className={inputClass}
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-md text-sm font-medium text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
          disabled={isLoading}
          aria-label="Save link"
        >
          {isLoading ? "💾 Saving..." : "💾 Save Link"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 rounded-md text-sm font-medium text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
          disabled={isLoading}
          aria-label="Cancel"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
