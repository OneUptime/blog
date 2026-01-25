# How to Build a Layer 7 Load Balancer with Health Checks in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Load Balancer, Layer 7, Health Checks, Networking

Description: Learn how to build a production-ready Layer 7 (HTTP) load balancer in Go with active health checks, multiple balancing algorithms, and graceful backend management.

---

> Load balancers are the backbone of scalable web infrastructure. While you can always reach for Nginx or HAProxy, building your own gives you complete control and deep insight into how traffic distribution actually works.

In this guide, we'll build a Layer 7 load balancer from scratch in Go. By the end, you'll have a working load balancer with round-robin distribution, active health checks, and automatic backend failover.

---

## Why Layer 7?

Layer 7 load balancers operate at the HTTP level, which means they can make routing decisions based on:

- URL paths (`/api` goes to backend A, `/static` goes to backend B)
- HTTP headers (route based on `Host` or custom headers)
- Cookies (sticky sessions)
- Request content

Layer 4 load balancers only see TCP/UDP packets and can't inspect HTTP content. Layer 7 gives you much more flexibility at the cost of slightly higher latency.

---

## Project Structure

```
lb/
├── main.go           # Entry point
├── balancer.go       # Load balancer logic
├── backend.go        # Backend server representation
├── health.go         # Health check implementation
└── algorithms.go     # Load balancing algorithms
```

---

## Defining the Backend

First, let's define what a backend server looks like:

```go
// backend.go
package main

import (
    "net/http"
    "net/http/httputil"
    "net/url"
    "sync"
    "time"
)

// Backend represents a single backend server
type Backend struct {
    URL          *url.URL
    Alive        bool
    Weight       int
    mux          sync.RWMutex
    ReverseProxy *httputil.ReverseProxy

    // Health check stats
    consecutiveFails    int
    consecutiveSuccesses int
    lastChecked         time.Time
}

// NewBackend creates a new backend instance
func NewBackend(rawURL string, weight int) (*Backend, error) {
    u, err := url.Parse(rawURL)
    if err != nil {
        return nil, err
    }

    proxy := httputil.NewSingleHostReverseProxy(u)

    // Customize error handling
    proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
        http.Error(w, "Backend unavailable", http.StatusBadGateway)
    }

    return &Backend{
        URL:          u,
        Alive:        true, // Assume alive until proven otherwise
        Weight:       weight,
        ReverseProxy: proxy,
    }, nil
}

// SetAlive updates the backend's health status
func (b *Backend) SetAlive(alive bool) {
    b.mux.Lock()
    defer b.mux.Unlock()
    b.Alive = alive
}

// IsAlive returns the backend's current health status
func (b *Backend) IsAlive() bool {
    b.mux.RLock()
    defer b.mux.RUnlock()
    return b.Alive
}

// ServeHTTP proxies the request to the backend
func (b *Backend) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    b.ReverseProxy.ServeHTTP(w, r)
}
```

The key thing here is thread safety. Multiple goroutines will be reading and writing the `Alive` status, so we protect it with a mutex. The `ReverseProxy` from Go's standard library does the heavy lifting of forwarding requests.

---

## Building the Load Balancer

Now let's create the load balancer that manages multiple backends:

```go
// balancer.go
package main

import (
    "log"
    "net/http"
    "sync/atomic"
)

// LoadBalancer manages a pool of backend servers
type LoadBalancer struct {
    backends []*Backend
    current  uint64 // For round-robin
    algorithm string
}

// NewLoadBalancer creates a new load balancer
func NewLoadBalancer(algorithm string) *LoadBalancer {
    return &LoadBalancer{
        backends:  make([]*Backend, 0),
        algorithm: algorithm,
    }
}

// AddBackend registers a new backend server
func (lb *LoadBalancer) AddBackend(backend *Backend) {
    lb.backends = append(lb.backends, backend)
}

// GetNextBackend returns the next available backend
func (lb *LoadBalancer) GetNextBackend() *Backend {
    switch lb.algorithm {
    case "round-robin":
        return lb.roundRobin()
    case "least-connections":
        return lb.leastConnections()
    case "weighted":
        return lb.weightedRoundRobin()
    default:
        return lb.roundRobin()
    }
}

// roundRobin cycles through backends sequentially
func (lb *LoadBalancer) roundRobin() *Backend {
    // Get total number of backends
    total := uint64(len(lb.backends))
    if total == 0 {
        return nil
    }

    // Try each backend at most once
    for i := uint64(0); i < total; i++ {
        // Atomically increment and get the next index
        next := atomic.AddUint64(&lb.current, 1)
        idx := (next - 1) % total

        // Check if this backend is alive
        if lb.backends[idx].IsAlive() {
            return lb.backends[idx]
        }
    }

    return nil // All backends are down
}

// GetHealthyBackends returns all backends currently marked as healthy
func (lb *LoadBalancer) GetHealthyBackends() []*Backend {
    healthy := make([]*Backend, 0)
    for _, b := range lb.backends {
        if b.IsAlive() {
            healthy = append(healthy, b)
        }
    }
    return healthy
}

// ServeHTTP implements the http.Handler interface
func (lb *LoadBalancer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    backend := lb.GetNextBackend()

    if backend == nil {
        log.Printf("No healthy backends available for %s", r.URL.Path)
        http.Error(w, "Service unavailable", http.StatusServiceUnavailable)
        return
    }

    log.Printf("Forwarding request to %s", backend.URL.String())
    backend.ServeHTTP(w, r)
}
```

The `atomic.AddUint64` is important here. It ensures that concurrent requests get different backends even when arriving at the exact same time. Without atomic operations, two requests could read the same counter value and hit the same backend.

---

## Implementing Health Checks

Health checks are what separate a toy load balancer from something you can actually use in production. Here's a robust implementation:

```go
// health.go
package main

import (
    "context"
    "log"
    "net/http"
    "time"
)

// HealthChecker performs periodic health checks on backends
type HealthChecker struct {
    lb              *LoadBalancer
    interval        time.Duration
    timeout         time.Duration
    healthPath      string
    unhealthyThresh int // Consecutive failures before marking unhealthy
    healthyThresh   int // Consecutive successes before marking healthy
}

// NewHealthChecker creates a new health checker
func NewHealthChecker(lb *LoadBalancer, opts ...HealthOption) *HealthChecker {
    hc := &HealthChecker{
        lb:              lb,
        interval:        10 * time.Second,
        timeout:         5 * time.Second,
        healthPath:      "/health",
        unhealthyThresh: 3,
        healthyThresh:   2,
    }

    for _, opt := range opts {
        opt(hc)
    }

    return hc
}

// HealthOption configures the health checker
type HealthOption func(*HealthChecker)

// WithInterval sets the check interval
func WithInterval(d time.Duration) HealthOption {
    return func(hc *HealthChecker) {
        hc.interval = d
    }
}

// WithTimeout sets the health check timeout
func WithTimeout(d time.Duration) HealthOption {
    return func(hc *HealthChecker) {
        hc.timeout = d
    }
}

// WithHealthPath sets the health check endpoint path
func WithHealthPath(path string) HealthOption {
    return func(hc *HealthChecker) {
        hc.healthPath = path
    }
}

// Start begins periodic health checking
func (hc *HealthChecker) Start(ctx context.Context) {
    ticker := time.NewTicker(hc.interval)
    defer ticker.Stop()

    // Run immediately on start
    hc.checkAll()

    for {
        select {
        case <-ctx.Done():
            log.Println("Health checker stopped")
            return
        case <-ticker.C:
            hc.checkAll()
        }
    }
}

// checkAll checks all backends
func (hc *HealthChecker) checkAll() {
    for _, backend := range hc.lb.backends {
        go hc.checkBackend(backend)
    }
}

// checkBackend performs a health check on a single backend
func (hc *HealthChecker) checkBackend(backend *Backend) {
    // Build health check URL
    healthURL := backend.URL.Scheme + "://" + backend.URL.Host + hc.healthPath

    // Create request with timeout
    ctx, cancel := context.WithTimeout(context.Background(), hc.timeout)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
    if err != nil {
        hc.recordFailure(backend, err)
        return
    }

    // Add identifying header so backends know this is a health check
    req.Header.Set("User-Agent", "LoadBalancer-HealthCheck/1.0")

    // Perform the check
    client := &http.Client{
        // Don't follow redirects for health checks
        CheckRedirect: func(req *http.Request, via []*http.Request) error {
            return http.ErrUseLastResponse
        },
    }

    resp, err := client.Do(req)
    if err != nil {
        hc.recordFailure(backend, err)
        return
    }
    defer resp.Body.Close()

    // Check for successful status code
    if resp.StatusCode >= 200 && resp.StatusCode < 300 {
        hc.recordSuccess(backend)
    } else {
        hc.recordFailure(backend, nil)
    }
}

// recordSuccess handles a successful health check
func (hc *HealthChecker) recordSuccess(backend *Backend) {
    backend.mux.Lock()
    defer backend.mux.Unlock()

    backend.consecutiveFails = 0
    backend.consecutiveSuccesses++
    backend.lastChecked = time.Now()

    // Mark healthy after threshold
    if !backend.Alive && backend.consecutiveSuccesses >= hc.healthyThresh {
        backend.Alive = true
        log.Printf("Backend %s is now healthy", backend.URL.String())
    }
}

// recordFailure handles a failed health check
func (hc *HealthChecker) recordFailure(backend *Backend, err error) {
    backend.mux.Lock()
    defer backend.mux.Unlock()

    backend.consecutiveSuccesses = 0
    backend.consecutiveFails++
    backend.lastChecked = time.Now()

    // Mark unhealthy after threshold
    if backend.Alive && backend.consecutiveFails >= hc.unhealthyThresh {
        backend.Alive = false
        if err != nil {
            log.Printf("Backend %s is now unhealthy: %v", backend.URL.String(), err)
        } else {
            log.Printf("Backend %s is now unhealthy: bad status code", backend.URL.String())
        }
    }
}
```

Some important details about this health checker:

1. **Threshold-based transitions**: A single failed check doesn't immediately mark a backend as down. This prevents brief network hiccups from causing unnecessary failovers.

2. **Separate goroutines**: Each backend gets checked in its own goroutine, so a slow backend doesn't delay checking others.

3. **Context with timeout**: We don't wait forever for a response. If a backend takes too long, that itself is a health problem.

---

## Load Balancing Algorithms

Let's add a couple more algorithms beyond simple round-robin:

```go
// algorithms.go
package main

import (
    "sync"
    "sync/atomic"
)

// weightedRoundRobin distributes based on backend weights
func (lb *LoadBalancer) weightedRoundRobin() *Backend {
    totalWeight := 0
    for _, b := range lb.backends {
        if b.IsAlive() {
            totalWeight += b.Weight
        }
    }

    if totalWeight == 0 {
        return nil
    }

    // Get current position in the weight cycle
    next := atomic.AddUint64(&lb.current, 1)
    pos := int(next % uint64(totalWeight))

    // Find the backend at this position
    cumulative := 0
    for _, b := range lb.backends {
        if !b.IsAlive() {
            continue
        }
        cumulative += b.Weight
        if pos < cumulative {
            return b
        }
    }

    return nil
}

// ConnectionTracker tracks active connections per backend
type ConnectionTracker struct {
    connections map[*Backend]*int64
    mux         sync.RWMutex
}

// Global connection tracker
var connTracker = &ConnectionTracker{
    connections: make(map[*Backend]*int64),
}

// RegisterBackend sets up connection tracking for a backend
func (ct *ConnectionTracker) RegisterBackend(b *Backend) {
    ct.mux.Lock()
    defer ct.mux.Unlock()
    var count int64 = 0
    ct.connections[b] = &count
}

// Increment adds a connection to the backend's count
func (ct *ConnectionTracker) Increment(b *Backend) {
    ct.mux.RLock()
    defer ct.mux.RUnlock()
    if counter, ok := ct.connections[b]; ok {
        atomic.AddInt64(counter, 1)
    }
}

// Decrement removes a connection from the backend's count
func (ct *ConnectionTracker) Decrement(b *Backend) {
    ct.mux.RLock()
    defer ct.mux.RUnlock()
    if counter, ok := ct.connections[b]; ok {
        atomic.AddInt64(counter, -1)
    }
}

// GetCount returns the current connection count
func (ct *ConnectionTracker) GetCount(b *Backend) int64 {
    ct.mux.RLock()
    defer ct.mux.RUnlock()
    if counter, ok := ct.connections[b]; ok {
        return atomic.LoadInt64(counter)
    }
    return 0
}

// leastConnections routes to the backend with fewest active connections
func (lb *LoadBalancer) leastConnections() *Backend {
    var selected *Backend
    minConns := int64(^uint64(0) >> 1) // Max int64

    for _, b := range lb.backends {
        if !b.IsAlive() {
            continue
        }

        conns := connTracker.GetCount(b)
        if conns < minConns {
            minConns = conns
            selected = b
        }
    }

    return selected
}
```

---

## Putting It All Together

Here's the main entry point that ties everything together:

```go
// main.go
package main

import (
    "context"
    "flag"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    // Configuration flags
    port := flag.String("port", "8080", "Load balancer port")
    algorithm := flag.String("algorithm", "round-robin", "Load balancing algorithm")
    healthInterval := flag.Duration("health-interval", 10*time.Second, "Health check interval")
    flag.Parse()

    // Create load balancer
    lb := NewLoadBalancer(*algorithm)

    // Add backend servers
    backends := []struct {
        url    string
        weight int
    }{
        {"http://localhost:8081", 1},
        {"http://localhost:8082", 1},
        {"http://localhost:8083", 2}, // Higher weight - gets more traffic
    }

    for _, b := range backends {
        backend, err := NewBackend(b.url, b.weight)
        if err != nil {
            log.Fatalf("Failed to create backend %s: %v", b.url, err)
        }
        lb.AddBackend(backend)
        connTracker.RegisterBackend(backend)
        log.Printf("Added backend: %s (weight: %d)", b.url, b.weight)
    }

    // Start health checker
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    healthChecker := NewHealthChecker(lb,
        WithInterval(*healthInterval),
        WithTimeout(5*time.Second),
        WithHealthPath("/health"),
    )

    go healthChecker.Start(ctx)

    // Create HTTP server
    server := &http.Server{
        Addr:         ":" + *port,
        Handler:      lb,
        ReadTimeout:  30 * time.Second,
        WriteTimeout: 30 * time.Second,
    }

    // Graceful shutdown handling
    go func() {
        sigChan := make(chan os.Signal, 1)
        signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
        <-sigChan

        log.Println("Shutting down gracefully...")
        cancel() // Stop health checks

        shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer shutdownCancel()

        if err := server.Shutdown(shutdownCtx); err != nil {
            log.Printf("Shutdown error: %v", err)
        }
    }()

    // Start server
    log.Printf("Load balancer listening on port %s", *port)
    if err := server.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatalf("Server error: %v", err)
    }
}
```

---

## Testing Your Load Balancer

Create a simple test backend:

```go
// testserver/main.go
package main

import (
    "flag"
    "fmt"
    "log"
    "net/http"
)

func main() {
    port := flag.String("port", "8081", "Server port")
    flag.Parse()

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Response from backend on port %s\n", *port)
    })

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    })

    log.Printf("Test server starting on port %s", *port)
    log.Fatal(http.ListenAndServe(":"+*port, nil))
}
```

Start multiple instances and verify traffic distribution:

```bash
# Terminal 1-3: Start backends
go run testserver/main.go -port 8081
go run testserver/main.go -port 8082
go run testserver/main.go -port 8083

# Terminal 4: Start load balancer
go run . -port 8080 -algorithm round-robin

# Terminal 5: Test it
for i in {1..10}; do curl localhost:8080; done
```

---

## Common Pitfalls to Avoid

**1. No connection draining**: When a backend becomes unhealthy, existing requests should complete. Use `server.Shutdown()` instead of abrupt termination.

**2. Health check storms**: If you have 100 backends and check every second, that's 100 requests per second just for health checks. Be reasonable with intervals.

**3. Single point of failure**: Your load balancer itself needs redundancy in production. Consider running multiple instances with DNS round-robin or a Layer 4 load balancer in front.

**4. Ignoring timeouts**: Always set timeouts on your HTTP client and server. A hanging backend shouldn't hang your entire load balancer.

**5. Not logging enough**: When things go wrong at 3 AM, you'll want to know which backend failed and why.

---

## Next Steps

This load balancer handles the fundamentals, but production systems might need:

- **TLS termination**: Handle HTTPS at the load balancer
- **Rate limiting**: Protect backends from traffic spikes
- **Circuit breakers**: Prevent cascading failures
- **Metrics**: Export Prometheus metrics for monitoring
- **Configuration reloading**: Update backends without restart

Building your own load balancer teaches you exactly how these systems work under the hood. Even if you end up using Nginx in production, you'll have a much better understanding of what's happening.

---

*Need to monitor your load balancer and backends? [OneUptime](https://oneuptime.com) provides health monitoring, alerting, and status pages for your infrastructure.*

**Related Reading:**
- [What is Site Reliability Engineering](https://oneuptime.com/blog/post/2025-11-28-what-is-site-reliability-engineering/view)
- [SRE Metrics to Track](https://oneuptime.com/blog/post/2025-11-28-sre-metrics-to-track/view)
