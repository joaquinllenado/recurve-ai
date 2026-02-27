import { useState, useEffect, useCallback } from "react";
import { fetchGraph } from "../api/client";
import type { GraphNode } from "../types/api";

function strategyFromGraph(nodes: GraphNode[]): GraphNode[] {
  return nodes
    .filter((n) => n.type === "strategy")
    .sort((a, b) => (a.version ?? 0) - (b.version ?? 0));
}

export function StrategyTimeline({ refreshTrigger }: { refreshTrigger?: number }) {
  const [strategies, setStrategies] = useState<GraphNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { nodes } = await fetchGraph();
      setStrategies(strategyFromGraph(nodes ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  if (loading && strategies.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">
        Loading timeline...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400 text-sm flex justify-between items-center">
        <span>{error}</span>
        <button
          onClick={load}
          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">
        No strategy history yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
        Strategy Evolution
      </h3>
      <div className="space-y-3">
        {strategies.map((s, i) => (
          <div
            key={s.id}
            className="flex gap-3"
          >
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
              {i < strategies.length - 1 && (
                <div className="w-px flex-1 min-h-[20px] bg-gray-200 dark:bg-gray-600 my-0.5" />
              )}
            </div>
            <div className="flex-1 pb-3">
              <div className="font-medium text-gray-900 dark:text-white">
                {s.label}
              </div>
              {s.created_at && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(s.created_at).toLocaleString()}
                </div>
              )}
              {s.icp && (
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  {s.icp}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
