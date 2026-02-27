import { useState, useEffect, useCallback } from "react";
import { fetchStrategy } from "../api/client";
import type { Strategy } from "../types/api";

export function StrategyPanel({ refreshTrigger }: { refreshTrigger?: number }) {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { strategy: data } = await fetchStrategy();
      setStrategy(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load strategy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  if (loading && !strategy) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">
        Loading strategy...
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

  if (!strategy) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">
        No strategy yet. Submit a product description to generate one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Strategy v{strategy.version}
        </h3>
        {strategy.created_at && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(strategy.created_at).toLocaleDateString()}
          </span>
        )}
      </div>

      <div>
        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
          ICP
        </h4>
        <p className="text-sm text-gray-800 dark:text-gray-200">
          {strategy.icp}
        </p>
      </div>

      {strategy.keywords && strategy.keywords.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
            Keywords
          </h4>
          <div className="flex flex-wrap gap-1">
            {strategy.keywords.map((k) => (
              <span
                key={k}
                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded text-xs"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {strategy.competitors && strategy.competitors.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
            Competitors
          </h4>
          <div className="flex flex-wrap gap-1">
            {strategy.competitors.map((c) => (
              <span
                key={c}
                className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
