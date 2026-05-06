# How to Build IPv6 Proxy Servers in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Proxy, TCP, HTTP Proxy, Networking

Description: Build IPv6 TCP and HTTP proxy servers in Go that forward connections between IPv4 and IPv6 networks.

## Simple IPv6 TCP Proxy

```go
package main

import (
    "context"
    "fmt"
    "io"
    "net"
    "sync"
)

type TCPProxy struct {
    ListenAddr  string
    BackendAddr string
    Network     string  // "tcp4" or "tcp6" for the frontend listener
}

func (p *TCPProxy) Start(ctx context.Context) error {
    ln, err := net.Listen(p.Network, p.ListenAddr)
    if err != nil {
        return fmt.Errorf("listen: %w", err)
    }
    defer ln.Close()

    fmt.Printf("Proxy: %s → %s\n", p.ListenAddr, p.BackendAddr)

    go func() {
        <-ctx.Done()
        ln.Close()
    }()

    for {
        conn, err := ln.Accept()
        if err != nil {
            if ctx.Err() != nil {
                return nil
            }
            continue
        }
        go p.handle(conn)
    }
}

func (p *TCPProxy) handle(clientConn net.Conn) {
    defer clientConn.Close()

    // Connect to backend
    backendConn, err := net.Dial("tcp", p.BackendAddr)
    if err != nil {
        fmt.Printf("Backend connection failed: %v\n", err)
        return
    }
    defer backendConn.Close()

    // Bidirectional copy
    var wg sync.WaitGroup
    wg.Add(2)

    go func() {
        defer wg.Done()
        io.Copy(backendConn, clientConn)
        backendConn.(*net.TCPConn).CloseWrite()
    }()

    go func() {
        defer wg.Done()
        io.Copy(clientConn, backendConn)
        clientConn.(*net.TCPConn).CloseWrite()
    }()

    wg.Wait()
}

// IPv4 to IPv6 proxy: accept IPv4, forward to IPv6 backend
func main() {
    ctx := context.Background()

    // Accept IPv4 connections, forward to IPv6 backend
    proxy := &TCPProxy{
        ListenAddr:  "0.0.0.0:8080",  // IPv4 frontend
        BackendAddr: net.JoinHostPort("2001:db8::1", "8080"),  // IPv6 backend
        Network:     "tcp4",
    }

    if err := proxy.Start(ctx); err != nil {
        panic(err)
    }
}
```

## IPv6 HTTP/HTTPS Reverse Proxy

```go
package main

import (
    "fmt"
    "net"
    "net/http"
    "net/http/httputil"
    "net/url"
    "time"
)

func newIPv6ReverseProxy(backendURL string) (*httputil.ReverseProxy, error) {
    target, err := url.Parse(backendURL)
    if err != nil {
        return nil, err
    }

    proxy := &httputil.ReverseProxy{
        Rewrite: func(r *httputil.ProxyRequest) {
            r.SetURL(target)
            r.SetXForwarded()
        },
    }

    // Custom transport with explicit dial timeouts for IPv4 or IPv6 backends
    proxy.Transport = &http.Transport{
        DialContext: (&net.Dialer{
            Timeout:   30 * time.Second,
            KeepAlive: 30 * time.Second,
        }).DialContext,
        MaxIdleConns:        100,
        IdleConnTimeout:     90 * time.Second,
        TLSHandshakeTimeout: 10 * time.Second,
    }

    return proxy, nil
}

func main() {
    // Proxy IPv6 frontend requests to IPv4 backend
    proxy, err := newIPv6ReverseProxy("http://192.168.1.100:8080")
    if err != nil {
        panic(err)
    }

    server := &http.Server{
        Addr:    "[::]:80",  // IPv6 frontend
        Handler: proxy,
    }

    fmt.Println("IPv6 reverse proxy on [::]:80 → IPv4 backend")
    server.ListenAndServe()
}
```

## Protocol Agnostic Proxy (CONNECT proxy)

```go
package main

import (
    "fmt"
    "io"
    "net"
    "net/http"
    "sync"
)

// IPv6CONNECTProxy handles HTTP CONNECT method for HTTPS tunneling
type IPv6CONNECTProxy struct{}

func (p *IPv6CONNECTProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodConnect {
        http.Error(w, "Only CONNECT supported", http.StatusMethodNotAllowed)
        return
    }

    // CONNECT uses the authority form: host:port
    host, port, err := net.SplitHostPort(r.RequestURI)
    if err != nil || host == "" || port == "" {
        http.Error(w, "CONNECT target must be host:port", http.StatusBadRequest)
        return
    }

    // Connect to the target (may be IPv4 or IPv6)
    targetConn, err := net.Dial("tcp", net.JoinHostPort(host, port))
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadGateway)
        return
    }
    defer targetConn.Close()

    // Hijack the client connection
    hijacker, ok := w.(http.Hijacker)
    if !ok {
        http.Error(w, "Hijacking not supported", http.StatusInternalServerError)
        return
    }

    clientConn, clientBuf, err := hijacker.Hijack()
    if err != nil {
        return
    }
    defer clientConn.Close()

    // Send 200 Connection Established
    fmt.Fprintf(clientBuf, "HTTP/1.1 200 Connection Established\r\n\r\n")
    clientBuf.Flush()

    // Bidirectional proxy
    var wg sync.WaitGroup
    wg.Add(2)
    go func() {
        defer wg.Done()
        io.Copy(targetConn, clientBuf)
        if tcpConn, ok := targetConn.(*net.TCPConn); ok {
            tcpConn.CloseWrite()
        }
    }()
    go func() {
        defer wg.Done()
        io.Copy(clientConn, targetConn)
        if tcpConn, ok := clientConn.(*net.TCPConn); ok {
            tcpConn.CloseWrite()
        }
    }()
    wg.Wait()
}

func main() {
    proxy := &IPv6CONNECTProxy{}
    server := &http.Server{
        Addr:    "[::]:3128",  // Listen on IPv6
        Handler: proxy,
    }

    fmt.Println("CONNECT proxy on [::]:3128")
    server.ListenAndServe()
}
```

## Conclusion

IPv6 proxy servers in Go combine standard TCP/HTTP handling with IPv6-specific listener addresses. The key patterns are: using `[::]:port` for the frontend listener, proper `net.JoinHostPort` for IPv6 backend addresses, and `io.Copy` for bidirectional traffic forwarding. Proxy servers that translate between IPv4 and IPv6 are useful for gradual migration scenarios.
