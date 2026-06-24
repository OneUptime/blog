# How to Build a DNS Resolver in Go for IPv4 Lookups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, DNS, IPv4, Networking, Resolver, Net package

Description: Learn how to build a DNS resolver in Go that performs IPv4 A record lookups, with caching, custom DNS servers, and timeout handling.

## Simple DNS Resolver

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net"
    "time"
)

// ResolveARecord looks up IPv4 addresses for a hostname
func ResolveARecord(hostname string) ([]string, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    ips, err := net.DefaultResolver.LookupIP(ctx, "ip4", hostname)
    if err != nil {
        return nil, fmt.Errorf("lookup %s: %w", hostname, err)
    }

    var ipv4s []string
    for _, ip := range ips {
        ipv4s = append(ipv4s, ip.String())
    }

    if len(ipv4s) == 0 {
        return nil, fmt.Errorf("no A records for %s", hostname)
    }
    return ipv4s, nil
}

func main() {
    hosts := []string{"google.com", "cloudflare.com", "github.com"}
    for _, h := range hosts {
        ips, err := ResolveARecord(h)
        if err != nil {
            log.Printf("Error resolving %s: %v", h, err)
            continue
        }
        fmt.Printf("%s -> %v\n", h, ips)
    }
}
```

## Caching DNS Resolver

```go
package main

import (
    "context"
    "fmt"
    "net"
    "sync"
    "time"
)

type cacheEntry struct {
    ips       []string
    expiresAt time.Time
}

type CachingResolver struct {
    resolver *net.Resolver
    cache    map[string]cacheEntry
    mu       sync.RWMutex
    ttl      time.Duration
}

func NewCachingResolver(dnsServer string, ttl time.Duration) *CachingResolver {
    r := &net.Resolver{
        PreferGo: true,
        Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
            d := net.Dialer{Timeout: 3 * time.Second}
            return d.DialContext(ctx, network, dnsServer)
        },
    }
    return &CachingResolver{
        resolver: r,
        cache:    make(map[string]cacheEntry),
        ttl:      ttl,
    }
}

func (cr *CachingResolver) Resolve(hostname string) ([]string, error) {
    // Check cache first
    cr.mu.RLock()
    if entry, ok := cr.cache[hostname]; ok && time.Now().Before(entry.expiresAt) {
        cr.mu.RUnlock()
        return entry.ips, nil
    }
    cr.mu.RUnlock()

    // Perform DNS lookup
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    addrs, err := cr.resolver.LookupIP(ctx, "ip4", hostname)
    if err != nil {
        return nil, err
    }

    var ips []string
    for _, ip := range addrs {
        ips = append(ips, ip.String())
    }

    if len(ips) == 0 {
        return nil, fmt.Errorf("no A records for %s", hostname)
    }

    // Store in cache
    cr.mu.Lock()
    cr.cache[hostname] = cacheEntry{
        ips:       ips,
        expiresAt: time.Now().Add(cr.ttl),
    }
    cr.mu.Unlock()

    return ips, nil
}

func main() {
    // Use Cloudflare's DNS with a 60-second cache TTL
    resolver := NewCachingResolver("1.1.1.1:53", 60*time.Second)

    for i := 0; i < 3; i++ {
        ips, err := resolver.Resolve("example.com")
        if err != nil {
            fmt.Printf("Error: %v\n", err)
            continue
        }
        fmt.Printf("example.com -> %v (lookup #%d)\n", ips, i+1)
    }
}
```

## Bulk Resolution

```go
package main

import (
    "context"
    "fmt"
    "net"
    "sync"
    "time"
)

func ResolveBulk(hostnames []string) map[string][]string {
    results := make(map[string][]string, len(hostnames))
    var mu sync.Mutex
    var wg sync.WaitGroup

    for _, h := range hostnames {
        wg.Add(1)
        go func(hostname string) {
            defer wg.Done()

            ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
            defer cancel()

            addrs, err := net.DefaultResolver.LookupIP(ctx, "ip4", hostname)
            if err != nil {
                mu.Lock()
                results[hostname] = nil
                mu.Unlock()
                return
            }

            var ips []string
            for _, ip := range addrs {
                ips = append(ips, ip.String())
            }
            mu.Lock()
            results[hostname] = ips
            mu.Unlock()
        }(h)
    }

    wg.Wait()
    return results
}

func main() {
    hosts := []string{"google.com", "github.com", "cloudflare.com", "amazon.com"}
    results := ResolveBulk(hosts)
    for host, ips := range results {
        fmt.Printf("%-20s -> %v\n", host, ips)
    }
}
```

## Conclusion

Building a DNS resolver in Go uses `net.DefaultResolver.LookupIP` with `ip4` for basic IPv4 lookups and `net.Resolver` with a custom `Dial` function for custom DNS servers. Always wrap lookups in a context with a timeout. Add a simple in-memory cache with a fixed TTL to avoid redundant lookups in high-frequency applications.
