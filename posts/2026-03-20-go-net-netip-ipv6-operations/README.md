# How to Use Go net/netip for IPv6 Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Net/netip, IPv6, Standard Library, Netip.Addr, Prefix

Description: Use Go's net/netip package (introduced in Go 1.18) for efficient, allocation-free IPv6 address parsing, prefix operations, and network calculations.

## Introduction

Go 1.18 introduced `net/netip` - a new package with value-type IP addresses (`netip.Addr`) that are significantly more efficient than the older `net.IP` slice type. `netip.Addr` is comparable, immutable, takes less memory than `net.IP`, and supports IPv6 natively including IPv4-mapped IPv6 addresses.

## Basic IPv6 Operations

```go
package main

import (
    "fmt"
    "net/netip"
)

func main() {
    // Parse IPv6 address
    addr, err := netip.ParseAddr("2001:db8::1")
    if err != nil {
        panic(err)
    }

    fmt.Println(addr.String())    // 2001:db8::1
    fmt.Println(addr.Is6())       // true
    fmt.Println(addr.Is4())       // false
    fmt.Println(addr.Is4In6())    // false (not ::ffff:...)
    fmt.Println(addr.IsLoopback()) // false
    fmt.Println(addr.IsLinkLocalUnicast()) // false
    fmt.Println(addr.IsGlobalUnicast())    // true
    fmt.Println(addr.IsPrivate())          // false (2001:db8 is documentation)

    // IPv4-mapped IPv6
    mapped, _ := netip.ParseAddr("::ffff:192.0.2.1")
    fmt.Println(mapped.Is4In6()) // true
    fmt.Println(mapped.Unmap())  // 192.0.2.1
}
```

## Prefix Operations

```go
package main

import (
    "fmt"
    "net/netip"
)

func main() {
    // Parse a network prefix
    prefix, _ := netip.ParsePrefix("2001:db8::/32")

    fmt.Println(prefix.Addr())       // 2001:db8::
    fmt.Println(prefix.Bits())       // 32
    fmt.Println(prefix.IsSingleIP()) // false

    // Check if address is in prefix
    addr, _ := netip.ParseAddr("2001:db8::1")
    fmt.Println(prefix.Contains(addr))  // true

    // Get the masked prefix (network address)
    masked := prefix.Masked()
    fmt.Println(masked) // 2001:db8::/32

    // Extract /64 prefix from address
    addr2, _ := netip.ParseAddr("2001:db8:1:2:3:4:5:6")
    p64, _ := addr2.Prefix(64)
    fmt.Println(p64) // 2001:db8:1:2::/64
}
```

## IPv6 Address Range Iteration

```go
package main

import (
    "fmt"
    "net/netip"
)

// Iterate over addresses in a /64 prefix (demonstration - not for full /64!)
func iterateSubnet(prefix netip.Prefix, maxCount int) []netip.Addr {
    addrs := make([]netip.Addr, 0, maxCount)
    addr := prefix.Addr()
    for i := 0; i < maxCount; i++ {
        if !prefix.Contains(addr) {
            break
        }
        addrs = append(addrs, addr)
        addr = addr.Next()
    }
    return addrs
}

func main() {
    prefix, _ := netip.ParsePrefix("2001:db8:1::/64")
    first10 := iterateSubnet(prefix, 10)
    for _, a := range first10 {
        fmt.Println(a)
    }
}
```

## Rate Limiting by /64 Subnet

```go
package main

import (
    "net/netip"
    "sync"
    "time"
)

type RateLimiter struct {
    mu       sync.Mutex
    counters map[netip.Prefix][]time.Time
    window   time.Duration
    limit    int
}

func NewRateLimiter(window time.Duration, limit int) *RateLimiter {
    return &RateLimiter{
        counters: make(map[netip.Prefix][]time.Time),
        window:   window,
        limit:    limit,
    }
}

func (rl *RateLimiter) Allow(ip string) bool {
    addr, err := netip.ParseAddr(ip)
    if err != nil {
        return false
    }

    // Rate limit IPv6 by /64 subnet
    var key netip.Prefix
    if addr.Is6() && !addr.Is4In6() {
        key, _ = addr.Prefix(64)
    } else {
        key, _ = addr.Unmap().Prefix(32) // IPv4: /32
    }

    rl.mu.Lock()
    defer rl.mu.Unlock()

    now := time.Now()
    cutoff := now.Add(-rl.window)

    // Prune old entries
    recent := rl.counters[key][:0]
    for _, t := range rl.counters[key] {
        if t.After(cutoff) {
            recent = append(recent, t)
        }
    }
    recent = append(recent, now)
    rl.counters[key] = recent

    return len(recent) <= rl.limit
}
```

## Comparing Old net.IP vs New net/netip

```go
package main

import (
    "net"
    "net/netip"
)

// Old approach (slice-backed, not comparable)
func oldWay(ipStr string) bool {
    ip := net.ParseIP(ipStr)
    if ip == nil {
        return false
    }
    // Can't use as map key directly
    return ip.IsGlobalUnicast()
}

// New approach (value type, comparable, map key)
func newWay(ipStr string) bool {
    addr, err := netip.ParseAddr(ipStr)
    if err != nil {
        return false
    }
    // Can use as map key: map[netip.Addr]int{}
    return addr.IsGlobalUnicast()
}
```

## Conclusion

`net/netip.Addr` is the preferred Go type for IPv6 addresses in new code: it's a small value type, comparable (usable as map keys), and correctly handles IPv4-mapped IPv6 addresses. Use `addr.Prefix(64)` for /64 subnet extraction in rate limiting and ACLs. Migrate from `net.IP` to `netip.Addr` for performance-sensitive networking code. Use these primitives in OneUptime exporters and data plane code.
