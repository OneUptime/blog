# How to Build a Concurrent TCP Server in Go with IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, TCP, Concurrency, Goroutines, IPv4, Server, Networking

Description: Learn how to build a high-concurrency IPv4 TCP server in Go using goroutines, with connection tracking, graceful shutdown, and resource management.

## Go's Concurrency Model for TCP

Go's goroutines are extremely lightweight (starting with small stacks, around 2 KB, that grow and shrink dynamically) making the "goroutine per connection" pattern practical even for thousands of concurrent clients-unlike threads in other languages.

## Production-Grade Concurrent TCP Server

```go
package main

import (
    "context"
    "errors"
    "io"
    "log"
    "net"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

type Server struct {
    listener net.Listener
    wg       sync.WaitGroup
    quit     chan struct{}
    serveDone chan struct{}

    mu    sync.Mutex
    conns map[net.Conn]struct{}
}

func NewServer(addr string) (*Server, error) {
    ln, err := net.Listen("tcp4", addr)
    if err != nil {
        return nil, err
    }
    return &Server{
        listener: ln,
        quit:     make(chan struct{}),
        serveDone: make(chan struct{}),
        conns:    make(map[net.Conn]struct{}),
    }, nil
}

func (s *Server) handleConn(conn net.Conn) {
    defer func() {
        s.mu.Lock()
        delete(s.conns, conn)
        s.mu.Unlock()
        conn.Close()
        s.wg.Done()
    }()

    addr := conn.RemoteAddr().String()
    log.Printf("[%s] Connected", addr)

    buf := make([]byte, 4096)
    for {
        // Set read deadline to detect idle clients
        conn.SetReadDeadline(time.Now().Add(60 * time.Second))

        n, err := conn.Read(buf)
        if err != nil {
            if err == io.EOF {
                log.Printf("[%s] Disconnected gracefully", addr)
            } else if errors.Is(err, os.ErrDeadlineExceeded) {
                log.Printf("[%s] Idle timeout", addr)
            } else if errors.Is(err, net.ErrClosed) {
                log.Printf("[%s] Connection closed during shutdown", addr)
            } else {
                log.Printf("[%s] Read error: %v", addr, err)
            }
            return
        }

        // Echo data back
        conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
        if _, err := conn.Write(buf[:n]); err != nil {
            if errors.Is(err, net.ErrClosed) {
                log.Printf("[%s] Connection closed during shutdown", addr)
                return
            }
            log.Printf("[%s] Write error: %v", addr, err)
            return
        }
    }
}

func (s *Server) Serve() {
    defer close(s.serveDone)

    for {
        conn, err := s.listener.Accept()
        if err != nil {
            select {
            case <-s.quit:
                return  // Shutdown requested
            default:
                log.Printf("Accept error: %v", err)
            }
            continue
        }

        s.mu.Lock()
        s.conns[conn] = struct{}{}
        s.mu.Unlock()
        s.wg.Add(1)
        go s.handleConn(conn)
    }
}

func (s *Server) Shutdown() {
    close(s.quit)
    s.listener.Close()
    <-s.serveDone

    // Close active connections to unblock pending reads and writes.
    s.mu.Lock()
    conns := make([]net.Conn, 0, len(s.conns))
    for conn := range s.conns {
        conns = append(conns, conn)
    }
    s.mu.Unlock()

    for _, conn := range conns {
        conn.Close()
    }

    // Wait for all connections to finish (with timeout)
    done := make(chan struct{})
    go func() {
        s.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        log.Println("All connections closed cleanly")
    case <-time.After(30 * time.Second):
        log.Println("Shutdown timeout: some connections may have been dropped")
    }
}

func main() {
    srv, err := NewServer("0.0.0.0:9000")
    if err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }

    log.Printf("Server listening on %s", srv.listener.Addr())

    // Start serving in a goroutine
    go srv.Serve()

    // Wait for SIGINT or SIGTERM
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()
    <-ctx.Done()

    log.Println("Shutting down server...")
    srv.Shutdown()
    log.Println("Server stopped")
}
```

## Limiting Concurrency

Prevent resource exhaustion with a semaphore:

```go
type Server struct {
    listener   net.Listener
    wg         sync.WaitGroup
    semaphore  chan struct{}   // Limits concurrent connections
}

func NewServerWithLimit(addr string, maxConns int) (*Server, error) {
    ln, err := net.Listen("tcp4", addr)
    if err != nil {
        return nil, err
    }
    return &Server{
        listener:  ln,
        semaphore: make(chan struct{}, maxConns),
    }, nil
}

func (s *Server) Serve() {
    for {
        conn, err := s.listener.Accept()
        if err != nil {
            break
        }

        // Acquire semaphore (blocks if at max connections)
        s.semaphore <- struct{}{}
        s.wg.Add(1)

        go func(c net.Conn) {
            defer func() {
                <-s.semaphore  // Release slot
                s.wg.Done()
                c.Close()
            }()
            // Handle connection...
        }(conn)
    }
}
```

## Conclusion

Go's goroutine-per-connection pattern is idiomatic and scales well. Use `sync.WaitGroup` together with active connection tracking for graceful shutdown, set read/write deadlines to clean up idle clients, and a semaphore channel to cap maximum concurrency. Closing the listener causes `Accept()` to return an error, cleanly stopping the accept loop, but already accepted connections still need to be drained or closed separately.
