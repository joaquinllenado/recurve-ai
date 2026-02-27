const baseUrl = import.meta.env.VITE_BACKEND_URL || "";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function postProduct(description: string) {
  return fetchJson<{
    version: number;
    strategy: { icp: string; keywords: string[]; competitors: string[] };
    market_research?: unknown;
  }>("/api/product", {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}

export async function transcribeAudio(file: Blob): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file, "audio.webm");

  const res = await fetch(`${baseUrl}/api/transcribe`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchStrategy() {
  return fetchJson<{ strategy: import("../types/api").Strategy | null }>(
    "/api/strategy"
  );
}

export async function fetchLeads(strategyVersion?: number) {
  const qs = strategyVersion != null ? `?strategy_version=${strategyVersion}` : "";
  return fetchJson<{ leads: import("../types/api").Lead[] }>(`/api/leads${qs}`);
}

export async function fetchLessons() {
  return fetchJson<{ lessons: import("../types/api").Lesson[] }>("/api/lessons");
}

export async function fetchGraph() {
  return fetchJson<import("../types/api").GraphData>("/api/graph");
}

export async function postValidate(strategyVersion?: number) {
  const qs = strategyVersion != null ? `?strategy_version=${strategyVersion}` : "";
  return fetchJson<{
    strategy_version: number;
    strike: number;
    monitor: number;
    disregard: number;
    disregard_rate: number;
    pivot_triggered: boolean;
    results: unknown[];
  }>(`/api/validate${qs}`, { method: "POST" });
}

export async function postSimulateOutage(competitor: string) {
  return fetchJson<{
    competitor: string;
    promoted_count: number;
    promoted: { name: string; domain: string }[];
  }>("/api/simulate-outage", {
    method: "POST",
    body: JSON.stringify({ competitor }),
  });
}

export async function postReset() {
  return fetchJson<{ deleted_nodes: number }>("/api/reset", { method: "POST" });
}

export function getWsFeedUrl(): string {
  const base = baseUrl || window.location.origin;
  const wsProtocol = base.startsWith("https") ? "wss" : "ws";
  const host = base.replace(/^https?:\/\//, "");
  return `${wsProtocol}://${host}/api/ws/feed`;
}
