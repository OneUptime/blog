# How to Handle Dual-Stack Connections in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Dual-Stack, TCP, Happy Eyeballs, Networking

Description: Handle dual-stack (IPv4 and IPv6) connections in Go servers and clients, including Happy Eyeballs implementation and address preference configuration.

## Dual-Stack Server

A dual-stack server can accept connections over both IPv4 and IPv6. Using separate listeners is the most predictable approach across platforms:

```go
package main

import (
    "fmt"
    "net"
    "net/netip"
)

type acceptResult struct {
    conn net.Conn
    err  error
}

type DualStackServer struct {
    v4Listener net.Listener
    v6Listener net.Listener
    acceptCh   chan acceptResult
}

func NewDualStackServer(port int) (*DualStackServer, error) {
    v4Addr := fmt.Sprintf("0.0.0.0:%d", port)
    v6Addr := fmt.Sprintf("[::]:%d", port)

    v4ln, err := net.Listen("tcp4", v4Addr)
    if err != nil {
        return nil, fmt.Errorf("IPv4 listen failed: %w", err)
    }

    v6ln, err := net.Listen("tcp6", v6Addr)
    if err != nil {
        v4ln.Close()
        return nil, fmt.Errorf("IPv6 listen failed: %w", err)
    }

    server := &DualStackServer{
        v4Listener: v4ln,
        v6Listener: v6ln,
        acceptCh:   make(chan acceptResult, 2),
    }

    go server.acceptLoop(v4ln)
    go server.acceptLoop(v6ln)

    return server, nil
}

func (s *DualStackServer) acceptLoop(ln net.Listener) {
    for {
        conn, err := ln.Accept()
        s.acceptCh <- acceptResult{conn: conn, err: err}
        if err != nil {
            return
        }
    }
}

func (s *DualStackServer) Accept() (net.Conn, error) {
    result := <-s.acceptCh
    return result.conn, result.err
}

func getIPVersion(conn net.Conn) string {
    remoteAddr, ok := conn.RemoteAddr().(*net.TCPAddr)
    if !ok {
        return "unknown"
    }

    ip, ok := netip.AddrFromSlice(remoteAddr.IP)
    if !ok {
        return "unknown"
    }

    if ip.Unmap().Is4() {
        return "IPv4"
    }
    return "IPv6"
}
```

## Simplified Happy Eyeballs Client (RFC 8305-style)

Happy Eyeballs staggers connection attempts so IPv6 gets the first try, but IPv4 can start shortly after if needed:

```go
package main

import (
    "context"
    "fmt"
    "net"
    "time"
)

// DialHappyEyeballs connects to a host using a simplified, staggered
// Happy Eyeballs strategy. It is not a complete RFC 8305 implementation.
func DialHappyEyeballs(ctx context.Context, host, port string) (net.Conn, error) {
    // Resolve all addresses
    addrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
    if err != nil {
        return nil, fmt.Errorf("lookup failed: %w", err)
    }

    // Separate into IPv6 and IPv4
    var v6, v4 []net.IPAddr
    for _, addr := range addrs {
        if addr.IP.To4() == nil {
            v6 = append(v6, addr)
        } else {
            v4 = append(v4, addr)
        }
    }

    ordered := make([]net.IPAddr, 0, len(addrs))
    for i := 0; i < len(v6) || i < len(v4); i++ {
        if i < len(v6) {
            ordered = append(ordered, v6[i])
        }
        if i < len(v4) {
            ordered = append(ordered, v4[i])
        }
    }
    if len(ordered) == 0 {
        return nil, fmt.Errorf("lookup returned no addresses for %q", host)
    }

    ctx, cancel := context.WithCancel(ctx)
    defer cancel()

    type result struct {
        conn net.Conn
        err  error
    }

    resultCh := make(chan result, len(ordered))

    dialer := &net.Dialer{Timeout: 10 * time.Second}

    startDial := func(ip net.IPAddr) {
        go func(ip net.IPAddr) {
            network := "tcp4"
            if ip.IP.To4() == nil {
                network = "tcp6"
            }

            target := net.JoinHostPort(ip.IP.String(), port)
            conn, err := dialer.DialContext(ctx, network, target)
            if err != nil {
                resultCh <- result{err: err}
                return
            }

            select {
            case resultCh <- result{conn: conn}:
            case <-ctx.Done():
                conn.Close()
            }
        }(ip)
    }

    // Start with IPv6 when available, then stagger additional attempts.
    go func() {
        for i, addr := range ordered {
            if i > 0 {
                timer := time.NewTimer(250 * time.Millisecond)
                select {
                case <-timer.C:
                case <-ctx.Done():
                    timer.Stop()
                    return
                }
            }
            startDial(addr)
        }
    }()

    // Return the first successful connection
    var lastErr error
    for i := 0; i < len(ordered); i++ {
        select {
        case r := <-resultCh:
            if r.err == nil {
                cancel()
                return r.conn, nil
            }
            lastErr = r.err
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }

    return nil, fmt.Errorf("all connections failed: %w", lastErr)
}
```

## Using net.Dialer for Dual-Stack HTTP Clients

```go
package main

import (
    "fmt"
    "net"
    "net/http"
    "time"
)

// createDualStackTransport creates an HTTP transport that uses Go's
// built-in dual-stack fast fallback support.
func createDualStackTransport() *http.Transport {
    dialer := &net.Dialer{
        Timeout:       30 * time.Second,
        KeepAlive:     30 * time.Second,
        FallbackDelay: 250 * time.Millisecond,
    }

    return &http.Transport{
        DialContext:         dialer.DialContext,
        ForceAttemptHTTP2:   true,
        MaxIdleConns:        100,
        IdleConnTimeout:     90 * time.Second,
        TLSHandshakeTimeout: 10 * time.Second,
    }
}

func main() {
    client := &http.Client{
        Transport: createDualStackTransport(),
        Timeout:   30 * time.Second,
    }

    resp, err := client.Get("https://example.com")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer resp.Body.Close()
    fmt.Println("Status:", resp.Status)
}
```

## Detecting Connection IP Version at Runtime

```go
import (
    "net"
    "net/netip"
)

func getConnectionIPVersion(conn net.Conn) int {
    tcpAddr, ok := conn.RemoteAddr().(*net.TCPAddr)
    if !ok {
        return 0
    }

    ip, ok := netip.AddrFromSlice(tcpAddr.IP)
    if !ok {
        return 0
    }

    if ip.Unmap().Is4() {
        return 4
    }
    return 6
}
```

## Conclusion

Dual-stack support in Go can use a single `[::]` listener on platforms that support IPv4-mapped IPv6 sockets, but separate `tcp4` and `tcp6` listeners are more predictable across systems. For clients, Go's `net.Dialer` already includes fast fallback support, and if you implement your own Happy Eyeballs-style dialer, a 250ms connection-attempt delay is a common default. Go's standard `net.Dialer` and `http.Transport` work with both address families, making dual-stack client code straightforward.
