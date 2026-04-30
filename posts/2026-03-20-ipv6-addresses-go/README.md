# How to Handle IPv6 Addresses in Go Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Networking, Net package, Socket Programming, Development

Description: Handle, parse, validate, and use IPv6 addresses in Go applications using the net package for both server-side listeners and client connections.

## Introduction

Go's `net` package provides excellent IPv6 support with a unified API that handles both IPv4 and IPv6 addresses. The `net.IP` type, `net.ParseIP()`, and `net.IPNet` make IPv6 address manipulation straightforward, and Go's HTTP and TCP listeners support IPv6 natively.

## Parsing and Validating IPv6 Addresses

```go
package main

import (
    "fmt"
    "net"
)

func isIPv6(s string) bool {
    // net.ParseIP returns nil for invalid addresses
    ip := net.ParseIP(s)
    if ip == nil {
        return false
    }
    // To4() returns nil for pure IPv6 addresses
    return ip.To4() == nil
}

func main() {
    addresses := []string{
        "2001:db8::1",
        "::1",
        "fe80::1%eth0",  // Zone ID - needs handling
        "192.168.1.1",   // IPv4
        "not-an-address",
    }

    for _, addr := range addresses {
        // Strip zone ID before parsing
        cleanAddr := addr
        if zoneIdx := len(addr); zoneIdx > 0 {
            for i, c := range addr {
                if c == '%' {
                    cleanAddr = addr[:i]
                    break
                }
            }
        }

        ip := net.ParseIP(cleanAddr)
        fmt.Printf("%-30s valid=%v isIPv6=%v\n",
            addr, ip != nil, isIPv6(cleanAddr))
    }
}
```

## Working with IPv6 Networks

```go
package main

import (
    "fmt"
    "net"
)

func main() {
    // Parse CIDR network
    _, network, err := net.ParseCIDR("2001:db8::/32")
    if err != nil {
        panic(err)
    }

    // Check if an address belongs to the network
    testAddrs := []string{
        "2001:db8::1",
        "2001:db8:cafe::1",
        "2001:db9::1",  // Different prefix - not in network
    }

    for _, addrStr := range testAddrs {
        addr := net.ParseIP(addrStr)
        fmt.Printf("%s in %s: %v\n", addrStr, network, network.Contains(addr))
    }

    // Get network address and prefix length
    fmt.Println("Network:", network.IP)
    ones, bits := network.Mask.Size()
    fmt.Printf("Prefix: /%d of %d bits\n", ones, bits)
}
```

## Creating an IPv6 TCP Server

```go
package main

import (
    "fmt"
    "net"
    "os"
)

func main() {
    // Listen on all IPv6 interfaces (:: is the IPv6 wildcard)
    // tcp6 explicitly uses IPv6; with "tcp", [::]:8080 may also accept
    // IPv4 on platforms that support IPv4-mapped IPv6 addresses
    listener, err := net.Listen("tcp6", "[::]:8080")
    if err != nil {
        fmt.Fprintf(os.Stderr, "Failed to listen: %v\n", err)
        os.Exit(1)
    }
    defer listener.Close()

    fmt.Println("IPv6 TCP server listening on [::]:8080")

    for {
        conn, err := listener.Accept()
        if err != nil {
            fmt.Fprintf(os.Stderr, "Accept error: %v\n", err)
            continue
        }

        go handleConn(conn)
    }
}

func handleConn(conn net.Conn) {
    defer conn.Close()

    // Get remote address - includes brackets for IPv6
    remoteAddr := conn.RemoteAddr().String()
    host, port, err := net.SplitHostPort(remoteAddr)
    if err != nil {
        return
    }

    fmt.Printf("Connection from host=%s port=%s\n", host, port)
    conn.Write([]byte("Hello from IPv6 server\n"))
}
```

## Connecting to an IPv6 Address

```go
package main

import (
    "fmt"
    "net"
    "time"
)

func dialIPv6(host, port string) (net.Conn, error) {
    // Use net.JoinHostPort for proper IPv6 bracket formatting
    address := net.JoinHostPort(host, port)

    // Dial with a timeout
    conn, err := net.DialTimeout("tcp6", address, 10*time.Second)
    if err != nil {
        return nil, fmt.Errorf("dial %s: %w", address, err)
    }
    return conn, nil
}

func main() {
    conn, err := dialIPv6("2001:db8::1", "80")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    defer conn.Close()

    fmt.Printf("Connected to %s\n", conn.RemoteAddr())
}
```

## Formatting IPv6 Addresses for URLs

```go
package main

import (
    "fmt"
    "net"
    "net/url"
)

func ipv6URL(addr, port, path string) string {
    // net.JoinHostPort wraps IPv6 addresses in brackets automatically
    host := net.JoinHostPort(addr, port)
    u := &url.URL{
        Scheme: "https",
        Host:   host,
        Path:   path,
    }
    return u.String()
}

func main() {
    // Single address
    fmt.Println(net.JoinHostPort("2001:db8::1", "8080"))
    // Output: [2001:db8::1]:8080

    // Full URL
    fmt.Println(ipv6URL("2001:db8::1", "443", "/api/v1/status"))
    // Output: https://[2001:db8::1]:443/api/v1/status
}
```

## HTTP Server on IPv6 with Go

```go
package main

import (
    "fmt"
    "net"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        // Extract client IP (supports IPv6)
        host, _, _ := net.SplitHostPort(r.RemoteAddr)
        ip := net.ParseIP(host)

        if ip.To4() == nil {
            fmt.Fprintf(w, "Hello from IPv6 client: %s\n", host)
        } else {
            fmt.Fprintf(w, "Hello from IPv4 client: %s\n", host)
        }
    })

    // Listen on the IPv6 unspecified address; some platforms also accept
    // IPv4 here when IPv4-mapped IPv6 is supported
    fmt.Println("Starting server on [::]:8080")
    if err := http.ListenAndServe("[::]:8080", nil); err != nil {
        panic(err)
    }
}
```

## Conclusion

Go's `net` package handles IPv6 seamlessly. Use `net.ParseIP()` for validation, `net.JoinHostPort()` for safe address formatting, and `"tcp6"` or `"tcp"` network strings for listeners and dialers. The `net.SplitHostPort()` function correctly handles bracketed IPv6 addresses in host:port strings.
