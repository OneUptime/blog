# How to Use the Go net Package for IPv6 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Networking, Net package, TCP, UDP, Programming

Description: Learn how to use Go's standard library net package to build IPv6-compatible TCP servers, UDP listeners, dial connections, and handle dual-stack IPv4/IPv6 networking.

---

Go's `net` package provides built-in support for IPv6. Most code written for IPv4 works with IPv6 with minimal changes. This guide covers TCP servers, UDP sockets, dial functions, and dual-stack considerations in Go.

---

## Basic IPv6 TCP Server

```go
package main

import (
    "fmt"
    "net"
    "log"
)

func main() {
    // Listen on all local TCP addresses
    listener, err := net.Listen("tcp", ":8080")
    if err != nil {
        log.Fatal(err)
    }
    defer listener.Close()

    fmt.Println("Listening on :8080")

    for {
        conn, err := listener.Accept()
        if err != nil {
            log.Println("Accept error:", err)
            continue
        }
        go handleConnection(conn)
    }
}

func handleConnection(conn net.Conn) {
    defer conn.Close()
    
    // Get remote address (works for both IPv4 and IPv6)
    remoteAddr := conn.RemoteAddr().String()
    fmt.Printf("Connection from: %s\n", remoteAddr)
    
    conn.Write([]byte("Hello from Go IPv6 server!\n"))
}
```

---

## IPv6-Only Server

```go
// Listen only on IPv6
listener, err := net.Listen("tcp6", ":8080")

// Listen on a specific IPv6 address
listener, err := net.Listen("tcp6", "[2001:db8::1]:8080")

// Listen on link-local address (requires zone ID)
listener, err := net.Listen("tcp6", "[fe80::1%eth0]:8080")
```

---

## Connecting to an IPv6 Host

```go
package main

import (
    "fmt"
    "net"
    "time"
)

func connectIPv6() {
    // Dial an IPv6 address
    conn, err := net.DialTimeout("tcp6", "[2001:db8::1]:80", 10*time.Second)
    if err != nil {
        fmt.Println("Connection failed:", err)
        return
    }
    defer conn.Close()
    
    fmt.Println("Connected to IPv6 host:", conn.RemoteAddr())
}

func dialWithResolver() {
    // net.Dial resolves DNS names to available IPs and tries each address until one succeeds
    conn, err := net.Dial("tcp", "ipv6.google.com:80")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer conn.Close()
    
    // Check if IPv6 was used
    if addr, ok := conn.RemoteAddr().(*net.TCPAddr); ok {
        fmt.Printf("Connected via: %s (IPv6: %v)\n", addr.IP, addr.IP.To4() == nil)
    }
}
```

---

## UDP with IPv6

```go
package main

import (
    "fmt"
    "net"
)

func udpServer() {
    // UDP server on all local IP addresses
    conn, err := net.ListenPacket("udp", ":9090")
    if err != nil {
        panic(err)
    }
    defer conn.Close()

    buf := make([]byte, 1500)
    for {
        n, addr, err := conn.ReadFrom(buf)
        if err != nil {
            continue
        }
        fmt.Printf("UDP from %s: %s\n", addr, buf[:n])
        conn.WriteTo([]byte("pong"), addr)
    }
}

func udpClient() {
    conn, err := net.Dial("udp6", "[2001:db8::1]:9090")
    if err != nil {
        panic(err)
    }
    defer conn.Close()

    conn.Write([]byte("ping"))
    buf := make([]byte, 100)
    n, _ := conn.Read(buf)
    fmt.Println("Response:", string(buf[:n]))
}
```

---

## Parsing and Validating IPv6 Addresses

```go
package main

import (
    "fmt"
    "net"
)

func parseIPv6Examples() {
    addresses := []string{
        "2001:db8::1",
        "::1",
        "fe80::1",
        "::ffff:192.168.1.1",  // IPv4-mapped IPv6; To4 treats this as IPv4
        "192.168.1.1",          // IPv4 - not IPv6
        "invalid",
    }

    for _, addr := range addresses {
        ip := net.ParseIP(addr)
        if ip == nil {
            fmt.Printf("%-25s → INVALID\n", addr)
            continue
        }

        isIPv6 := ip.To4() == nil
        isLoopback := ip.IsLoopback()
        isLinkLocal := ip.IsLinkLocalUnicast()
        isGlobal := ip.IsGlobalUnicast()

        fmt.Printf("%-25s → IPv6: %v, Loopback: %v, LinkLocal: %v, Global: %v\n",
            addr, isIPv6, isLoopback, isLinkLocal, isGlobal)
    }
}
```

---

## Working with IP Networks

```go
func networkExamples() {
    // Parse a CIDR
    _, network, err := net.ParseCIDR("2001:db8::/32")
    if err != nil {
        panic(err)
    }

    // Check if an IP is in the network
    testIP := net.ParseIP("2001:db8::1")
    fmt.Printf("2001:db8::1 in 2001:db8::/32: %v\n", network.Contains(testIP))

    // Get network address and mask
    fmt.Println("Network:", network.IP)
    fmt.Println("Mask:", network.Mask)
}
```

---

## HTTP Server with IP Family Detection

```go
import (
    "net"
    "net/http"
)

func dualStackServer() {
    // ListenAndServe uses the same TCP listener behavior as net.Listen("tcp", addr)
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        remoteIP, _, _ := net.SplitHostPort(r.RemoteAddr)
        ip := net.ParseIP(remoteIP)
        
        if ip.To4() != nil {
            w.Write([]byte("Connected via IPv4\n"))
        } else {
            w.Write([]byte("Connected via IPv6\n"))
        }
    })
    
    http.ListenAndServe(":8080", nil)
}
```

---

## Resolving IPv6 Addresses

```go
func resolveIPv6(hostname string) {
    // Resolve all addresses (IPv4 and IPv6)
    addrs, err := net.LookupHost(hostname)
    if err != nil {
        fmt.Println("Lookup failed:", err)
        return
    }

    for _, addr := range addrs {
        ip := net.ParseIP(addr)
        if ip.To4() == nil {
            fmt.Printf("IPv6: %s\n", addr)
        } else {
            fmt.Printf("IPv4: %s\n", addr)
        }
    }
}
```

---

## Best Practices

1. **Use `":port"` or `[::]:port` with `"tcp"`/`"udp"`** - these listen on all local addresses; use `"tcp4"`/`"tcp6"` or `"udp4"`/`"udp6"` to force a family
2. **Use `net.SplitHostPort()`** to handle both IPv4 and IPv6 address:port strings
3. **Check `ip.To4() == nil`** to distinguish non-mapped IPv6 from IPv4 and IPv4-mapped IPv6
4. **Use zone IDs** (`%eth0`) when working with link-local addresses
5. **Test with `::1`** (IPv6 loopback) in addition to `127.0.0.1` in unit tests

---

## Conclusion

Go's `net` package makes IPv6 development straightforward. An empty host such as `":8080"` listens on all local addresses, while `"tcp4"`/`"tcp6"` and `"udp4"`/`"udp6"` let you force an address family. Use `net.ParseIP()`, `net.ParseCIDR()`, and address type checks to build robust IPv6-aware applications.

---

*Monitor your Go services with [OneUptime](https://oneuptime.com) - application monitoring with IPv6 support.*
