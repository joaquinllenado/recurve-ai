import { useState, useEffect } from "react";
import { ProductInput } from "./components/ProductInput";
import { ActivityFeed } from "./components/ActivityFeed";
import { LeadsTable } from "./components/LeadsTable";
import { StrategyPanel } from "./components/StrategyPanel";
import { GraphVisualization } from "./components/GraphVisualization";
import { StrategyTimeline } from "./components/StrategyTimeline";
import { MockTriggerButton } from "./components/MockTriggerButton";
import { useActivityFeed } from "./hooks/useActivityFeed";

const REFRESH_EVENT_TYPES = [
  "strategy_stored",
  "market_research_done",
  "pivot_email_drafted",
  "mock_trigger_response",
];

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { events } = useActivityFeed();

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    if (REFRESH_EVENT_TYPES.includes(latest.type)) {
      setRefreshTrigger((t) => t + 1);
    }
  }, [events]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                The Recursive Hunter
              </h1>
              <ProductInput />
            </div>
            <div className="shrink-0">
              <MockTriggerButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="space-y-6">
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <StrategyPanel refreshTrigger={refreshTrigger} />
            </section>
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Leads
              </h3>
              <LeadsTable refreshTrigger={refreshTrigger} />
            </section>
          </div>
          <div className="space-y-6">
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 min-h-[200px]">
              <ActivityFeed />
            </section>
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <StrategyTimeline refreshTrigger={refreshTrigger} />
            </section>
          </div>
        </div>

        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Hunter&apos;s Brain (Neo4j Graph)
          </h3>
          <GraphVisualization refreshTrigger={refreshTrigger} />
        </section>
      </main>
    </div>
  );
}

export default App;
