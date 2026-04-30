# How to Use Go net.Dialer with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Net.Dialer, TCP, Networking, Client

Description: Use Go's net.Dialer to make IPv6 TCP connections with timeout control, local address binding, and connection customization.

## Basic net.Dialer for IPv6

```go
package main

import (
    "context"
    "fmt"
    "net"
    "time"
)

func main() {
    // Create a Dialer with IPv6-specific settings
    dialer := &net.Dialer{
        Timeout:   10 * time.Second,
        KeepAlive: 30 * time.Second,
    }

    // Dial using "tcp6" to force IPv6
    ctx := context.Background()
    conn, err := dialer.DialContext(ctx, "tcp6", "[2001:4860:4860::8888]:53")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer conn.Close()

    fmt.Printf("Connected: %s → %s\n",
        conn.LocalAddr(), conn.RemoteAddr())
}
```

## Dialing with a Specific Local IPv6 Address

Bind to a specific local IPv6 address for outgoing connections (useful for multi-homed servers):

```go
package main

import (
    "context"
    "fmt"
    "net"
    "time"
)

func dialFromIPv6(localAddr, remoteAddr string) (net.Conn, error) {
    // Parse the local IPv6 address to bind to
    local, err := net.ResolveTCPAddr("tcp6", net.JoinHostPort(localAddr, "0"))
    if err != nil {
        return nil, fmt.Errorf("invalid local address: %w", err)
    }

    dialer := &net.Dialer{
        LocalAddr: local,
        Timeout:   10 * time.Second,
    }

    ctx := context.Background()
    return dialer.DialContext(ctx, "tcp6", remoteAddr)
}

func main() {
    conn, err := dialFromIPv6(
        "2001:db8::10",         // Outgoing from this local address
        "[2001:db8::1]:8080",   // Connect to this remote
    )
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer conn.Close()
    fmt.Printf("Local: %s → Remote: %s\n",
        conn.LocalAddr(), conn.RemoteAddr())
}
```

## Dialer with Custom DNS Resolver

Send DNS queries over IPv6 and dial only AAAA results:

```go
package main

import (
    "context"
    "fmt"
    "net"
    "time"
)

func createIPv6OnlyDialer() *net.Dialer {
    return &net.Dialer{
        Timeout:   30 * time.Second,
        KeepAlive: 30 * time.Second,
        Resolver: &net.Resolver{
            PreferGo: true,
            Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
                // Force DNS queries to a specific DNS server over IPv6.
                d := net.Dialer{Timeout: 5 * time.Second}

                switch network {
                case "udp", "udp4", "udp6":
                    return d.DialContext(ctx, "udp6", "[2001:4860:4860::8888]:53")
                case "tcp", "tcp4", "tcp6":
                    return d.DialContext(ctx, "tcp6", "[2001:4860:4860::8888]:53")
                default:
                    return nil, fmt.Errorf("unexpected DNS network %q", network)
                }
            },
        },
    }
}

func dialWithIPv6DNS(host, port string) (net.Conn, error) {
    dialer := createIPv6OnlyDialer()
    ctx, cancel := context.WithTimeout(context.Background(), dialer.Timeout)
    defer cancel()

    // Resolve only IPv6 addresses for the host.
    addrs, err := dialer.Resolver.LookupIP(ctx, "ip6", host)
    if err != nil {
        return nil, fmt.Errorf("DNS lookup failed: %w", err)
    }

    // Try each resolved IPv6 address.
    var lastErr error
    for _, addr := range addrs {
        target := net.JoinHostPort(addr.String(), port)
        conn, err := dialer.DialContext(ctx, "tcp6", target)
        if err == nil {
            return conn, nil
        }
        lastErr = err
    }

    if lastErr != nil {
        return nil, fmt.Errorf("failed to connect to %s over IPv6: %w", host, lastErr)
    }

    return nil, fmt.Errorf("no IPv6 addresses available for %s", host)
}
```

## Dialer Control Function

Use the `Control` function for low-level socket configuration:

```go
package main

import (
    "context"
    "net"
    "syscall"
)

func dialWithSocketOptions(addr string) (net.Conn, error) {
    dialer := &net.Dialer{
        Control: func(network, address string, c syscall.RawConn) error {
            var sockErr error

            err := c.Control(func(fd uintptr) {
                // Set socket options at the raw socket level.
                sockErr = syscall.SetsockoptInt(
                    int(fd),
                    syscall.SOL_SOCKET,
                    syscall.SO_RCVBUF,
                    256*1024,
                )
            })
            if err != nil {
                return err
            }

            return sockErr
        },
    }

    return dialer.DialContext(context.Background(), "tcp6", addr)
}
```

## Dialer in HTTP Client for IPv6

Use a custom dialer in an HTTP client to force IPv6:

```go
package main

import (
    "context"
    "fmt"
    "net"
    "net/http"
    "time"
)

func newIPv6HTTPClient() *http.Client {
    dialer := &net.Dialer{
        Timeout:   30 * time.Second,
        KeepAlive: 30 * time.Second,
    }

    transport := &http.Transport{
        DialContext: func(ctx context.Context, _, addr string) (net.Conn, error) {
            // Force TCP6 regardless of what http.Transport requests
            return dialer.DialContext(ctx, "tcp6", addr)
        },
        ForceAttemptHTTP2:     true,
        MaxIdleConns:          100,
        IdleConnTimeout:       90 * time.Second,
        TLSHandshakeTimeout:   10 * time.Second,
        ExpectContinueTimeout: 1 * time.Second,
    }

    return &http.Client{
        Transport: transport,
        Timeout:   30 * time.Second,
    }
}

func main() {
    client := newIPv6HTTPClient()
    resp, err := client.Get("https://ipv6.google.com")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer resp.Body.Close()
    fmt.Println("Status:", resp.Status)
}
```

## Conclusion

Go's `net.Dialer` provides fine-grained control over IPv6 connections. Use `"tcp6"` as the network parameter to force IPv6, the `LocalAddr` field to bind to a specific source address, and the `Control` function for raw socket option configuration. For HTTP clients, override the `DialContext` function in `http.Transport` to route all connections through a custom IPv6-aware dialer.
