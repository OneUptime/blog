# How to Implement Connection Pooling for IPv4 TCP in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Connection Pooling, IPv4, TCP, Performance, Networking

Description: Build a reusable TCP connection pool in Go to efficiently manage IPv4 connections, reducing overhead from repeated connection establishment to the same backend.

## Introduction

Establishing a TCP connection involves a three-way handshake. If you're layering TLS on top of TCP, the TLS handshake adds more round trips. For high-frequency operations to the same backend (database, cache, microservice), connection pooling amortizes this cost by reusing established connections.

## Simple Connection Pool Implementation

```go
package main

import (
    "errors"
    "fmt"
    "net"
    "sync"
    "time"
)

// Pool represents a thread-safe pool of TCP connections
type Pool struct {
    mu      sync.Mutex
    conns   chan net.Conn
    address string
    timeout time.Duration
    closed  bool
}

// NewPool creates a connection pool for the given IPv4 address
func NewPool(address string, initialSize, maxIdle int, timeout time.Duration) (*Pool, error) {
    if maxIdle <= 0 {
        return nil, errors.New("maxIdle must be greater than 0")
    }
    if initialSize < 0 || initialSize > maxIdle {
        return nil, errors.New("initialSize must be between 0 and maxIdle")
    }

    p := &Pool{
        conns:   make(chan net.Conn, maxIdle),
        address: address,
        timeout: timeout,
    }

    // Pre-fill with initial connections
    for i := 0; i < initialSize; i++ {
        conn, err := net.DialTimeout("tcp4", address, timeout)
        if err != nil {
            p.Close()
            return nil, fmt.Errorf("failed to initialize pool: %w", err)
        }
        p.conns <- conn
    }

    return p, nil
}

// Get retrieves an idle connection from the pool, creating a new one if needed
func (p *Pool) Get() (net.Conn, error) {
    p.mu.Lock()
    if p.closed {
        p.mu.Unlock()
        return nil, errors.New("pool is closed")
    }

    select {
    case conn := <-p.conns:
        p.mu.Unlock()
        return conn, nil
    default:
        address := p.address
        timeout := p.timeout
        p.mu.Unlock()
        // No idle connection available - create a new one
        conn, err := net.DialTimeout("tcp4", address, timeout)
        if err != nil {
            return nil, err
        }

        p.mu.Lock()
        defer p.mu.Unlock()
        if p.closed {
            conn.Close()
            return nil, errors.New("pool is closed")
        }

        return conn, nil
    }
}

// Put returns an idle connection to the pool
func (p *Pool) Put(conn net.Conn) {
    if conn == nil {
        return
    }

    p.mu.Lock()
    defer p.mu.Unlock()

    if p.closed {
        conn.Close()
        return
    }

    select {
    case p.conns <- conn:
        // Returned to pool successfully
    default:
        // Pool is full - close the excess connection
        conn.Close()
    }
}

// Close drains and closes all pooled connections
func (p *Pool) Close() {
    p.mu.Lock()
    defer p.mu.Unlock()

    if p.closed {
        return
    }

    p.closed = true
    close(p.conns)
    for conn := range p.conns {
        conn.Close()
    }
}
```

## Using the Connection Pool

```go
package main

import (
    "bufio"
    "fmt"
    "sync"
    "time"
)

func main() {
    // Create a pool with 5 initial connections and room for 20 idle connections
    pool, err := NewPool("10.0.0.10:6379", 5, 20, 5*time.Second)
    if err != nil {
        panic(err)
    }
    defer pool.Close()

    // Simulate 100 concurrent requests using the pool
    var wg sync.WaitGroup
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(reqNum int) {
            defer wg.Done()

            // Get a connection from the pool
            conn, err := pool.Get()
            if err != nil {
                fmt.Printf("Request %d: failed to get connection: %v\n", reqNum, err)
                return
            }

            reuseConn := true
            defer func() {
                if !reuseConn {
                    conn.Close()
                    return
                }
                if err := conn.SetDeadline(time.Time{}); err != nil {
                    conn.Close()
                    return
                }
                pool.Put(conn)
            }()

            // Use the connection
            if err := conn.SetDeadline(time.Now().Add(5 * time.Second)); err != nil {
                fmt.Printf("Request %d: deadline error: %v\n", reqNum, err)
                reuseConn = false
                return
            }
            if _, err := fmt.Fprintf(conn, "PING\r\n"); err != nil {
                fmt.Printf("Request %d: write error: %v\n", reqNum, err)
                reuseConn = false
                return
            }

            reader := bufio.NewReader(conn)
            response, err := reader.ReadString('\n')
            if err != nil {
                fmt.Printf("Request %d: read error: %v\n", reqNum, err)
                reuseConn = false
                return
            }

            fmt.Printf("Request %d: %s", reqNum, response)
        }(i)
    }

    wg.Wait()
    fmt.Println("All requests completed")
}
```

## Using sync.Pool for Short-Lived Buffers

For request/response buffers (not connections), use `sync.Pool`:

```go
var bufPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 4096)   // 4KB buffer
    },
}

// In your handler:
buf := bufPool.Get().([]byte)
defer bufPool.Put(buf)  // Return buffer to pool when done
```

## Using net/http's Built-In Pool

For HTTP workloads, `http.Client` has a built-in connection pool via `http.Transport`:

```go
transport := &http.Transport{
    MaxIdleConns:        100,              // Maximum idle (keepalive) connections
    MaxIdleConnsPerHost: 10,              // Per-host idle connections
    IdleConnTimeout:     90 * time.Second,
    DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
        d := &net.Dialer{
            Timeout:   30 * time.Second,
            KeepAlive: 30 * time.Second,
        }
        // Force IPv4
        return d.DialContext(ctx, "tcp4", address)
    },
}

client := &http.Client{Transport: transport}
```

## Conclusion

Connection pooling is essential for high-throughput Go services that communicate with backends over IPv4 TCP. The custom pool shown here reuses idle connections and closes failed or excess connections. For HTTP workloads, configure `http.Transport` instead of building a custom pool.
