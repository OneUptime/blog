# How to Handle IPv6 in Go HTTP Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, HTTP, Server, Net/http, Networking

Description: Handle IPv6 in Go HTTP servers including binding, client address extraction, and middleware for IPv6-aware request processing.

## Basic IPv6 HTTP Server

```go
package main

import (
    "fmt"
    "net"
    "net/http"
)

func main() {
    mux := http.NewServeMux()

    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello from Go HTTP over IPv6!\n")
        fmt.Fprintf(w, "Your address: %s\n", r.RemoteAddr)
    })

    // Listen on all IPv6 interfaces using an IPv6-only listener.
    ln, err := net.Listen("tcp6", "[::]:8080")
    if err != nil {
        panic(err)
    }

    server := &http.Server{Handler: mux}

    fmt.Println("HTTP server on [::]:8080")
    if err := server.Serve(ln); err != nil {
        panic(err)
    }
}
```

## Extracting Client IPv6 Address

```go
package main

import (
    "fmt"
    "net"
    "net/http"
    "net/netip"
    "strings"
)

// GetClientIP extracts a client IP from an HTTP request.
// Prefers X-Forwarded-For and X-Real-IP, and handles IPv4-mapped IPv6.
func GetClientIP(r *http.Request) (netip.Addr, error) {
    // Check proxy headers first
    for _, header := range []string{"X-Forwarded-For", "X-Real-IP"} {
        if value := r.Header.Get(header); value != "" {
            ip := strings.TrimSpace(strings.Split(value, ",")[0])
            addr, err := netip.ParseAddr(ip)
            if err == nil {
                // Unmap IPv4-mapped IPv6 addresses
                return addr.Unmap(), nil
            }
        }
    }

    // Fall back to RemoteAddr
    host, _, err := net.SplitHostPort(r.RemoteAddr)
    if err != nil {
        // May not have a port (e.g., Unix socket)
        host = r.RemoteAddr
    }

    addr, err := netip.ParseAddr(host)
    if err != nil {
        return netip.Addr{}, fmt.Errorf("invalid remote addr: %w", err)
    }
    return addr.Unmap(), nil
}

func ipInfoHandler(w http.ResponseWriter, r *http.Request) {
    ip, err := GetClientIP(r)
    if err != nil {
        http.Error(w, "Cannot determine client IP", 500)
        return
    }

    version := 4
    if ip.Is6() {
        version = 6
    }

    fmt.Fprintf(w, "Client IP: %s\nIP version: IPv%d\n", ip, version)
}
```

## Dual-Stack HTTP Server

```go
package main

import (
    "fmt"
    "net"
    "net/http"
    "sync"
)

type DualStackHTTPServer struct {
    handler http.Handler
}

func (s *DualStackHTTPServer) ListenAndServe(port int) error {
    addr := fmt.Sprintf(":%d", port)

    v4Listener, err := net.Listen("tcp4", addr)
    if err != nil {
        return fmt.Errorf("IPv4 listen: %w", err)
    }

    v6Listener, err := net.Listen("tcp6", fmt.Sprintf("[::]:%d", port))
    if err != nil {
        v4Listener.Close()
        return fmt.Errorf("IPv6 listen: %w", err)
    }

    srv := &http.Server{Handler: s.handler}

    var wg sync.WaitGroup
    errs := make(chan error, 2)

    for _, ln := range []net.Listener{v4Listener, v6Listener} {
        wg.Add(1)
        go func(l net.Listener) {
            defer wg.Done()
            errs <- srv.Serve(l)
        }(ln)
    }

    return <-errs
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, `{"status":"ok","from":"%s"}`, r.RemoteAddr)
    })

    server := &DualStackHTTPServer{handler: mux}
    fmt.Println("Dual-stack HTTP server on port 8080")
    if err := server.ListenAndServe(8080); err != nil {
        panic(err)
    }
}
```

## IPv6-Aware Rate Limiting Middleware

```go
package main

import (
    "net/http"
    "sync"
    "time"
)

// IPv6RateLimiter uses /64 prefix for rate limiting IPv6 clients
// (since one client may have many addresses from privacy extensions)
type IPv6RateLimiter struct {
    mu       sync.Mutex
    requests map[string][]time.Time
    limit    int
    window   time.Duration
}

func NewIPv6RateLimiter(limit int, window time.Duration) *IPv6RateLimiter {
    return &IPv6RateLimiter{
        requests: make(map[string][]time.Time),
        limit:    limit,
        window:   window,
    }
}

func (rl *IPv6RateLimiter) getKey(r *http.Request) string {
    ip, err := GetClientIP(r)
    if err != nil {
        return "unknown"
    }
    // For IPv6, use /64 prefix as key
    if ip.Is6() {
        prefix, _ := ip.Prefix(64)
        return prefix.String()
    }
    return ip.String()
}

func (rl *IPv6RateLimiter) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        key := rl.getKey(r)
        now := time.Now()

        rl.mu.Lock()
        // Remove old requests outside window
        var recent []time.Time
        for _, t := range rl.requests[key] {
            if now.Sub(t) < rl.window {
                recent = append(recent, t)
            }
        }

        if len(recent) >= rl.limit {
            rl.mu.Unlock()
            http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
            return
        }

        rl.requests[key] = append(recent, now)
        rl.mu.Unlock()

        next.ServeHTTP(w, r)
    })
}
```

## Conclusion

Go HTTP servers handle IPv6 naturally when served on an IPv6 listener. The key considerations are extracting client IPv6 addresses correctly (handling proxy headers and IPv4-mapped addresses), and using /64 prefix-based rate limiting to handle IPv6 privacy extensions. If you use `ListenAndServe` with `[::]:port`, whether the underlying `tcp` listener also accepts IPv4 is platform-dependent, so bind separately to IPv4 and IPv6 listeners when you need explicit control over each protocol.
