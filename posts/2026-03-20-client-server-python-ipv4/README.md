# How to Implement the Client-Server Pattern with IPv4 TCP in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, TCP, IPv4, Client-Server, Networking, Socket

Description: Learn how to implement the fundamental client-server pattern with IPv4 TCP in Python, covering connection handling, length-prefixed framing, concurrent servers, and graceful shutdown.

## Simple Echo Server

```python
import socket

HOST = "0.0.0.0"
PORT = 9000

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(5)
    print(f"Server listening on {HOST}:{PORT}")

    while True:
        conn, addr = server.accept()
        with conn:
            print(f"Connected: {addr}")
            while True:
                data = conn.recv(4096)
                if not data:
                    break
                conn.sendall(data)   # echo back
```

## Simple Echo Client

```python
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect(("127.0.0.1", 9000))
    s.sendall(b"Hello, server!")
    data = s.recv(4096)
    print(f"Received: {data.decode()}")
```

## Length-Prefixed Framing

```python
import socket
import struct

def send_msg(sock: socket.socket, payload: bytes) -> None:
    """Prefix payload with a 4-byte big-endian length header."""
    header = struct.pack(">I", len(payload))
    sock.sendall(header + payload)

def recv_msg(sock: socket.socket) -> bytes:
    """Read exactly the number of bytes indicated by the 4-byte header."""
    def recvn(n: int) -> bytes:
        buf = b""
        while len(buf) < n:
            chunk = sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("Connection closed")
            buf += chunk
        return buf

    header = recvn(4)
    length = struct.unpack(">I", header)[0]
    return recvn(length)
```

## Concurrent Server (Thread per Connection)

```python
import socket
import threading

def handle(conn: socket.socket, addr: tuple) -> None:
    with conn:
        print(f"[+] {addr}")
        while True:
            try:
                data = conn.recv(4096)
                if not data:
                    break
                conn.sendall(data)
            except ConnectionResetError:
                break
        print(f"[-] {addr}")

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(("0.0.0.0", 9000))
server.listen(50)
print("Concurrent server on 0.0.0.0:9000")

while True:
    conn, addr = server.accept()
    threading.Thread(target=handle, args=(conn, addr), daemon=True).start()
```

## Graceful Shutdown

```python
import socket
import signal
import threading

shutdown_event = threading.Event()
workers = []

def handle(conn: socket.socket, addr: tuple) -> None:
    with conn:
        conn.settimeout(1.0)
        print(f"[+] {addr}")
        while not shutdown_event.is_set():
            try:
                data = conn.recv(4096)
                if not data:
                    break
                conn.sendall(data)
            except socket.timeout:
                continue
            except ConnectionResetError:
                break
        print(f"[-] {addr}")

def sigterm(signum, frame):
    print("Shutting down...")
    shutdown_event.set()

signal.signal(signal.SIGTERM, sigterm)
signal.signal(signal.SIGINT,  sigterm)

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(("0.0.0.0", 9000))
server.settimeout(1.0)   # allow checking shutdown_event periodically
server.listen(5)

while not shutdown_event.is_set():
    try:
        conn, addr = server.accept()
        thread = threading.Thread(target=handle, args=(conn, addr))
        thread.start()
        workers.append(thread)
    except socket.timeout:
        continue

server.close()
for thread in workers:
    thread.join()
print("Server closed")
```

## Conclusion

The client-server pattern with TCP sockets involves three phases: connection (`accept` / `connect`), data exchange (framing is essential - use length prefixes for message boundaries), and disconnection (detect with `recv` returning empty bytes). A thread per connection is the simplest concurrent model. Use `SO_REUSEADDR` to allow fast server restart. Signal handlers with `threading.Event` and non-daemon worker threads provide clean shutdown. For higher concurrency, replace threads with `asyncio.start_server`.
