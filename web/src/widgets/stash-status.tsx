import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

function StashStatus() {
  const { output, isPending } = useToolInfo<"stash-status">();

  if (isPending) {
    return (
      <div className="p-6 text-center">
        <div className="text-3xl mb-2 animate-pulse">📊</div>
        <p className="text-gray-400 font-medium animate-pulse">Loading status...</p>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="p-6 text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <p className="text-red-400 font-semibold">No status data</p>
      </div>
    );
  }

  const { store, memory, uptime } = output;

  return (
    <div
      className="p-6 space-y-5 max-w-lg mx-auto"
      data-llm={`System status: ${store.status}, ${store.items} items, ${memory.used} memory`}
    >
      <div className="text-center mb-4">
        <div className="text-3xl mb-2">📊</div>
        <h2 className="text-xl font-bold text-gray-200 tracking-tight">System Status</h2>
        <p className="text-xs text-gray-500 mt-1 font-medium">Real-time health monitoring</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Store Status */}
        <div className="p-4 border border-gray-700 rounded-xl bg-gray-900/50 hover:bg-gray-800/50 transition-all duration-200 hover:shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`w-3 h-3 rounded-full ${
                store.status === "healthy" ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
              aria-label={store.status === "healthy" ? "Healthy" : "Unhealthy"}
            />
            <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Store</span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{store.items}</div>
          <div className="text-xs text-gray-400 font-medium mt-1">items stored</div>
        </div>

        {/* Memory Usage */}
        <div className="p-4 border border-gray-700 rounded-xl bg-gray-900/50 hover:bg-gray-800/50 transition-all duration-200 hover:shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Memory</span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{memory.used}</div>
          <div className="text-xs text-gray-400 font-medium mt-1">heap used</div>
        </div>

        {/* Uptime */}
        <div className="p-4 border border-gray-700 rounded-xl bg-gray-900/50 hover:bg-gray-800/50 transition-all duration-200 hover:shadow-lg col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Uptime</span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{uptime}</div>
          <div className="text-xs text-gray-400 font-medium mt-1">seconds running</div>
        </div>
      </div>

      <div className="text-center pt-4 border-t border-gray-800">
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-gray-500">
          <span className="px-2.5 py-1 bg-gray-800/50 rounded-full border border-gray-700 font-medium">
            Stage 1 Demo
          </span>
          <span className="px-2.5 py-1 bg-gray-800/50 rounded-full border border-gray-700 font-medium">
            In-Memory Store
          </span>
          <span className="px-2.5 py-1 bg-gray-800/50 rounded-full border border-gray-700 font-medium">
            No External Dependencies
          </span>
        </div>
      </div>
    </div>
  );
}

export default StashStatus;

mountWidget(<StashStatus />);
