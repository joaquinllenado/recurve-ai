from fastapi import WebSocket
import json
from datetime import datetime, timezone


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        try:
            self.active_connections.remove(websocket)
        except ValueError:
            pass

    async def broadcast(self, event_type: str, data: dict):
        message = json.dumps({
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        stale: list[WebSocket] = []
        for conn in self.active_connections:
            try:
                await conn.send_text(message)
            except Exception:
                stale.append(conn)
        for conn in stale:
            self.active_connections.remove(conn)


feed_manager = ConnectionManager()
