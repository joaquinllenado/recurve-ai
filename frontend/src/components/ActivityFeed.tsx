import { useActivityFeed } from "../hooks/useActivityFeed";

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    product_received: "Product received",
    market_research_started: "Market research started",
    market_research_done: "Market research done",
    strategy_generated: "Strategy generated",
    strategy_stored: "Strategy stored",
    agent_error: "Error",
    scout_status_change: "Scout: status changed",
    pivot_email_drafted: "Pivot email drafted",
    mock_trigger_response: "Mock trigger response",
  };
  return labels[type] ?? type;
}

function EventItem({ event }: { event: { type: string; data: Record<string, unknown>; timestamp: string } }) {
  const isError = event.type === "agent_error";
  const time = new Date(event.timestamp).toLocaleTimeString();

  return (
    <div
      className={`p-2 rounded text-sm ${
        isError
          ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          : "bg-gray-50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200"
      }`}
    >
      <div className="flex justify-between gap-2">
        <span className="font-medium">{eventLabel(event.type)}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          {time}
        </span>
      </div>
      {Object.keys(event.data).length > 0 && (
        <pre className="mt-1 text-xs overflow-x-auto text-gray-600 dark:text-gray-300">
          {JSON.stringify(event.data)}
        </pre>
      )}
    </div>
  );
}

export function ActivityFeed() {
  const { events, connected } = useActivityFeed();

  return (
    <div className="flex flex-col h-full min-h-[200px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Activity Feed
        </h3>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            connected
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
          }`}
        >
          {connected ? "Live" : "Reconnecting..."}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No activity yet. Submit a product description to start.
          </p>
        ) : (
          events.map((e, i) => (
            <EventItem key={`${e.timestamp}-${i}`} event={e} />
          ))
        )}
      </div>
    </div>
  );
}
