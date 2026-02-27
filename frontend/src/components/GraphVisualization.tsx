import { useState, useEffect, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { fetchGraph } from "../api/client";
import type { GraphNode, GraphLink } from "../types/api";

function nodeColor(type: string): string {
  switch (type) {
    case "strategy":
      return "#3b82f6";
    case "company":
      return "#22c55e";
    case "evidence":
      return "#94a3b8";
    case "lesson":
      return "#f97316";
    default:
      return "#64748b";
  }
}

export function GraphVisualization({ refreshTrigger }: { refreshTrigger?: number }) {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGraph();
      setGraphData({
        nodes: data.nodes ?? [],
        links: data.links ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load graph");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  if (loading && graphData.nodes.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
        Loading graph...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-2 text-red-600 dark:text-red-400 text-sm">
        <span>{error}</span>
        <button
          onClick={load}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
        No graph data yet. Generate a strategy first.
      </div>
    );
  }

  const nodesWithColor = graphData.nodes.map((n) => ({
    ...n,
    color: nodeColor(n.type),
  }));

  return (
    <div className="flex flex-col">
      <div className="h-[400px] w-full rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
        <ForceGraph2D
          graphData={{ nodes: nodesWithColor, links: graphData.links }}
          nodeId="id"
          nodeLabel={(n) => {
            const node = n as GraphNode;
            const parts = [node.label ?? node.id];
            if (node.icp) parts.push(node.icp.slice(0, 80) + "...");
            if (node.details) parts.push(node.details.slice(0, 80) + "...");
            return parts.join("\n");
          }}
          nodeColor={(n) => (n as GraphNode & { color?: string }).color ?? "#64748b"}
          linkLabel={(l) => (l as GraphLink).type}
          onNodeClick={(n) => setSelectedNode(n as GraphNode)}
          backgroundColor="transparent"
        />
      </div>
      {selectedNode && (
        <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {selectedNode.label} ({selectedNode.type})
          </div>
          {selectedNode.icp && (
            <div className="mt-1 text-gray-600 dark:text-gray-300">
              {selectedNode.icp}
            </div>
          )}
          {selectedNode.details && (
            <div className="mt-1 text-gray-600 dark:text-gray-300">
              {selectedNode.details}
            </div>
          )}
          {selectedNode.domain && (
            <div className="mt-1 text-gray-500 dark:text-gray-400">
              {selectedNode.domain}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
