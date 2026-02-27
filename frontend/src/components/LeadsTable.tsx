import { useState, useEffect, useCallback } from "react";
import { fetchLeads } from "../api/client";
import type { Lead } from "../types/api";

function ScoreBadge({ score }: { score?: number }) {
  const s = score ?? 0;
  const color =
    s >= 70
      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
      : s >= 50
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";

  return (
    <span
      className={`inline-flex items-center justify-center w-10 px-1.5 py-0.5 rounded text-sm font-medium ${color}`}
    >
      {s}
    </span>
  );
}

export function LeadsTable({ refreshTrigger }: { refreshTrigger?: number }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { leads: data } = await fetchLeads();
      setLeads(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  if (loading && leads.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">
        Loading leads...
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

  if (leads.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">
        No leads yet. Generate a strategy first.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
              Company
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
              Domain
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
              Score
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
              Tech
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
              Employees
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
              Funding
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.domain}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                {lead.name}
              </td>
              <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                {lead.domain}
              </td>
              <td className="py-2 px-2">
                <ScoreBadge score={lead.score} />
              </td>
              <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                {Array.isArray(lead.tech_stack)
                  ? lead.tech_stack.join(", ")
                  : "-"}
              </td>
              <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                {lead.employees ?? "-"}
              </td>
              <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                {lead.funding ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={load}
        className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        Refresh
      </button>
    </div>
  );
}
