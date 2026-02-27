export function extractTranscript(data: unknown): string {
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    if (typeof d.transcript === "string") return d.transcript;
    if (typeof d.text === "string") return d.text;
    if (Array.isArray(d.results) && d.results[0]) {
      const r = d.results[0] as Record<string, unknown>;
      if (typeof r.transcript === "string") return r.transcript;
    }
  }
  return "";
}
