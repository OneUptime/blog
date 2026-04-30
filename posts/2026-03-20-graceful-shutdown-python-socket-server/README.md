# How to Implement Graceful Shutdown for Python IPv4 Socket Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Socket, IPv4, Graceful Shutdown, Signal Handling, Networking

Description: Learn how to implement graceful shutdown for Python IPv4 socket servers by handling OS signals and cleanly closing all active connections.

## What Is Graceful Shutdown?

A graceful shutdown allows the server to stop accepting new connections, finish processing in-flight requests, and cleanly close all client connections-rather than abruptly terminating and leaving clients with broken pipes.

## Basic Signal Handling

```python
import socket
import signal
import sys

HOST = "0.0.0.0"
PORT = 9007

# Global flag to signal shutdown

shutdown_event = False


def handle_signal(sig, frame):
    """Called when SIGINT or SIGTERM is received."""
    global shutdown_event
    print(f"\nReceived signal {sig}, initiating graceful shutdown...")
    shutdown_event = True


# Register signal handlers
signal.signal(signal.SIGINT, handle_signal)    # Ctrl+C
signal.signal(signal.SIGTERM, handle_signal)   # kill / systemd stop


server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((HOST, PORT))
server.listen(5)

# Use a short timeout on accept() so we can check shutdown_event regularly
server.settimeout(1.0)

print(f"Server listening on {PORT}. Press Ctrl+C to stop.")

while not shutdown_event:
    try:
        conn, addr = server.accept()
        print(f"Connection from {addr}")
        # Handle client (simplified: echo and close)
        with conn:
            try:
                data = conn.recv(1024)
                if data:
                    conn.sendall(data)
            except OSError:
                pass
    except TimeoutError:
        continue   # Check shutdown_event and loop again
    except OSError:
        break

server.close()
print("Server shutdown complete")
```

## Graceful Shutdown with Threading

When clients are handled in threads, wait for all threads to finish:

```python
import socket
import signal
import threading

HOST = "0.0.0.0"
PORT = 9007
active_threads: list[threading.Thread] = []
lock = threading.Lock()
shutdown_event = threading.Event()


def handle_client(conn: socket.socket, addr: tuple) -> None:
    with conn:
        while not shutdown_event.is_set():
            conn.settimeout(1.0)
            try:
                data = conn.recv(4096)
                if not data:
                    break
                conn.sendall(data)
            except TimeoutError:
                continue
            except OSError:
                break
    with lock:
        active_threads.remove(threading.current_thread())
    print(f"Client {addr} disconnected")


def signal_handler(sig, frame):
    print("Shutdown signal received")
    shutdown_event.set()


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((HOST, PORT))
server.listen(50)
server.settimeout(1.0)

print(f"Server on {PORT}")
while not shutdown_event.is_set():
    try:
        conn, addr = server.accept()
        t = threading.Thread(target=handle_client, args=(conn, addr), daemon=False)
        with lock:
            active_threads.append(t)
        t.start()
    except TimeoutError:
        continue
    except OSError:
        break

server.close()
print("Waiting for active clients to finish...")

# Wait for all client threads to exit
for t in list(active_threads):
    t.join()

print("All clients disconnected. Bye!")
```

## Using TCP Shutdown Half-Close

When closing a connection, call `shutdown()` before `close()` to stop further sends and close the connection promptly:

```python
# Gracefully close: stop sending, signal EOF to the peer, then close
conn.shutdown(socket.SHUT_WR)
conn.close()
```

## asyncio Graceful Shutdown

On Unix-like systems, `loop.add_signal_handler()` can be used to stop accepting new connections and wait for the listening socket to close:

```python
import asyncio
import signal

async def main():
    shutdown_event = asyncio.Event()
    server = await asyncio.start_server(handle_client, "0.0.0.0", 9007)

    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGINT, shutdown_event.set)
    loop.add_signal_handler(signal.SIGTERM, shutdown_event.set)

    async with server:
        await shutdown_event.wait()
        server.close()
        await server.wait_closed()
```

## Conclusion

Graceful shutdown requires: registering signal handlers, setting a shutdown flag, giving in-flight requests time to complete, and waiting for handler threads to finish. Using `settimeout()` on `accept()` allows the main loop to periodically check the shutdown flag without blocking indefinitely.
