# How to Implement the Reactor Pattern for IPv4 Socket Programming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, Reactor, Event-Driven, Selector, Networking

Description: Learn how to implement the Reactor pattern for high-performance IPv4 socket programming in Python using the selectors module, enabling a single thread to handle many concurrent connections.

## The Reactor Pattern

The Reactor pattern demultiplexes I/O events and dispatches them to registered handlers without blocking threads:

```text
┌──────────────┐
│  Event Loop  │
│  (select/    │  ←─── I/O ready event
│   epoll/     │───► handler(event)
│   kqueue)    │
└──────────────┘
```

## Python: Reactor with selectors Module

```python
import selectors
import socket
import types

sel = selectors.DefaultSelector()

def accept(server: socket.socket) -> None:
    conn, addr = server.accept()
    conn.setblocking(False)
    data = types.SimpleNamespace(addr=addr, inbuf=b"", outbuf=b"")
    # Register for read events initially
    sel.register(conn, selectors.EVENT_READ, data=data)
    print(f"[+] {addr}")

def service(conn: socket.socket, mask: int) -> None:
    data = sel.get_key(conn).data
    if mask & selectors.EVENT_READ:
        recv = conn.recv(4096)
        if recv:
            data.inbuf += recv
            data.outbuf += recv              # echo
            # Now we have data to write - subscribe to WRITE events too
            sel.modify(conn,
                       selectors.EVENT_READ | selectors.EVENT_WRITE,
                       data=data)
        else:
            print(f"[-] {data.addr}")
            sel.unregister(conn)
            conn.close()
            return

    if mask & selectors.EVENT_WRITE:
        if data.outbuf:
            sent = conn.send(data.outbuf)
            data.outbuf = data.outbuf[sent:]
        if not data.outbuf:
            # Nothing more to write - only listen for reads
            sel.modify(conn, selectors.EVENT_READ, data=data)

def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", 9000))
    server.listen(100)
    server.setblocking(False)

    sel.register(server, selectors.EVENT_READ, data=None)
    print("Reactor echo server on 0.0.0.0:9000")

    try:
        while True:
            events = sel.select(timeout=None)   # block until I/O ready
            for key, mask in events:
                if key.data is None:
                    accept(key.fileobj)
                else:
                    service(key.fileobj, mask)
    except KeyboardInterrupt:
        print("Shutting down")
    finally:
        sel.close()

main()
```

## Request Dispatcher with Handlers

```python
import selectors
import socket
import types
from typing import Callable

HandlerFn = Callable[[socket.socket, bytes], bytes]

class ReactorServer:
    def __init__(self, host: str, port: int, handler: HandlerFn):
        self._sel     = selectors.DefaultSelector()
        self._handler = handler
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((host, port))
        s.listen(100)
        s.setblocking(False)
        self._sel.register(s, selectors.EVENT_READ, data="server")
        self._server = s
        print(f"ReactorServer on {host}:{port}")

    def _service(self, conn: socket.socket, mask: int) -> None:
        data = self._sel.get_key(conn).data
        if mask & selectors.EVENT_READ:
            recv = conn.recv(4096)
            if recv:
                data.outbuf += self._handler(conn, recv)
                if data.outbuf:
                    self._sel.modify(
                        conn,
                        selectors.EVENT_READ | selectors.EVENT_WRITE,
                        data=data,
                    )
            else:
                self._sel.unregister(conn)
                conn.close()
                return

        if mask & selectors.EVENT_WRITE:
            if data.outbuf:
                sent = conn.send(data.outbuf)
                data.outbuf = data.outbuf[sent:]
            if not data.outbuf:
                self._sel.modify(conn, selectors.EVENT_READ, data=data)

    def run(self) -> None:
        try:
            while True:
                for key, mask in self._sel.select():
                    if key.data == "server":
                        conn, addr = self._server.accept()
                        conn.setblocking(False)
                        data = types.SimpleNamespace(addr=addr, outbuf=b"")
                        self._sel.register(conn, selectors.EVENT_READ, data=data)
                    else:
                        self._service(key.fileobj, mask)
        finally:
            self._server.close()
            self._sel.close()

# Usage

def echo_handler(conn: socket.socket, data: bytes) -> bytes:
    return data

ReactorServer("0.0.0.0", 9000, echo_handler).run()
```

## Conclusion

The Reactor pattern uses `selectors.DefaultSelector` (backed by `epoll` on Linux, `kqueue` on macOS) to multiplex I/O across many sockets in a single thread. Only subscribe to `EVENT_WRITE` when you have data to send - connected TCP sockets are usually writable, so subscribing all the time can make the event loop wake up continuously. Use `sel.modify` to change interest flags dynamically. This pattern is closely related to the event loops used by frameworks like `asyncio`. For Python applications, `asyncio.start_server` provides a higher-level API on top of `asyncio`'s event loop and platform-specific I/O primitives.
