# How to Build a Concurrent TCP Server for 10K+ Connections in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, TCP, Networking, Concurrency, High Performance

Description: A practical guide to building a TCP server in Go that can handle over 10,000 concurrent connections using goroutines, proper resource management, and battle-tested patterns.

---

Go was practically built for this. When people talk about Go's strengths, they usually mention simplicity or compilation speed. But the real killer feature for network programming is goroutines - lightweight threads that let you handle thousands of concurrent connections without breaking a sweat.

Let's build a TCP server that can comfortably handle 10K+ connections. Not a toy example, but something you could actually deploy.

---

## The Basic Structure

Every TCP server follows the same pattern: listen on a port, accept connections, handle each connection. Here's the skeleton.

```go
package main

import (
    "log"
    "net"
)

func main() {
    // Listen on all interfaces, port 8080
    listener, err := net.Listen("tcp", ":8080")
    if err != nil {
        log.Fatalf("Failed to start listener: %v", err)
    }
    defer listener.Close()

    log.Println("Server listening on :8080")

    for {
        // Accept blocks until a new connection arrives
        conn, err := listener.Accept()
        if err != nil {
            log.Printf("Failed to accept connection: %v", err)
            continue
        }

        // Handle each connection in its own goroutine
        go handleConnection(conn)
    }
}

func handleConnection(conn net.Conn) {
    defer conn.Close()

    // Your connection logic here
    buf := make([]byte, 1024)
    for {
        n, err := conn.Read(buf)
        if err != nil {
            return
        }
        conn.Write(buf[:n]) // Echo back
    }
}
```

This works, but it won't scale to 10K connections reliably. Let's fix that.

---

## Setting Up Connection Limits

The first problem with unlimited goroutines is resource exhaustion. Each connection consumes memory and file descriptors. Without limits, a traffic spike or slow loris attack will bring down your server.

Use a semaphore pattern to cap concurrent connections.

```go
package main

import (
    "log"
    "net"
    "sync"
)

const maxConnections = 10000

func main() {
    listener, err := net.Listen("tcp", ":8080")
    if err != nil {
        log.Fatalf("Failed to start listener: %v", err)
    }
    defer listener.Close()

    // Semaphore to limit concurrent connections
    sem := make(chan struct{}, maxConnections)

    var wg sync.WaitGroup

    for {
        conn, err := listener.Accept()
        if err != nil {
            log.Printf("Accept error: %v", err)
            continue
        }

        // Acquire semaphore slot (blocks if at capacity)
        sem <- struct{}{}

        wg.Add(1)
        go func(c net.Conn) {
            defer wg.Done()
            defer func() { <-sem }() // Release slot when done
            handleConnection(c)
        }(conn)
    }
}
```

---

## Timeouts Are Not Optional

Connections without timeouts are a liability. Clients that connect but never send data will hold resources forever. Set read and write deadlines.

```go
import (
    "net"
    "time"
)

func handleConnection(conn net.Conn) {
    defer conn.Close()

    buf := make([]byte, 4096)

    for {
        // Set a deadline for reading - client must send within 30 seconds
        conn.SetReadDeadline(time.Now().Add(30 * time.Second))

        n, err := conn.Read(buf)
        if err != nil {
            // Timeout or connection closed
            return
        }

        // Set a deadline for writing - response must complete within 10 seconds
        conn.SetWriteDeadline(time.Now().Add(10 * time.Second))

        if _, err := conn.Write(buf[:n]); err != nil {
            return
        }
    }
}
```

---

## Buffer Pooling for Memory Efficiency

Creating a new buffer for every read operation generates garbage. At 10K connections, this thrashes the garbage collector. Use `sync.Pool` to reuse buffers.

```go
import "sync"

// Pool of reusable buffers
var bufferPool = sync.Pool{
    New: func() interface{} {
        // 4KB buffers - adjust based on your protocol
        return make([]byte, 4096)
    },
}

func handleConnection(conn net.Conn) {
    defer conn.Close()

    // Get buffer from pool
    buf := bufferPool.Get().([]byte)
    defer bufferPool.Put(buf) // Return to pool when done

    for {
        conn.SetReadDeadline(time.Now().Add(30 * time.Second))
        n, err := conn.Read(buf)
        if err != nil {
            return
        }

        conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
        if _, err := conn.Write(buf[:n]); err != nil {
            return
        }
    }
}
```

---

## Graceful Shutdown

Hard-stopping a server with active connections is bad form. Implement graceful shutdown so existing connections can complete.

```go
package main

import (
    "context"
    "log"
    "net"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

func main() {
    listener, err := net.Listen("tcp", ":8080")
    if err != nil {
        log.Fatalf("Failed to start: %v", err)
    }

    // Context for coordinating shutdown
    ctx, cancel := context.WithCancel(context.Background())

    var wg sync.WaitGroup

    // Handle shutdown signals
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        <-sigChan
        log.Println("Shutdown signal received")
        cancel()
        listener.Close() // Unblocks Accept()
    }()

    log.Println("Server listening on :8080")

    for {
        conn, err := listener.Accept()
        if err != nil {
            // Check if we're shutting down
            select {
            case <-ctx.Done():
                log.Println("Waiting for connections to close...")
                wg.Wait()
                log.Println("Server stopped")
                return
            default:
                log.Printf("Accept error: %v", err)
                continue
            }
        }

        wg.Add(1)
        go func(c net.Conn) {
            defer wg.Done()
            handleConnectionWithContext(ctx, c)
        }(conn)
    }
}

func handleConnectionWithContext(ctx context.Context, conn net.Conn) {
    defer conn.Close()

    buf := make([]byte, 4096)

    for {
        // Check if shutdown was requested
        select {
        case <-ctx.Done():
            return
        default:
        }

        conn.SetReadDeadline(time.Now().Add(30 * time.Second))
        n, err := conn.Read(buf)
        if err != nil {
            return
        }

        conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
        if _, err := conn.Write(buf[:n]); err != nil {
            return
        }
    }
}
```

---

## OS-Level Tuning

Your code might be perfect, but the OS has limits too. On Linux, you'll need to adjust these.

Increase file descriptor limits - each connection is a file descriptor.

```bash
# Check current limits
ulimit -n

# Set for current session
ulimit -n 65535

# Permanent: add to /etc/security/limits.conf
* soft nofile 65535
* hard nofile 65535
```

Tune TCP stack for high concurrency.

```bash
# /etc/sysctl.conf

# Increase connection backlog
net.core.somaxconn = 65535

# Increase number of incoming connections queue
net.core.netdev_max_backlog = 65535

# Reuse TIME_WAIT sockets faster
net.ipv4.tcp_tw_reuse = 1

# Increase ephemeral port range
net.ipv4.ip_local_port_range = 1024 65535

# Apply changes
sudo sysctl -p
```

---

## Common Pitfalls

**Forgetting to close connections.** Sounds obvious, but defer statements in the wrong place will leak connections. Always `defer conn.Close()` immediately after accepting.

**Blocking in handlers.** If your handler does any I/O besides the connection itself - database calls, HTTP requests - use timeouts there too. A slow database will cascade into connection exhaustion.

**Not handling partial writes.** `conn.Write()` might not write everything. For critical applications, use a loop or `io.Copy()`.

```go
// Ensure all bytes are written
func writeAll(conn net.Conn, data []byte) error {
    for len(data) > 0 {
        n, err := conn.Write(data)
        if err != nil {
            return err
        }
        data = data[n:]
    }
    return nil
}
```

**Ignoring the accept loop error.** When `Accept()` fails, logging and continuing is fine for transient errors. But if it fails repeatedly, you might have a bigger problem. Consider adding backoff.

---

## Putting It All Together

Here's a complete, production-ready TCP echo server.

```go
package main

import (
    "context"
    "log"
    "net"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

const (
    maxConnections = 10000
    readTimeout    = 30 * time.Second
    writeTimeout   = 10 * time.Second
    bufferSize     = 4096
)

var bufferPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, bufferSize)
    },
}

func main() {
    listener, err := net.Listen("tcp", ":8080")
    if err != nil {
        log.Fatalf("Failed to start: %v", err)
    }

    ctx, cancel := context.WithCancel(context.Background())
    sem := make(chan struct{}, maxConnections)
    var wg sync.WaitGroup

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        <-sigChan
        log.Println("Shutting down...")
        cancel()
        listener.Close()
    }()

    log.Printf("Server listening on :8080 (max %d connections)", maxConnections)

    for {
        conn, err := listener.Accept()
        if err != nil {
            select {
            case <-ctx.Done():
                wg.Wait()
                log.Println("Server stopped")
                return
            default:
                log.Printf("Accept error: %v", err)
                continue
            }
        }

        select {
        case sem <- struct{}{}:
            wg.Add(1)
            go func(c net.Conn) {
                defer wg.Done()
                defer func() { <-sem }()
                handleConnection(ctx, c)
            }(conn)
        default:
            // At capacity - reject connection
            conn.Close()
        }
    }
}

func handleConnection(ctx context.Context, conn net.Conn) {
    defer conn.Close()

    buf := bufferPool.Get().([]byte)
    defer bufferPool.Put(buf)

    for {
        select {
        case <-ctx.Done():
            return
        default:
        }

        conn.SetReadDeadline(time.Now().Add(readTimeout))
        n, err := conn.Read(buf)
        if err != nil {
            return
        }

        conn.SetWriteDeadline(time.Now().Add(writeTimeout))
        if _, err := conn.Write(buf[:n]); err != nil {
            return
        }
    }
}
```

---

## Benchmarking

Use `wrk` or a custom TCP load tester to verify. Here's a quick test.

```bash
# Install tcpkali for TCP benchmarking
# On macOS: brew install tcpkali
# On Linux: apt-get install tcpkali

# Run 10000 concurrent connections for 30 seconds
tcpkali -c 10000 -T 30s -m "PING" 127.0.0.1:8080
```

On a decent machine, you should see all 10K connections handled smoothly with low latency.

---

Go makes high-concurrency networking surprisingly approachable. The goroutine-per-connection model, combined with proper resource management, gets you very far. For even higher scale - think 100K+ connections - you might look into epoll-based approaches like `gnet`, but for most use cases, what we built here will serve you well.

The key is respecting the fundamentals: limit resources, set timeouts, handle shutdown gracefully, and always close your connections.
