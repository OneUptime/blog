# How to Handle Multiple Client Connections with Python Threading and IPv4 Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Threading, TCP, Socket, IPv4, Concurrency, Networking

Description: Learn how to handle multiple simultaneous TCP client connections in Python by spawning a new thread for each accepted connection.

## The Single-Client Problem

The basic TCP server blocks on `recv()` while serving one client, making all other clients wait. Threading solves this by handling each connection in its own thread.

## Threaded TCP Server

```python
import socket
import threading

HOST = "0.0.0.0"
PORT = 9002

def handle_client(conn: socket.socket, addr: tuple) -> None:
    """Handle a single client connection in its own thread."""
    print(f"[{threading.current_thread().name}] Connected: {addr}")
    with conn:
        while True:
            try:
                data = conn.recv(4096)
                if not data:
                    # Client closed the connection
                    break
                print(f"[{addr}] Received: {data.decode('utf-8', errors='replace')}")
                # Echo data back to client
                conn.sendall(data)
            except (ConnectionResetError, BrokenPipeError):
                break
    print(f"[{addr}] Disconnected")


def run_server():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind((HOST, PORT))
        srv.listen(50)
        print(f"Server listening on {HOST}:{PORT}")

        while True:
            try:
                conn, addr = srv.accept()
                # Spawn a daemon thread per client; daemon=True means it won't
                # prevent the process from exiting
                t = threading.Thread(
                    target=handle_client,
                    args=(conn, addr),
                    daemon=True
                )
                t.start()
            except KeyboardInterrupt:
                print("Shutting down server")
                break


if __name__ == "__main__":
    run_server()
```

## Using a Thread Pool to Limit Handler Threads

Spawning unlimited threads is dangerous under high load. Use `ThreadPoolExecutor` to cap the number of client handlers running at once:

```python
import socket
from concurrent.futures import ThreadPoolExecutor

HOST = "0.0.0.0"
PORT = 9002
MAX_WORKERS = 20   # Maximum simultaneous client handlers

def handle_client(conn: socket.socket, addr: tuple) -> None:
    with conn:
        while True:
            data = conn.recv(4096)
            if not data:
                break
            conn.sendall(data)


def run_server():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind((HOST, PORT))
        srv.listen(100)
        print(f"Server on {HOST}:{PORT} with {MAX_WORKERS} workers")

        # Thread pool reuses threads instead of creating new ones each time
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            while True:
                try:
                    conn, addr = srv.accept()
                    pool.submit(handle_client, conn, addr)
                except KeyboardInterrupt:
                    break


if __name__ == "__main__":
    run_server()
```

## Thread Safety: Shared State

If multiple threads need to share state (e.g., a list of connected clients), use a lock:

```python
import socket
import threading

# Shared registry of active connections

clients: dict[tuple, socket.socket] = {}
clients_lock = threading.Lock()

def add_client(addr, conn):
    with clients_lock:
        clients[addr] = conn

def remove_client(addr):
    with clients_lock:
        clients.pop(addr, None)

def broadcast(message: bytes, sender_addr: tuple) -> None:
    """Send a message to all connected clients except the sender."""
    with clients_lock:
        for addr, conn in list(clients.items()):
            if addr != sender_addr:
                try:
                    conn.sendall(message)
                except OSError:
                    pass
```

## Limitations of Threading

- Each thread has memory overhead, including stack space, and the default stack size is platform-dependent
- Python's GIL limits true CPU parallelism (but not I/O parallelism)
- For thousands of concurrent connections, prefer `asyncio` (covered in a separate post)

## Conclusion

Threading enables a Python TCP server to handle multiple simultaneous clients by delegating each accepted connection to a separate thread. Use `ThreadPoolExecutor` to bound the number of handler threads, and protect any shared state with `threading.Lock`. For very high concurrency, consider `asyncio` instead.
