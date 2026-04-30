# How to Use Go net Package for IPv6 Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Net package, Networking, Programming

Description: Use Go's net package for IPv6 address parsing, network operations, and socket creation with practical examples.

## Go's net Package and IPv6

Go's `net` package provides comprehensive IPv6 support. The key types are:
- `net.IP`: Represents an IP address (works for both v4 and v6)
- `net.IPNet`: Represents a network prefix
- `net.TCPConn`, `net.UDPConn`: IPv6-capable connection types

## Parsing IPv6 Addresses

```go
package main

import (
    "fmt"
    "net"
)

func main() {
    // Parse IPv6 address
    ip := net.ParseIP("2001:db8::1")
    if ip == nil {
        fmt.Println("Invalid IPv6 address")
        return
    }

    // Check IPv4 vs IPv6
    if ip.To4() == nil {
        fmt.Println("This is an IPv6 address:", ip)
    }

    // Get the 16-byte representation
    ip16 := ip.To16()
    fmt.Printf("16-byte form: %x\n", ip16)

    // Parse link-local
    llAddr := net.ParseIP("fe80::1")
    fmt.Println("Link-local:", llAddr.IsLinkLocalUnicast())

    // Parse loopback
    loopback := net.ParseIP("::1")
    fmt.Println("Is loopback:", loopback.IsLoopback())
}
```

## Working with IPv6 Networks (CIDR)

```go
package main

import (
    "fmt"
    "net"
)

func main() {
    // Parse a CIDR network
    ip, network, err := net.ParseCIDR("2001:db8::/32")
    if err != nil {
        panic(err)
    }

    fmt.Println("Address:", ip)
    fmt.Println("Network:", network)
    fmt.Println("Mask:", network.Mask)

    // Check if an address is in the network
    testIP := net.ParseIP("2001:db8:1::100")
    fmt.Println("In network:", network.Contains(testIP))

    // Iterate over a small subnet
    _, small, _ := net.ParseCIDR("2001:db8:1::/126")
    for addr := cloneIP(small.IP); small.Contains(addr); incrementIP(addr) {
        fmt.Println(addr)
    }
}

func cloneIP(ip net.IP) net.IP {
    clone := make(net.IP, len(ip))
    copy(clone, ip)
    return clone
}

func incrementIP(ip net.IP) {
    for i := len(ip) - 1; i >= 0; i-- {
        ip[i]++
        if ip[i] != 0 {
            break
        }
    }
}
```

## DNS Lookups for IPv6

```go
package main

import (
    "context"
    "fmt"
    "net"
)

func lookupIPv6(hostname string) ([]net.IP, error) {
    ips, err := net.LookupIP(hostname)
    if err != nil {
        return nil, err
    }

    var ipv6Addrs []net.IP
    for _, ip := range ips {
        if ip.To4() == nil && ip.To16() != nil {
            // This is an IPv6 address (not IPv4 or IPv4-mapped)
            ipv6Addrs = append(ipv6Addrs, ip)
        }
    }
    return ipv6Addrs, nil
}

func lookupIPv6AAAA(hostname string) ([]string, error) {
    // Use a custom resolver and request IPv6 results only
    resolver := &net.Resolver{
        PreferGo: true,  // Prefer Go's built-in DNS resolver when available
    }

    ips, err := resolver.LookupIP(context.Background(), "ip6", hostname)
    if err != nil {
        return nil, err
    }

    var result []string
    for _, ip := range ips {
        result = append(result, ip.String())
    }
    return result, nil
}

func main() {
    addrs, err := lookupIPv6AAAA("ipv6.google.com")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    for _, addr := range addrs {
        fmt.Println("IPv6:", addr)
    }
}
```

## Creating a Simple IPv6 TCP Connection

```go
package main

import (
    "fmt"
    "net"
    "time"
)

func connectIPv6(host, port string) error {
    // Combine host and port for IPv6 (uses [host]:port format)
    addr := net.JoinHostPort(host, port)
    fmt.Println("Connecting to:", addr)

    conn, err := net.DialTimeout("tcp6", addr, 5*time.Second)
    if err != nil {
        return fmt.Errorf("connection failed: %w", err)
    }
    defer conn.Close()

    fmt.Printf("Connected to %s from %s\n",
        conn.RemoteAddr(),
        conn.LocalAddr())
    return nil
}

func main() {
    // Connect to Google's IPv6 DNS
    err := connectIPv6("2001:4860:4860::8888", "53")
    if err != nil {
        fmt.Println("Error:", err)
    }
}
```

## Interface Enumeration

```go
package main

import (
    "fmt"
    "net"
)

func listIPv6Interfaces() {
    interfaces, err := net.Interfaces()
    if err != nil {
        panic(err)
    }

    for _, iface := range interfaces {
        addrs, err := iface.Addrs()
        if err != nil {
            continue
        }

        for _, addr := range addrs {
            switch v := addr.(type) {
            case *net.IPNet:
                if v.IP.To4() == nil && v.IP.To16() != nil {
                    fmt.Printf("%s: %s\n", iface.Name, v)
                }
            case *net.IPAddr:
                if v.IP.To4() == nil && v.IP.To16() != nil {
                    fmt.Printf("%s: %s\n", iface.Name, v)
                }
            }
        }
    }
}

func main() {
    listIPv6Interfaces()
}
```

## Conclusion

Go's `net` package provides clean, idiomatic APIs for IPv6 operations. Use `net.ParseIP()` for parsing, `net.ParseCIDR()` for network prefix handling, and `net.JoinHostPort()` for creating proper `[host]:port` strings for IPv6 addresses. The `net.DialTimeout("tcp6", ...)` call forces IPv6-only connections.
