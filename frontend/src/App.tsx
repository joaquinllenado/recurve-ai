import { useState, useEffect, useCallback } from "react";
import { ProductInput } from "./components/ProductInput";
import { ActivityFeed } from "./components/ActivityFeed";
import { LeadsTable } from "./components/LeadsTable";
import { StrategyPanel } from "./components/StrategyPanel";
import { GraphVisualization } from "./components/GraphVisualization";
import { StrategyTimeline } from "./components/StrategyTimeline";
import { ResetButton } from "./components/ResetButton";
import { useActivityFeed } from "./hooks/useActivityFeed";

const REFRESH_EVENT_TYPES = [
  "strategy_stored",
  "market_research_done",
  "pivot_email_drafted",
  "outage_reprioritized",
  "graph_reset",
  "validation_complete",
  "lead_validated",
];

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { events, connected } = useActivityFeed();

  const bumpRefresh = useCallback(() => {
    setRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    if (REFRESH_EVENT_TYPES.includes(latest.type)) {
      setRefreshTrigger((t) => t + 1);
    }
  }, [events]);

  return (
    <div className="min-h-screen bg-surface text-text-primary dot-grid">
      <div className="hero-glow">
        <header className="border-b border-border-subtle backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 pt-6 pb-5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <img src="/recurve_icon.png" alt="Recurve AI" className="w-9 h-9 rounded-xl shadow-lg shadow-accent/20" />
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-text-primary">
                    Recurve AI
                  </h1>
                  <p className="text-[11px] text-text-tertiary -mt-0.5">AI-powered lead intelligence</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-text-tertiary bg-surface-overlay/50 px-3 py-1.5 rounded-full border border-border-subtle">
                  <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success animate-pulse" : "bg-text-tertiary"}`} />
                  {connected ? "Live" : "Offline"}
                </div>
                <ResetButton onReset={bumpRefresh} />
              </div>
            </div>
            <ProductInput />
          </div>
        </header>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          <div className="lg:col-span-3 space-y-6">
            <Card title="Current Strategy">
              <StrategyPanel refreshTrigger={refreshTrigger} />
            </Card>
            <Card title="Target Leads">
              <LeadsTable refreshTrigger={refreshTrigger} />
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Card title="Live Activity" className="max-h-[460px] flex flex-col">
              <ActivityFeed events={events} />
            </Card>
            <Card title="Strategy Evolution">
              <StrategyTimeline refreshTrigger={refreshTrigger} />
            </Card>
          </div>
        </div>

        <Card title="Knowledge Graph">
          <GraphVisualization refreshTrigger={refreshTrigger} />
        </Card>
      </main>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-surface-raised rounded-xl border border-border-subtle overflow-hidden ${className}`}
    >
      <div className="px-5 py-3.5 border-b border-border-subtle">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
      </div>
      <div className="p-5 flex-1 min-h-0">{children}</div>
    </section>
  );
}

export default App;
