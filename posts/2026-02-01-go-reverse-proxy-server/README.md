# How to Build a Reverse Proxy Server in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Reverse Proxy, HTTP, Load Balancing, Networking

Description: A practical guide to building a reverse proxy server in Go using the standard library with load balancing and request modification.

---

A reverse proxy sits between clients and backend servers, forwarding requests and returning responses. It handles load balancing, SSL termination, caching, and request routing. Go's standard library includes `net/http/httputil` which provides everything you need to build a production-ready reverse proxy.

This post walks through building a reverse proxy from scratch, starting with a basic implementation and progressively adding load balancing, health checks, and request modification.

## Why Go for Reverse Proxies?

Go excels at network programming. Goroutines handle thousands of concurrent connections efficiently. The standard library's HTTP server and client are battle-tested. Memory usage stays low. Deployment is a single binary.

Most importantly, `httputil.ReverseProxy` does the heavy lifting while giving you hooks to customize behavior.

## Basic Reverse Proxy

The simplest reverse proxy forwards all traffic to a single backend server.

The following code creates a proxy that forwards requests to a target URL and copies the response back to the client:

```go
package main

import (
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
)

func main() {
    // Parse the target backend URL
    target, err := url.Parse("http://localhost:8080")
    if err != nil {
        log.Fatal(err)
    }

    // Create a reverse proxy instance pointing to the target
    proxy := httputil.NewSingleHostReverseProxy(target)

    // Start the proxy server on port 3000
    log.Println("Starting proxy server on :3000")
    log.Fatal(http.ListenAndServe(":3000", proxy))
}
```

`NewSingleHostReverseProxy` creates a proxy that rewrites request URLs to point to the target host. It handles connection management, request forwarding, and response copying automatically.

## Understanding httputil.ReverseProxy

The `ReverseProxy` struct has several fields you can customize:

```go
type ReverseProxy struct {
    // Director modifies the request before forwarding
    Director func(*http.Request)
    
    // Transport specifies the HTTP transport (connection pooling, timeouts)
    Transport http.RoundTripper
    
    // ModifyResponse modifies the response before returning to client
    ModifyResponse func(*http.Response) error
    
    // ErrorHandler handles errors from the backend
    ErrorHandler func(http.ResponseWriter, *http.Request, error)
}
```

Each field gives you a hook into the proxy pipeline. The `Director` runs before the request goes to the backend. `ModifyResponse` runs after receiving the backend response. `ErrorHandler` catches connection failures and timeouts.

## Request Modification with Director

The `Director` function lets you modify requests before they reach the backend. Common uses include adding headers, rewriting paths, and injecting authentication.

This example adds custom headers and logs request details:

```go
package main

import (
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
    "time"
)

func main() {
    target, _ := url.Parse("http://localhost:8080")
    
    proxy := &httputil.ReverseProxy{
        Director: func(req *http.Request) {
            // Set the target host and scheme
            req.URL.Scheme = target.Scheme
            req.URL.Host = target.Host
            req.Host = target.Host
            
            // Add a custom header to identify proxied requests
            req.Header.Set("X-Proxy-Timestamp", time.Now().UTC().Format(time.RFC3339))
            
            // Add the original client IP for logging
            if clientIP := req.RemoteAddr; clientIP != "" {
                req.Header.Set("X-Forwarded-For", clientIP)
            }
            
            // Log the request
            log.Printf("Proxying: %s %s", req.Method, req.URL.Path)
        },
    }
    
    http.ListenAndServe(":3000", proxy)
}
```

Setting `req.Host` matters. Some backends validate the Host header and reject requests where it does not match their expected domain.

## Response Modification

The `ModifyResponse` function runs after the backend responds but before the proxy sends data to the client. Use it to add security headers, modify content, or log response details.

This code adds security headers and logs response status codes:

```go
proxy := &httputil.ReverseProxy{
    Director: func(req *http.Request) {
        req.URL.Scheme = target.Scheme
        req.URL.Host = target.Host
        req.Host = target.Host
    },
    ModifyResponse: func(resp *http.Response) error {
        // Add security headers to all responses
        resp.Header.Set("X-Content-Type-Options", "nosniff")
        resp.Header.Set("X-Frame-Options", "DENY")
        resp.Header.Set("X-XSS-Protection", "1; mode=block")
        
        // Remove headers that leak backend information
        resp.Header.Del("Server")
        resp.Header.Del("X-Powered-By")
        
        // Log response status
        log.Printf("Backend responded: %d %s", resp.StatusCode, resp.Request.URL.Path)
        
        return nil
    },
}
```

Returning an error from `ModifyResponse` triggers the `ErrorHandler`. This is useful for rejecting responses that fail validation.

## Connection Pooling with Custom Transport

The default HTTP transport works for basic use cases, but production proxies need tuned connection pools. High traffic can exhaust connections if the pool is too small.

Configure a custom transport with appropriate pool sizes and timeouts:

```go
package main

import (
    "net"
    "net/http"
    "net/http/httputil"
    "net/url"
    "time"
)

func main() {
    target, _ := url.Parse("http://localhost:8080")
    
    // Configure a transport with connection pooling
    transport := &http.Transport{
        // Connection pool settings
        MaxIdleConns:        100,              // Total idle connections across all hosts
        MaxIdleConnsPerHost: 20,               // Idle connections per backend host
        MaxConnsPerHost:     100,              // Max concurrent connections per host
        IdleConnTimeout:     90 * time.Second, // How long idle connections stay in pool
        
        // Timeouts for connection establishment
        DialContext: (&net.Dialer{
            Timeout:   30 * time.Second, // TCP connection timeout
            KeepAlive: 30 * time.Second, // TCP keepalive interval
        }).DialContext,
        
        // TLS handshake timeout
        TLSHandshakeTimeout: 10 * time.Second,
        
        // Response header timeout - time to wait for response headers
        ResponseHeaderTimeout: 10 * time.Second,
    }
    
    proxy := &httputil.ReverseProxy{
        Director: func(req *http.Request) {
            req.URL.Scheme = target.Scheme
            req.URL.Host = target.Host
            req.Host = target.Host
        },
        Transport: transport,
    }
    
    http.ListenAndServe(":3000", proxy)
}
```

`MaxConnsPerHost` prevents a single slow backend from consuming all connections. `IdleConnTimeout` closes stale connections that waste resources.

## Load Balancing Across Multiple Backends

A single backend creates a single point of failure. Load balancing distributes traffic across multiple servers for reliability and scalability.

Here is a round-robin load balancer that cycles through available backends:

```go
package main

import (
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
    "sync/atomic"
)

// Backend represents a single upstream server
type Backend struct {
    URL   *url.URL
    Alive bool
}

// LoadBalancer distributes requests across backends
type LoadBalancer struct {
    backends []*Backend
    current  uint64
}

// NextBackend returns the next available backend using round-robin
func (lb *LoadBalancer) NextBackend() *Backend {
    // Atomically increment and get the next index
    next := atomic.AddUint64(&lb.current, 1)
    
    // Cycle through backends to find an alive one
    for i := 0; i < len(lb.backends); i++ {
        idx := (int(next) + i) % len(lb.backends)
        if lb.backends[idx].Alive {
            return lb.backends[idx]
        }
    }
    return nil
}

func main() {
    // Define backend servers
    backendURLs := []string{
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
    }
    
    // Initialize backends
    var backends []*Backend
    for _, u := range backendURLs {
        parsedURL, _ := url.Parse(u)
        backends = append(backends, &Backend{URL: parsedURL, Alive: true})
    }
    
    lb := &LoadBalancer{backends: backends}
    
    // Create proxy with dynamic backend selection
    proxy := &httputil.ReverseProxy{
        Director: func(req *http.Request) {
            backend := lb.NextBackend()
            if backend == nil {
                log.Println("No backends available")
                return
            }
            
            req.URL.Scheme = backend.URL.Scheme
            req.URL.Host = backend.URL.Host
            req.Host = backend.URL.Host
            
            log.Printf("Routing to: %s", backend.URL.Host)
        },
    }
    
    log.Println("Load balancer starting on :3000")
    http.ListenAndServe(":3000", proxy)
}
```

Round-robin works well when backends have similar capacity. For heterogeneous servers, weighted round-robin or least-connections algorithms perform better.

## Health Checks

Routing traffic to dead backends causes errors. Health checks detect failures and remove unhealthy backends from rotation.

Add periodic health checks that ping each backend:

```go
package main

import (
    "log"
    "net/http"
    "net/url"
    "sync"
    "time"
)

type Backend struct {
    URL   *url.URL
    Alive bool
    mu    sync.RWMutex
}

// SetAlive safely updates the backend's health status
func (b *Backend) SetAlive(alive bool) {
    b.mu.Lock()
    b.Alive = alive
    b.mu.Unlock()
}

// IsAlive safely reads the backend's health status
func (b *Backend) IsAlive() bool {
    b.mu.RLock()
    defer b.mu.RUnlock()
    return b.Alive
}

// HealthChecker periodically checks backend health
type HealthChecker struct {
    backends []*Backend
    interval time.Duration
    timeout  time.Duration
    client   *http.Client
}

// NewHealthChecker creates a health checker with the specified settings
func NewHealthChecker(backends []*Backend, interval, timeout time.Duration) *HealthChecker {
    return &HealthChecker{
        backends: backends,
        interval: interval,
        timeout:  timeout,
        client: &http.Client{
            Timeout: timeout,
        },
    }
}

// Start begins periodic health checks in a background goroutine
func (hc *HealthChecker) Start() {
    go func() {
        ticker := time.NewTicker(hc.interval)
        for range ticker.C {
            hc.checkAll()
        }
    }()
}

// checkAll pings every backend and updates their status
func (hc *HealthChecker) checkAll() {
    for _, backend := range hc.backends {
        go hc.check(backend)
    }
}

// check pings a single backend's health endpoint
func (hc *HealthChecker) check(backend *Backend) {
    healthURL := backend.URL.String() + "/health"
    
    resp, err := hc.client.Get(healthURL)
    if err != nil {
        log.Printf("Health check failed for %s: %v", backend.URL.Host, err)
        backend.SetAlive(false)
        return
    }
    defer resp.Body.Close()
    
    // Consider 2xx status codes as healthy
    alive := resp.StatusCode >= 200 && resp.StatusCode < 300
    
    if !alive {
        log.Printf("Backend %s unhealthy: status %d", backend.URL.Host, resp.StatusCode)
    }
    
    backend.SetAlive(alive)
}

func main() {
    backendURLs := []string{
        "http://localhost:8081",
        "http://localhost:8082",
    }
    
    var backends []*Backend
    for _, u := range backendURLs {
        parsedURL, _ := url.Parse(u)
        backends = append(backends, &Backend{URL: parsedURL, Alive: true})
    }
    
    // Start health checks every 10 seconds with 5 second timeout
    healthChecker := NewHealthChecker(backends, 10*time.Second, 5*time.Second)
    healthChecker.Start()
    
    log.Println("Health checker started")
    
    // Keep the program running
    select {}
}
```

The health check timeout should be shorter than the check interval. This prevents overlapping checks when backends are slow. Using goroutines for each check ensures one slow backend does not delay checking others.

## Error Handling

When backends fail, the proxy needs to handle errors gracefully. The `ErrorHandler` function catches these failures:

```go
proxy := &httputil.ReverseProxy{
    Director: func(req *http.Request) {
        // ... director logic
    },
    ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
        log.Printf("Proxy error: %v", err)
        
        // Return a user-friendly error response
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadGateway)
        w.Write([]byte(`{"error": "Service temporarily unavailable"}`))
    },
}
```

For production systems, consider retrying failed requests on a different backend before returning an error. Track error rates per backend to identify failing servers.

## Header Manipulation Best Practices

Proxies commonly add or modify headers for tracing, authentication, and routing:

```go
Director: func(req *http.Request) {
    req.URL.Scheme = target.Scheme
    req.URL.Host = target.Host
    req.Host = target.Host
    
    // Standard proxy headers
    req.Header.Set("X-Forwarded-Host", req.Host)
    req.Header.Set("X-Forwarded-Proto", "https")
    
    // Preserve or set X-Forwarded-For chain
    if prior := req.Header.Get("X-Forwarded-For"); prior != "" {
        req.Header.Set("X-Forwarded-For", prior+", "+req.RemoteAddr)
    } else {
        req.Header.Set("X-Forwarded-For", req.RemoteAddr)
    }
    
    // Generate a request ID for distributed tracing
    if req.Header.Get("X-Request-ID") == "" {
        req.Header.Set("X-Request-ID", generateRequestID())
    }
}
```

Some headers require special handling. The `Hop-by-hop` headers like `Connection`, `Keep-Alive`, and `Transfer-Encoding` should not be forwarded - `httputil.ReverseProxy` handles these automatically.

## Putting It All Together

Here is a complete reverse proxy with load balancing, health checks, and request modification:

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
    URL   *url.URL
    Alive bool
    mu    sync.RWMutex
}

func (b *Backend) SetAlive(alive bool) {
    b.mu.Lock()
    b.Alive = alive
    b.mu.Unlock()
}

func (b *Backend) IsAlive() bool {
    b.mu.RLock()
    defer b.mu.RUnlock()
    return b.Alive
}

type LoadBalancer struct {
    backends []*Backend
    current  uint64
}

func (lb *LoadBalancer) NextBackend() *Backend {
    next := atomic.AddUint64(&lb.current, 1)
    for i := 0; i < len(lb.backends); i++ {
        idx := (int(next) + i) % len(lb.backends)
        if lb.backends[idx].IsAlive() {
            return lb.backends[idx]
        }
    }
    return nil
}

func healthCheck(backends []*Backend, interval time.Duration) {
    client := &http.Client{Timeout: 5 * time.Second}
    
    for {
        for _, b := range backends {
            resp, err := client.Get(b.URL.String() + "/health")
            if err != nil {
                b.SetAlive(false)
                continue
            }
            resp.Body.Close()
            b.SetAlive(resp.StatusCode == 200)
        }
        time.Sleep(interval)
    }
}

func main() {
    backendURLs := []string{
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
    }
    
    var backends []*Backend
    for _, u := range backendURLs {
        parsedURL, _ := url.Parse(u)
        backends = append(backends, &Backend{URL: parsedURL, Alive: true})
    }
    
    lb := &LoadBalancer{backends: backends}
    
    // Start health checks
    go healthCheck(backends, 10*time.Second)
    
    // Configure connection pooling
    transport := &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 20,
        IdleConnTimeout:     90 * time.Second,
        DialContext: (&net.Dialer{
            Timeout:   10 * time.Second,
            KeepAlive: 30 * time.Second,
        }).DialContext,
    }
    
    proxy := &httputil.ReverseProxy{
        Director: func(req *http.Request) {
            backend := lb.NextBackend()
            if backend == nil {
                return
            }
            
            req.URL.Scheme = backend.URL.Scheme
            req.URL.Host = backend.URL.Host
            req.Host = backend.URL.Host
            
            req.Header.Set("X-Forwarded-For", req.RemoteAddr)
            req.Header.Set("X-Forwarded-Host", req.Host)
        },
        Transport: transport,
        ModifyResponse: func(resp *http.Response) error {
            resp.Header.Set("X-Proxy", "go-reverse-proxy")
            return nil
        },
        ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
            log.Printf("Error: %v", err)
            w.WriteHeader(http.StatusBadGateway)
        },
    }
    
    log.Println("Reverse proxy running on :3000")
    log.Fatal(http.ListenAndServe(":3000", proxy))
}
```

## Next Steps

This implementation covers the fundamentals. For production use, consider adding:

- **Metrics collection** - Track request counts, latencies, and error rates per backend
- **Circuit breakers** - Stop sending traffic to failing backends temporarily
- **Rate limiting** - Protect backends from traffic spikes
- **Request timeouts** - Prevent slow requests from consuming resources
- **Graceful shutdown** - Drain connections before stopping the proxy
- **TLS termination** - Handle HTTPS at the proxy layer

Go's standard library provides the building blocks. The `httputil.ReverseProxy` type handles the complex parts of HTTP proxying while giving you hooks to customize every step of the request lifecycle.

---

*Monitor your proxy servers with [OneUptime](https://oneuptime.com) - track response times, error rates, and upstream health.*
