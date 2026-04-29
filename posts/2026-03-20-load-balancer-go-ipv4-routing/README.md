# How to Build a Load Balancer in Go That Routes IPv4 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Load Balancer, IPv4, HTTP, TCP, Networking, Reverse Proxy

Description: Learn how to build a TCP and HTTP load balancer in Go that distributes IPv4 traffic across multiple backend servers using round-robin and health-checked routing.

## HTTP Load Balancer with Health Checks

```go
package main

import (
    "log"
    "net"
    "net/http"
    "net/http/httputil"
    "net/url"
    "sync"
    "sync/atomic"
    "time"
)

type Backend struct {
    URL     *url.URL
    Proxy   *httputil.ReverseProxy
    Alive   atomic.Bool
}

type LoadBalancer struct {
    backends []*Backend
    counter  uint64
    mu       sync.RWMutex
}

func NewLoadBalancer(targets []string) (*LoadBalancer, error) {
    backends := make([]*Backend, 0, len(targets))
    for _, t := range targets {
        u, err := url.Parse(t)
        if err != nil {
            return nil, err
        }
        b := &Backend{
            URL:   u,
            Proxy: httputil.NewSingleHostReverseProxy(u),
        }
        b.Alive.Store(true)
        backends = append(backends, b)
    }
    return &LoadBalancer{backends: backends}, nil
}

// NextAlive returns the next alive backend using round-robin
func (lb *LoadBalancer) NextAlive() *Backend {
    lb.mu.RLock()
    defer lb.mu.RUnlock()

    for i := 0; i < len(lb.backends); i++ {
        idx := atomic.AddUint64(&lb.counter, 1) % uint64(len(lb.backends))
        b := lb.backends[idx]
        if b.Alive.Load() {
            return b
        }
    }
    return nil
}

func (lb *LoadBalancer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    backend := lb.NextAlive()
    if backend == nil {
        http.Error(w, "No healthy backends available", http.StatusServiceUnavailable)
        return
    }

    backend.Proxy.ServeHTTP(w, r)
}

// HealthCheck periodically checks if backends are alive
func (lb *LoadBalancer) HealthCheck(interval time.Duration) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()

    client := &http.Client{Timeout: 2 * time.Second}
    for range ticker.C {
        for _, b := range lb.backends {
            resp, err := client.Get(b.URL.String() + "/health")
            if resp != nil {
                resp.Body.Close()
            }

            if err != nil || resp.StatusCode != http.StatusOK {
                if b.Alive.Load() {
                    log.Printf("Backend %s is DOWN", b.URL)
                }
                b.Alive.Store(false)
            } else {
                if !b.Alive.Load() {
                    log.Printf("Backend %s is UP", b.URL)
                }
                b.Alive.Store(true)
            }
        }
    }
}

func main() {
    lb, err := NewLoadBalancer([]string{
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
    })
    if err != nil {
        log.Fatal(err)
    }

    // Start health checks every 10 seconds
    go lb.HealthCheck(10 * time.Second)

    ln, err := net.Listen("tcp4", ":8080")
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Load balancer on :8080")
    log.Fatal(http.Serve(ln, lb))
}
```

## TCP Layer-4 Load Balancer

```go
package main

import (
    "io"
    "log"
    "net"
    "sync/atomic"
)

var backends = []string{
    "127.0.0.1:3001",
    "127.0.0.1:3002",
    "127.0.0.1:3003",
}
var counter uint64

func nextBackend() string {
    idx := atomic.AddUint64(&counter, 1) % uint64(len(backends))
    return backends[idx]
}

func proxyTCP(dst, src *net.TCPConn, done chan<- struct{}) {
    defer func() { done <- struct{}{} }()
    io.Copy(dst, src)
    dst.CloseWrite()
}

func handleTCP(client net.Conn) {
    clientTCP, ok := client.(*net.TCPConn)
    if !ok {
        client.Close()
        log.Printf("Unexpected client connection type %T", client)
        return
    }
    defer clientTCP.Close()

    target := nextBackend()

    backend, err := net.Dial("tcp4", target)
    if err != nil {
        log.Printf("Failed to connect to backend %s: %v", target, err)
        return
    }
    backendTCP, ok := backend.(*net.TCPConn)
    if !ok {
        backend.Close()
        log.Printf("Unexpected backend connection type %T", backend)
        return
    }
    defer backendTCP.Close()

    log.Printf("Proxying %s -> %s", client.RemoteAddr(), target)

    // Bidirectional copy
    done := make(chan struct{}, 2)
    go proxyTCP(backendTCP, clientTCP, done)
    go proxyTCP(clientTCP, backendTCP, done)
    <-done
    <-done
}

func main() {
    ln, err := net.Listen("tcp4", ":9000")
    if err != nil {
        log.Fatal(err)
    }
    defer ln.Close()

    log.Println("TCP load balancer on :9000")
    for {
        conn, err := ln.Accept()
        if err != nil {
            break
        }
        go handleTCP(conn)
    }
}
```

## Conclusion

A Go HTTP load balancer uses `httputil.ReverseProxy` with round-robin backend selection and periodic health checks. A TCP load balancer is even simpler: accept a connection, dial a backend, and `io.Copy` in both directions. For production, consider HAProxy or Nginx for load balancing with more features and battle-tested reliability.
