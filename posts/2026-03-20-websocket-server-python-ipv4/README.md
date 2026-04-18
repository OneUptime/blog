# How to Create a WebSocket Server Bound to an IPv4 Address in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WebSocket, Python, IPv4, Networking, Asyncio

Description: Learn how to create a WebSocket server bound to a specific IPv4 address in Python using the websockets library, with connection handling, broadcasting, and graceful shutdown.

## Installation

```bash
pip install websockets
```

## Basic WebSocket Server

```python
import asyncio
import websockets

async def handler(websocket):
    print(f"Client connected: {websocket.remote_address}")
    try:
        async for message in websocket:
            print(f"Received: {message}")
            await websocket.send(f"Echo: {message}")
    except websockets.ConnectionClosed:
        print(f"Client disconnected: {websocket.remote_address}")

async def main():
    # Bind to specific IPv4 address and port
    async with websockets.serve(handler, "0.0.0.0", 8765) as server:
        print("WebSocket server on ws://0.0.0.0:8765")
        await asyncio.Future()  # run forever

asyncio.run(main())
```

## Server with Client Registry and Broadcast

```python
import asyncio
import json
import websockets
from websockets.server import WebSocketServerProtocol

connected: set[WebSocketServerProtocol] = set()

async def handler(websocket: WebSocketServerProtocol):
    ip = websocket.remote_address[0]
    connected.add(websocket)
    print(f"[+] {ip} (total: {len(connected)})")
    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send(json.dumps({"error": "invalid JSON"}))
                continue

            # Broadcast to all connected clients
            outgoing = json.dumps({"from": ip, "data": msg})
            await asyncio.gather(
                *[c.send(outgoing) for c in connected],
                return_exceptions=True
            )
    except websockets.ConnectionClosed:
        pass
    finally:
        connected.discard(websocket)
        print(f"[-] {ip} (total: {len(connected)})")

async def main():
    host = "0.0.0.0"
    port = 8765
    async with websockets.serve(handler, host, port):
        print(f"WebSocket server on ws://{host}:{port}")
        await asyncio.Future()

asyncio.run(main())
```

## Server with Ping/Pong Keepalive

```python
import asyncio
import websockets

async def handler(ws):
    async for msg in ws:
        await ws.send(f"echo: {msg}")

async def main():
    async with websockets.serve(
        handler,
        "0.0.0.0",
        8765,
        ping_interval=20,   # send ping every 20 seconds
        ping_timeout=10,    # close connection if no pong within 10 seconds
        close_timeout=5,
    ):
        await asyncio.Future()

asyncio.run(main())
```

## Graceful Shutdown

```python
import asyncio
import signal
import websockets

connected = set()

async def handler(ws):
    connected.add(ws)
    try:
        async for msg in ws:
            await ws.send(msg)
    finally:
        connected.discard(ws)

async def main():
    loop = asyncio.get_running_loop()
    stop = loop.create_future()
    loop.add_signal_handler(signal.SIGTERM, stop.set_result, None)

    async with websockets.serve(handler, "0.0.0.0", 8765) as server:
        print("WebSocket server started")
        await stop
        print("Shutting down - closing all connections")
        for ws in list(connected):
            await ws.close(1001, "Server shutting down")

asyncio.run(main())
```

## Conclusion

Python's `websockets` library makes it easy to create IPv4 WebSocket servers with `websockets.serve(handler, host, port)`. Use `"0.0.0.0"` to accept on all interfaces or a specific IP to restrict access. Enable `ping_interval` and `ping_timeout` to detect dead connections. For multi-client scenarios, maintain a `connected` set and use `asyncio.gather` for broadcasting. Always remove clients from the registry in a `finally` block to prevent memory leaks on unexpected disconnections.
