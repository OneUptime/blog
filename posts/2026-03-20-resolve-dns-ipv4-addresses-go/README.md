# How to Resolve DNS Names to IPv4 Addresses in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, DNS, IPv4, Net package, Hostname Resolution, Networking

Description: Learn how to resolve DNS hostnames to IPv4 addresses in Go using the net package, including filtering for IPv4-only results and reverse lookups.

## Basic DNS Resolution

```go
package main

import (
    "fmt"
    "log"
    "net"
)

func main() {
    hostname := "example.com"

    // LookupIP returns all IP addresses (IPv4 and IPv6)
    ips, err := net.LookupIP(hostname)
    if err != nil {
        log.Fatalf("DNS lookup failed for %s: %v", hostname, err)
    }

    fmt.Printf("All addresses for %s:\n", hostname)
    for _, ip := range ips {
        fmt.Printf("  %s\n", ip)
    }
}
```

## Filtering IPv4-Only Results

```go
package main

import (
    "fmt"
    "log"
    "net"
)

// ResolveIPv4 returns only IPv4 addresses for the given hostname
func ResolveIPv4(hostname string) ([]net.IP, error) {
    ips, err := net.LookupIP(hostname)
    if err != nil {
        return nil, fmt.Errorf("lookup %s: %w", hostname, err)
    }

    var ipv4s []net.IP
    for _, ip := range ips {
        // To4() returns non-nil only for IPv4 addresses
        if v4 := ip.To4(); v4 != nil {
            ipv4s = append(ipv4s, v4)
        }
    }

    if len(ipv4s) == 0 {
        return nil, fmt.Errorf("no IPv4 addresses found for %s", hostname)
    }

    return ipv4s, nil
}

func main() {
    ips, err := ResolveIPv4("google.com")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("IPv4 addresses for google.com:")
    for _, ip := range ips {
        fmt.Printf("  %s\n", ip)
    }
}
```

## Using net.Resolver with Context and Timeout

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net"
    "time"
)

func main() {
    // Create a custom resolver pointing to a specific DNS server
    resolver := &net.Resolver{
        PreferGo: true,   // Use Go's pure-Go DNS resolver
        Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
            d := net.Dialer{Timeout: 3 * time.Second}
            // Use Google's DNS server instead of the system default
            return d.DialContext(ctx, network, "8.8.8.8:53")
        },
    }

    // Create a context with timeout for the DNS query
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    addrs, err := resolver.LookupIPAddr(ctx, "example.com")
    if err != nil {
        log.Fatalf("Lookup failed: %v", err)
    }

    fmt.Println("Resolved addresses:")
    for _, addr := range addrs {
        if addr.IP.To4() != nil {
            fmt.Printf("  IPv4: %s\n", addr.IP)
        } else {
            fmt.Printf("  IPv6: %s\n", addr.IP)
        }
    }
}
```

## Reverse DNS Lookup (PTR Record)

```go
package main

import (
    "fmt"
    "log"
    "net"
)

func main() {
    ip := "8.8.8.8"

    // LookupAddr performs a reverse DNS lookup
    hostnames, err := net.LookupAddr(ip)
    if err != nil {
        log.Fatalf("Reverse lookup failed for %s: %v", ip, err)
    }

    fmt.Printf("Reverse DNS for %s:\n", ip)
    for _, h := range hostnames {
        fmt.Printf("  %s\n", h)
    }
}
```

## Looking Up Specific Record Types

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net"
)

func main() {
    // Look up only A records (IPv4) via Resolver.LookupIP
    addrs, err := net.DefaultResolver.LookupIP(context.Background(), "ip4", "example.com")
    if err != nil {
        log.Fatal(err)
    }
    for _, ip := range addrs {
        fmt.Println(ip)
    }

    // Look up MX records
    mxs, _ := net.LookupMX("example.com")
    for _, mx := range mxs {
        fmt.Printf("MX: %s (priority %d)\n", mx.Host, mx.Pref)
    }

    // Look up TXT records
    txts, _ := net.LookupTXT("example.com")
    for _, t := range txts {
        fmt.Printf("TXT: %s\n", t)
    }
}
```

## Conclusion

Go's `net` package provides `LookupIP`, `LookupHost`, and `net.Resolver.LookupIPAddr` for DNS resolution. Filter results with `.To4() != nil` to get only IPv4 addresses. Use `net.Resolver` with a custom `Dial` function to target a specific DNS server, and always wrap DNS calls in a context with a timeout for production code.
