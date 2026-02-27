import { useState, useEffect, useCallback } from "react";
import { getWsFeedUrl } from "../api/client";
import type { ActivityEvent } from "../types/api";

export function useActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);

  const appendEvent = useCallback((event: ActivityEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    const url = getWsFeedUrl();
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let pingInterval: ReturnType<typeof setInterval>;

    const connect = () => {
      ws = new WebSocket(url);

      ws.onopen = () => {
        setConnected(true);
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
        }, 30000);
      };

      ws.onclose = () => {
        setConnected(false);
        if (pingInterval) clearInterval(pingInterval);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as ActivityEvent;
          appendEvent(msg);
        } catch {
          // ignore non-JSON
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingInterval) clearInterval(pingInterval);
      ws?.close();
    };
  }, [appendEvent]);

  return { events, connected };
}
