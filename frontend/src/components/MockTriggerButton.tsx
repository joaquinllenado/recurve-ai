import { useState } from "react";
import { postMockTrigger } from "../api/client";

export function MockTriggerButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      await postMockTrigger({
        status: "critical_outage",
        competitor: "DigitalOcean",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trigger failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
      >
        {loading ? "Triggering..." : "Trigger mock outage"}
      </button>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
