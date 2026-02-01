# How to Build High-Performance Network Services in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Networking, TCP, Performance, Concurrency

Description: A practical guide to building high-performance TCP and UDP network services in Go with connection pooling and efficient I/O.

---

Go has become the language of choice for building network services. From Docker to Kubernetes to countless microservices in production, Go powers some of the most demanding network infrastructure on the planet. The reasons are straightforward: goroutines make concurrency trivial, the standard library provides solid networking primitives, and the compiled binary needs no runtime dependencies.

This guide walks through building production-ready network services in Go. We will start with the basics and progressively add connection pooling, buffered I/O, and graceful shutdown - the pieces you actually need when things get serious.

## The net Package Basics

Go's `net` package provides everything you need for TCP, UDP, Unix sockets, and DNS resolution. Unlike other languages where you might reach for third-party libraries, the standard library here is genuinely good enough for production use.

The core types you will work with are `net.Listener` for servers and `net.Conn` for connections. Both implement `io.Reader` and `io.Writer`, which means you get the entire Go I/O ecosystem for free.

Here is the simplest possible TCP server that accepts connections and echoes data back:

```go
// Basic TCP echo server - accepts connections and echoes data back
// This is the foundation we will build upon throughout this guide
package main

import (
    "io"
    "log"
    "net"
)

func main() {
    // Listen on TCP port 8080 on all interfaces
    listener, err := net.Listen("tcp", ":8080")
    if err != nil {
        log.Fatal(err)
    }
    defer listener.Close()

    log.Println("Server listening on :8080")

    for {
        // Accept blocks until a new connection arrives
        conn, err := listener.Accept()
        if err != nil {
            log.Println("Accept error:", err)
            continue
        }

        // Handle each connection in its own goroutine
        // This is the key to Go's concurrency model
        go handleConnection(conn)
    }
}

func handleConnection(conn net.Conn) {
    defer conn.Close()
    
    // io.Copy reads from conn and writes back to conn
    // It handles buffering internally and is quite efficient
    io.Copy(conn, conn)
}
```

This works, but it is not production-ready. We have no timeouts, no limit on concurrent connections, and no way to shut down gracefully. Let us fix that.

## TCP Server Patterns That Scale

The one-goroutine-per-connection model scales surprisingly well. Go's scheduler handles millions of goroutines, and each one only costs about 2KB of stack space initially. But you still need guard rails.

The following pattern adds connection limits and proper timeout handling:

```go
// Production TCP server with connection limits and timeouts
// This pattern prevents resource exhaustion under load
package main

import (
    "context"
    "log"
    "net"
    "sync"
    "time"
)

type Server struct {
    listener    net.Listener
    maxConns    int
    connSem     chan struct{}  // Semaphore to limit concurrent connections
    readTimeout time.Duration
    wg          sync.WaitGroup // Tracks active connections for graceful shutdown
}

func NewServer(addr string, maxConns int) (*Server, error) {
    listener, err := net.Listen("tcp", addr)
    if err != nil {
        return nil, err
    }

    return &Server{
        listener:    listener,
        maxConns:    maxConns,
        connSem:     make(chan struct{}, maxConns),
        readTimeout: 30 * time.Second,
    }, nil
}

func (s *Server) Serve(ctx context.Context) error {
    for {
        // Check if we should stop accepting new connections
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
        }

        // Set a deadline so Accept does not block forever
        // This allows us to check the context periodically
        s.listener.(*net.TCPListener).SetDeadline(time.Now().Add(time.Second))

        conn, err := s.listener.Accept()
        if err != nil {
            if ne, ok := err.(net.Error); ok && ne.Timeout() {
                continue // Deadline exceeded, loop back and check context
            }
            return err
        }

        // Try to acquire a slot from the semaphore
        select {
        case s.connSem <- struct{}{}:
            s.wg.Add(1)
            go s.handleConnection(conn)
        default:
            // At capacity - reject the connection
            log.Println("Connection limit reached, rejecting")
            conn.Close()
        }
    }
}

func (s *Server) handleConnection(conn net.Conn) {
    defer func() {
        conn.Close()
        <-s.connSem  // Release the semaphore slot
        s.wg.Done()
    }()

    // Set read deadline to prevent idle connections from hogging resources
    conn.SetReadDeadline(time.Now().Add(s.readTimeout))

    // Your actual protocol handling goes here
    buf := make([]byte, 4096)
    for {
        n, err := conn.Read(buf)
        if err != nil {
            return
        }

        // Reset deadline after successful read
        conn.SetReadDeadline(time.Now().Add(s.readTimeout))

        // Echo back - replace with your actual logic
        conn.Write(buf[:n])
    }
}
```

The semaphore pattern using a buffered channel is idiomatic Go. When the channel is full, the `select` hits the `default` case and we reject the connection. Simple and effective.

## Buffered I/O for Better Throughput

Raw `net.Conn` reads and writes make a system call for every operation. For high-throughput services, wrapping connections with `bufio` reduces system call overhead dramatically.

Here is how to add buffered I/O to your connection handler:

```go
// Buffered I/O wrapper for reduced system call overhead
// This can improve throughput by 2-3x for small reads and writes
import (
    "bufio"
    "net"
)

func handleConnectionBuffered(conn net.Conn) {
    defer conn.Close()

    // Create buffered reader and writer
    // 4KB buffers are a good default - match your typical message size
    reader := bufio.NewReaderSize(conn, 4096)
    writer := bufio.NewWriterSize(conn, 4096)

    buf := make([]byte, 4096)
    for {
        n, err := reader.Read(buf)
        if err != nil {
            return
        }

        _, err = writer.Write(buf[:n])
        if err != nil {
            return
        }

        // Flush ensures data is sent immediately
        // For request-response protocols, flush after each response
        // For streaming, you might flush less often
        if err := writer.Flush(); err != nil {
            return
        }
    }
}
```

For line-based protocols, `bufio.Scanner` is even better:

```go
// Line-based protocol handling with Scanner
// Perfect for text protocols like Redis RESP or simple command interfaces
func handleLineProtocol(conn net.Conn) {
    defer conn.Close()

    scanner := bufio.NewScanner(conn)
    writer := bufio.NewWriter(conn)

    for scanner.Scan() {
        line := scanner.Text()
        
        // Process the command and generate response
        response := processCommand(line)
        
        writer.WriteString(response + "\n")
        writer.Flush()
    }

    if err := scanner.Err(); err != nil {
        log.Println("Scanner error:", err)
    }
}
```

## Connection Pooling for Clients

When your service needs to talk to backends - databases, caches, other services - connection pooling becomes critical. Creating a new TCP connection for every request adds latency and exhausts file descriptors.

Here is a simple but effective connection pool:

```go
// Connection pool implementation
// Reuses connections to avoid TCP handshake overhead
package pool

import (
    "errors"
    "net"
    "sync"
    "time"
)

var ErrPoolClosed = errors.New("pool is closed")

type Pool struct {
    mu       sync.Mutex
    conns    chan net.Conn
    factory  func() (net.Conn, error)
    closed   bool
    maxIdle  int
    idleTime time.Duration
}

func NewPool(factory func() (net.Conn, error), maxIdle int, idleTime time.Duration) *Pool {
    return &Pool{
        conns:    make(chan net.Conn, maxIdle),
        factory:  factory,
        maxIdle:  maxIdle,
        idleTime: idleTime,
    }
}

// Get retrieves a connection from the pool or creates a new one
func (p *Pool) Get() (net.Conn, error) {
    p.mu.Lock()
    if p.closed {
        p.mu.Unlock()
        return nil, ErrPoolClosed
    }
    p.mu.Unlock()

    // Try to get an existing connection
    select {
    case conn := <-p.conns:
        // Verify the connection is still alive
        if err := p.checkConn(conn); err != nil {
            conn.Close()
            return p.factory()
        }
        return conn, nil
    default:
        // No idle connections, create a new one
        return p.factory()
    }
}

// Put returns a connection to the pool
func (p *Pool) Put(conn net.Conn) {
    p.mu.Lock()
    if p.closed {
        p.mu.Unlock()
        conn.Close()
        return
    }
    p.mu.Unlock()

    // Try to put the connection back in the pool
    select {
    case p.conns <- conn:
        // Connection pooled successfully
    default:
        // Pool is full, close the connection
        conn.Close()
    }
}

// checkConn verifies a pooled connection is still usable
func (p *Pool) checkConn(conn net.Conn) error {
    // Set a very short deadline to check if the connection is alive
    conn.SetReadDeadline(time.Now().Add(time.Millisecond))
    
    one := make([]byte, 1)
    _, err := conn.Read(one)
    
    // Reset the deadline
    conn.SetReadDeadline(time.Time{})
    
    if err != nil {
        // Timeout is expected - connection is alive
        if ne, ok := err.(net.Error); ok && ne.Timeout() {
            return nil
        }
        return err
    }
    return nil
}

func (p *Pool) Close() {
    p.mu.Lock()
    p.closed = true
    p.mu.Unlock()

    close(p.conns)
    for conn := range p.conns {
        conn.Close()
    }
}
```

Use it like this:

```go
// Example usage of the connection pool
// Factory function creates new connections when needed
pool := NewPool(func() (net.Conn, error) {
    return net.DialTimeout("tcp", "backend:6379", 5*time.Second)
}, 10, time.Minute)

defer pool.Close()

// Get a connection, use it, put it back
conn, err := pool.Get()
if err != nil {
    log.Fatal(err)
}

// Do work with conn...

pool.Put(conn)
```

## Graceful Shutdown

Servers that drop connections when restarting make users angry. Graceful shutdown means: stop accepting new connections, finish processing existing ones, then exit.

Here is the complete pattern:

```go
// Graceful shutdown implementation
// Handles SIGINT and SIGTERM, waits for active connections to finish
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    server, err := NewServer(":8080", 1000)
    if err != nil {
        log.Fatal(err)
    }

    // Create a context that cancels on SIGINT or SIGTERM
    ctx, cancel := context.WithCancel(context.Background())

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        sig := <-sigChan
        log.Printf("Received signal %v, initiating shutdown", sig)
        cancel()
    }()

    // Start accepting connections
    go func() {
        if err := server.Serve(ctx); err != nil && err != context.Canceled {
            log.Printf("Server error: %v", err)
        }
    }()

    <-ctx.Done()

    // Stop accepting new connections
    server.listener.Close()

    // Wait for existing connections to finish with a timeout
    done := make(chan struct{})
    go func() {
        server.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        log.Println("All connections closed, exiting")
    case <-time.After(30 * time.Second):
        log.Println("Shutdown timeout, forcing exit")
    }
}
```

The key insight is using a `sync.WaitGroup` to track active connections. When shutdown starts, we stop accepting new connections and wait for the WaitGroup to hit zero.

## Benchmarking Your Server

Performance claims mean nothing without numbers. Go's built-in benchmarking and tools like `wrk` help you measure actual throughput.

First, write benchmarks for your core logic:

```go
// Benchmark tests for your protocol handler
// Run with: go test -bench=. -benchmem
package main

import (
    "net"
    "testing"
)

func BenchmarkHandleConnection(b *testing.B) {
    // Create a pair of connected sockets for testing
    server, client := net.Pipe()
    defer server.Close()
    defer client.Close()

    go handleConnection(server)

    data := []byte("benchmark test data that represents typical payload")

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        client.Write(data)
        
        buf := make([]byte, len(data))
        client.Read(buf)
    }
}
```

For full system benchmarks, use tools like `wrk` or write a custom load generator:

```go
// Simple load generator for testing your server
// Measures throughput and latency under concurrent load
package main

import (
    "fmt"
    "net"
    "sync"
    "sync/atomic"
    "time"
)

func loadTest(addr string, concurrency int, duration time.Duration) {
    var ops int64
    var errors int64

    var wg sync.WaitGroup
    stop := make(chan struct{})

    // Start workers
    for i := 0; i < concurrency; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()

            conn, err := net.Dial("tcp", addr)
            if err != nil {
                atomic.AddInt64(&errors, 1)
                return
            }
            defer conn.Close()

            data := []byte("test payload")
            buf := make([]byte, len(data))

            for {
                select {
                case <-stop:
                    return
                default:
                }

                conn.Write(data)
                conn.Read(buf)
                atomic.AddInt64(&ops, 1)
            }
        }()
    }

    // Run for the specified duration
    time.Sleep(duration)
    close(stop)
    wg.Wait()

    fmt.Printf("Operations: %d\n", ops)
    fmt.Printf("Errors: %d\n", errors)
    fmt.Printf("Throughput: %.2f ops/sec\n", float64(ops)/duration.Seconds())
}
```

A well-tuned Go TCP server on modern hardware should handle 100K+ requests per second for simple protocols. If you are seeing less, profile with `pprof` to find the bottleneck.

## Practical Tips

A few things I have learned from running Go network services in production:

**Set TCP keepalives.** Long-lived connections through load balancers and firewalls will get killed if idle. Enable keepalives:

```go
// Enable TCP keepalives on accepted connections
// Prevents connections from being killed by middleboxes
if tcpConn, ok := conn.(*net.TCPConn); ok {
    tcpConn.SetKeepAlive(true)
    tcpConn.SetKeepAlivePeriod(30 * time.Second)
}
```

**Monitor file descriptor limits.** Each connection uses a file descriptor. Check your limits with `ulimit -n` and increase if needed. In production, set it in your systemd unit file or container config.

**Use connection deadlines consistently.** A forgotten deadline means a leaked goroutine. Set both read and write deadlines, and reset them after successful operations.

**Consider UDP for high-volume, loss-tolerant data.** UDP eliminates connection overhead entirely. For metrics, logs, or any fire-and-forget data, UDP servers can handle massive throughput with minimal resources.

Building network services in Go is straightforward once you know the patterns. The standard library gives you solid primitives, goroutines handle concurrency, and the result is code that is easy to read and performs well. Start with the basics, add the production hardening pieces as you need them, and measure everything.

---

*Monitor your network services with [OneUptime](https://oneuptime.com) - track throughput, latency, and connection metrics.*
