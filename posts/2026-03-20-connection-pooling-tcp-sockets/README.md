# How to Implement Connection Pooling for TCP Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, TCP, Connection Pooling, Python, Go, Performance, Networking

Description: Learn how to implement TCP connection pooling for IPv4 sockets in Python and Go to reuse established connections, reduce handshake overhead, and improve throughput under high load.

## Why Connection Pooling?

Each new TCP connection requires a three-way handshake (~1 RTT) plus TLS handshake if encrypted (~2 RTT). Under high request rates, this overhead dominates latency. A pool maintains a set of already-connected sockets that are borrowed, used, and returned.

## Python Thread-Safe Connection Pool

```python
import socket
import threading
import queue
import contextlib

class TCPConnectionPool:
    """Thread-safe pool of persistent TCP connections."""

    def __init__(self, host: str, port: int, max_size: int = 10, timeout: float = 5.0):
        self.host    = host
        self.port    = port
        self.timeout = timeout
        # Queue acts as the pool; maxsize bounds the pool
        self._pool: queue.Queue[socket.socket] = queue.Queue(maxsize=max_size)
        self._lock   = threading.Lock()

    def _new_connection(self) -> socket.socket:
        """Establish a fresh TCP connection."""
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(self.timeout)
        s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        s.connect((self.host, self.port))
        return s

    def _is_alive(self, s: socket.socket) -> bool:
        """Non-destructively check if a pooled connection is still alive."""
        try:
            # Non-blocking peek: returns b'' on EOF, raises BlockingIOError if no data
            data = s.recv(1, socket.MSG_PEEK | socket.MSG_DONTWAIT)
            return len(data) > 0
        except BlockingIOError:
            return True   # no data waiting - connection is fine
        except OSError:
            return False

    @contextlib.contextmanager
    def acquire(self):
        """Borrow a connection from the pool; return it when done."""
        conn = None
        try:
            conn = self._pool.get_nowait()
            if not self._is_alive(conn):
                conn.close()
                conn = self._new_connection()
        except queue.Empty:
            conn = self._new_connection()

        try:
            yield conn
        finally:
            try:
                self._pool.put_nowait(conn)
            except queue.Full:
                conn.close()   # pool is full - discard

# Usage

pool = TCPConnectionPool("127.0.0.1", 9000, max_size=5)

def send_request(data: bytes) -> bytes:
    with pool.acquire() as conn:
        conn.sendall(data)
        return conn.recv(4096)
```

## Python Async Connection Pool

```python
import asyncio
import contextlib
from asyncio import StreamReader, StreamWriter

class AsyncTCPPool:
    """asyncio connection pool using asyncio.Queue."""

    def __init__(self, host: str, port: int, max_size: int = 10):
        self.host     = host
        self.port     = port
        self._pool: asyncio.Queue[tuple[StreamReader, StreamWriter]] = asyncio.Queue(maxsize=max_size)

    async def _new_conn(self):
        return await asyncio.open_connection(self.host, self.port)

    @contextlib.asynccontextmanager
    async def acquire(self):
        try:
            reader, writer = self._pool.get_nowait()
            # Check if connection was closed by peer
            if writer.is_closing():
                reader, writer = await self._new_conn()
        except asyncio.QueueEmpty:
            reader, writer = await self._new_conn()

        try:
            yield reader, writer
        finally:
            if not writer.is_closing():
                try:
                    self._pool.put_nowait((reader, writer))
                except asyncio.QueueFull:
                    writer.close()
                    await writer.wait_closed()
```

## Go Connection Pool

```go
package main

import (
    "fmt"
    "net"
    "sync"
    "time"
)

// Pool maintains a fixed set of reusable TCP connections.
type Pool struct {
    mu      sync.Mutex
    free    []net.Conn
    addr    string
    maxSize int
}

func NewPool(addr string, maxSize int) *Pool {
    return &Pool{addr: addr, maxSize: maxSize}
}

// Get retrieves a connection from the pool or dials a new one.
func (p *Pool) Get() (net.Conn, error) {
    p.mu.Lock()
    if len(p.free) > 0 {
        conn := p.free[len(p.free)-1]
        p.free = p.free[:len(p.free)-1]
        p.mu.Unlock()
        return conn, nil
    }
    p.mu.Unlock()
    return net.DialTimeout("tcp4", p.addr, 5*time.Second)
}

// Put returns a connection to the pool, or closes it if the pool is full.
func (p *Pool) Put(conn net.Conn) {
    p.mu.Lock()
    defer p.mu.Unlock()
    if len(p.free) < p.maxSize {
        p.free = append(p.free, conn)
    } else {
        conn.Close()
    }
}

func main() {
    pool := NewPool("127.0.0.1:9000", 5)

    conn, err := pool.Get()
    if err != nil {
        panic(err)
    }

    fmt.Fprintln(conn, "Hello, pooled connection!")

    // Return the connection to the pool for reuse
    pool.Put(conn)
    fmt.Println("Connection returned to pool")
}
```

## Pool Sizing Guidelines

| Scenario | Recommended pool size |
|----------|-----------------------|
| Single-threaded client | 1–2 |
| Multi-threaded (N workers) | N–2N |
| Async event loop | 10–50 |
| Database-style workload | Match max DB connections |

## Conclusion

A TCP connection pool maintains a fixed set of open connections and hands them out to callers on demand, eliminating per-request TCP and TLS handshake overhead. In Python, use a `queue.Queue` (thread-safe) or `asyncio.Queue` (async) as the pool store. In Go, a mutex-protected slice works well for moderate pool sizes. Always health-check a pooled connection before use with `MSG_PEEK` (Python) or a brief read timeout (Go). When a connection is returned, check pool capacity and close surplus connections rather than letting the pool grow unboundedly.
