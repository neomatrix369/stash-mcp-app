import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

function StashStatus() {
  const { output, isPending } = useToolInfo<"stash-status">();

  if (isPending) {
    return <div className="p-4 text-center animate-pulse">Loading status...</div>;
  }

  if (!output) {
    return <div className="p-4 text-center text-red-500">No status data</div>;
  }

  const { store, memory, uptime } = output;

  return (
    <div
      className="p-4 space-y-4 max-w-md mx-auto"
      data-llm={`System status: ${store.status}, ${store.items} items, ${memory.used} memory`}
    >
      <h2 className="text-lg font-bold text-center">System Status</h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Store Status */}
        <div className="p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${store.status === "healthy" ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm font-medium">Store</span>
          </div>
          <div className="text-2xl font-bold mt-1">{store.items}</div>
          <div className="text-xs text-gray-500">items</div>
        </div>

        {/* Memory Usage */}
        <div className="p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-medium">Memory</span>
          </div>
          <div className="text-2xl font-bold mt-1">{memory.used}</div>
          <div className="text-xs text-gray-500">heap used</div>
        </div>

        {/* Uptime */}
        <div className="p-3 border rounded-lg col-span-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-sm font-medium">Uptime</span>
          </div>
          <div className="text-2xl font-bold mt-1">{uptime}</div>
          <div className="text-xs text-gray-500">seconds</div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400">
        Stage 1 Demo • In-Memory Store • No External Dependencies
      </div>
    </div>
  );
}

export default StashStatus;

mountWidget(<StashStatus />);
