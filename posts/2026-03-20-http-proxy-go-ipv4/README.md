# How to Build a Simple HTTP Proxy in Go for IPv4 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, HTTP, Proxy, IPv4, Networking, Httputil

Description: Learn how to build a simple HTTP reverse proxy in Go that forwards IPv4 traffic using net/http/httputil's ReverseProxy.

## Using httputil.ReverseProxy

Go's standard library includes `net/http/httputil.ReverseProxy` which handles most of the proxy complexity:

```go
package main

import (
    "context"
    "log"
    "net"
    "net/http"
    "net/http/httputil"
    "net/url"
    "time"
)

func main() {
    // Target upstream server
    targetURL, err := url.Parse("http://127.0.0.1:3000")
    if err != nil {
        log.Fatal(err)
    }

    dialer := &net.Dialer{
        Timeout:   30 * time.Second,
        KeepAlive: 30 * time.Second,
    }

    proxy := &httputil.ReverseProxy{
        Rewrite: func(pr *httputil.ProxyRequest) {
            pr.SetURL(targetURL)
            pr.SetXForwarded()
            pr.Out.Header.Set("X-Proxy", "go-proxy/1.0")
        },
        // Configure the transport to force IPv4
        Transport: &http.Transport{
            DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
                return dialer.DialContext(ctx, "tcp4", addr)
            },
            MaxIdleConns:          100,
            IdleConnTimeout:       90 * time.Second,
            TLSHandshakeTimeout:   10 * time.Second,
            ExpectContinueTimeout: 1 * time.Second,
        },
        // Custom error handler
        ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
            log.Printf("Proxy error: %v", err)
            http.Error(w, "Bad Gateway", http.StatusBadGateway)
        },
    }

    // Start proxy server on port 8080
    log.Println("HTTP reverse proxy listening on :8080 -> http://127.0.0.1:3000")
    log.Fatal(http.ListenAndServe(":8080", proxy))
}
```

## Multi-Target Proxy with Simple Load Balancing

```go
package main

import (
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
    "sync/atomic"
)

type RoundRobinProxy struct {
    proxies []*httputil.ReverseProxy
    counter uint64
}

func NewRoundRobinProxy(targets []string) (*RoundRobinProxy, error) {
    proxies := make([]*httputil.ReverseProxy, len(targets))
    for i, t := range targets {
        u, err := url.Parse(t)
        if err != nil {
            return nil, err
        }
        proxies[i] = httputil.NewSingleHostReverseProxy(u)
    }
    return &RoundRobinProxy{proxies: proxies}, nil
}

func (rrp *RoundRobinProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    idx := atomic.AddUint64(&rrp.counter, 1) % uint64(len(rrp.proxies))
    rrp.proxies[idx].ServeHTTP(w, r)
}

func main() {
    proxy, err := NewRoundRobinProxy([]string{
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
    })
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Round-robin proxy on :8080")
    log.Fatal(http.ListenAndServe(":8080", proxy))
}
```

## Logging Proxy Requests

```go
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Wrap ResponseWriter to capture status code
        wrapped := &statusResponseWriter{ResponseWriter: w, code: 200}
        next.ServeHTTP(wrapped, r)

        log.Printf("%s %s %s -> %d (%v)",
            r.RemoteAddr, r.Method, r.URL.Path,
            wrapped.code, time.Since(start))
    })
}

type statusResponseWriter struct {
    http.ResponseWriter
    code int
}

func (s *statusResponseWriter) Unwrap() http.ResponseWriter {
    return s.ResponseWriter
}

func (s *statusResponseWriter) WriteHeader(code int) {
    s.code = code
    s.ResponseWriter.WriteHeader(code)
}
```

## Conclusion

Go's `httputil.ReverseProxy` makes building an HTTP proxy straightforward. Customize `Rewrite` to modify outbound requests before forwarding, `Transport` to control connection pooling and IPv4 forcing, and `ErrorHandler` to return appropriate error responses. For load balancing, maintain a slice of proxies and distribute requests using atomic counters or health-check-based selection.
