# How to Use Python selectors Module for IPv4 Socket Multiplexing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Selector, IPv4, Socket, Multiplexing, Networking, Non-Blocking

Description: Learn how to use Python's selectors module to efficiently multiplex multiple IPv4 socket connections in a single thread without blocking.

## Why selectors Over select()?

The `selectors` module is the high-level, portable alternative to the low-level `select` module. It automatically uses the most efficient implementation available on the current platform (`epoll`, `kqueue`, `poll`, `devpoll`, or `select`) and presents a clean API.

## Basic Multiplexed Echo Server

```python
import selectors
import socket
import types

# DefaultSelector picks the best available implementation for the platform

sel = selectors.DefaultSelector()

HOST = "0.0.0.0"
PORT = 9008


def accept_connection(sock: socket.socket) -> None:
    """Accept a new connection and register it with the selector."""
    conn, addr = sock.accept()
    print(f"Accepted connection from {addr}")
    conn.setblocking(False)

    # Attach arbitrary data to the selector key for context
    data = types.SimpleNamespace(addr=addr, inb=b"", outb=b"")

    # Start by watching for reads; add write events only when output is queued
    sel.register(conn, selectors.EVENT_READ, data=data)


def service_connection(key: selectors.SelectorKey, mask: int) -> None:
    """Handle I/O on an existing connection."""
    sock = key.fileobj
    data = key.data

    if mask & selectors.EVENT_READ:
        recv_data = sock.recv(4096)
        if recv_data:
            # Buffer the received data to be echoed back
            data.outb += recv_data
            sel.modify(sock, selectors.EVENT_READ | selectors.EVENT_WRITE, data=data)
        else:
            # Empty recv = client closed connection
            print(f"Closing connection to {data.addr}")
            sel.unregister(sock)
            sock.close()
            return

    if mask & selectors.EVENT_WRITE:
        if data.outb:
            # Send as much as the socket will accept
            sent = sock.send(data.outb)
            # Remove the bytes that were successfully sent
            data.outb = data.outb[sent:]

        if not data.outb:
            sel.modify(sock, selectors.EVENT_READ, data=data)


# Create and register the listening server socket
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((HOST, PORT))
server.listen(50)
server.setblocking(False)

# Register server socket for read events only (to accept new connections)
sel.register(server, selectors.EVENT_READ, data=None)
print(f"Listening on {HOST}:{PORT}")

try:
    while True:
        # Block until at least one socket is ready; timeout=None = wait forever
        events = sel.select(timeout=None)

        for key, mask in events:
            if key.data is None:
                # This is the server socket - accept a new connection
                accept_connection(key.fileobj)
            else:
                # This is a client socket - service it
                service_connection(key, mask)

except KeyboardInterrupt:
    print("Shutting down")
finally:
    sel.close()
```

## Reading Data in Chunks

For protocols where you read until a delimiter (e.g., newline):

```python
def service_connection(key: selectors.SelectorKey, mask: int) -> None:
    sock = key.fileobj
    data = key.data

    if mask & selectors.EVENT_READ:
        chunk = sock.recv(4096)
        if not chunk:
            sel.unregister(sock)
            sock.close()
            return

        data.inb += chunk

        # Process complete lines
        while b"\n" in data.inb:
            line, data.inb = data.inb.split(b"\n", 1)
            response = f"Echo: {line.decode()}\n".encode()
            data.outb += response

        if data.outb:
            sel.modify(sock, selectors.EVENT_READ | selectors.EVENT_WRITE, data=data)

    if mask & selectors.EVENT_WRITE and data.outb:
        sent = sock.send(data.outb)
        data.outb = data.outb[sent:]
        if not data.outb:
            sel.modify(sock, selectors.EVENT_READ, data=data)
```

## Selector Event Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `EVENT_READ` | 1 | Socket has data to read |
| `EVENT_WRITE` | 2 | Socket is ready to accept writes |

## Performance Comparison

| Approach | Connections | OS Mechanism | Complexity |
|----------|-------------|--------------|------------|
| `threading` | Depends on thread overhead and system resources | Threads | Low |
| `selectors` | Scales well for many I/O-bound sockets | `select`-module primitives such as `epoll`, `kqueue`, `poll`, `devpoll`, or `select` | Medium |
| `asyncio` | Similar event-driven model for I/O-bound workloads | Depends on the event loop and platform | Medium |

## Conclusion

The `selectors` module provides efficient, portable I/O multiplexing for Python socket servers. It generally scales better than one-thread-per-connection designs for I/O-bound servers and is simpler to use than raw `select()`. For new projects, `asyncio` offers a higher-level async/await interface built on event-loop-based I/O multiplexing.
