# How to Parse IPv6 Addresses in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Parsing, Net, Net/netip, Programming

Description: Parse IPv6 addresses in Go from strings, URLs, log files, and various formats using net and net/netip packages.

## Basic Parsing with net/netip

```go
package main

import (
    "fmt"
    "net/netip"
)

func parseIPv6(s string) (netip.Addr, error) {
    addr, err := netip.ParseAddr(s)
    if err != nil {
        return netip.Addr{}, fmt.Errorf("invalid IPv6 address %q: %w", s, err)
    }
    if !addr.Is6() && !addr.Is4In6() {
        return netip.Addr{}, fmt.Errorf("%q is not an IPv6 address", s)
    }
    return addr, nil
}

func main() {
    addresses := []string{
        "2001:db8::1",
        "::1",
        "fe80::1%eth0",   // Link-local with zone
        "::ffff:192.0.2.1",  // IPv4-mapped
        "2001:0db8:0000:0000:0000:0000:0000:0001",  // Expanded
        "invalid",
    }

    for _, s := range addresses {
        addr, err := netip.ParseAddr(s)
        if err != nil {
            fmt.Printf("%-45s  ERROR: %v\n", s, err)
            continue
        }
        fmt.Printf("%-45s  → %s (Is6=%v)\n", s, addr, addr.Is6())
    }
}
```

## Parsing IPv6 from URLs

```go
package main

import (
    "fmt"
    "net/url"
    "net/netip"
)

func parseIPv6FromURL(rawURL string) (netip.Addr, int, error) {
    u, err := url.Parse(rawURL)
    if err != nil {
        return netip.Addr{}, 0, err
    }

    // u.Hostname() strips brackets from IPv6
    host := u.Hostname()

    // Parse port
    portStr := u.Port()
    port := 0
    if portStr != "" {
        fmt.Sscanf(portStr, "%d", &port)
    }

    addr, err := netip.ParseAddr(host)
    if err != nil {
        return netip.Addr{}, 0, fmt.Errorf("not an IPv6 address: %w", err)
    }

    return addr, port, nil
}

func main() {
    urls := []string{
        "https://[2001:db8::1]:8443/api",
        "http://[::1]/admin",
        "tcp://[fe80::1%25eth0]:9090",  // %25 is URL-encoded %
    }

    for _, u := range urls {
        addr, port, err := parseIPv6FromURL(u)
        if err != nil {
            fmt.Printf("%-40s  ERROR: %v\n", u, err)
            continue
        }
        fmt.Printf("%-40s  addr=%s port=%d\n", u, addr, port)
    }
}
```

## Parsing IPv6 with CIDR Notation

```go
package main

import (
    "fmt"
    "net/netip"
)

func parseIPv6CIDR(cidr string) (netip.Addr, netip.Prefix, error) {
    prefix, err := netip.ParsePrefix(cidr)
    if err != nil {
        return netip.Addr{}, netip.Prefix{}, err
    }

    // The "host" address (may have non-zero host bits)
    hostAddr := prefix.Addr()

    // The network address (host bits zeroed)
    networkPrefix := prefix.Masked()

    return hostAddr, networkPrefix, nil
}

func main() {
    cidrs := []string{
        "2001:db8::100/64",      // Host in network
        "2001:db8::/32",         // Network address
        "::/0",                  // Default route
        "::1/128",               // Host route
    }

    for _, cidr := range cidrs {
        host, network, err := parseIPv6CIDR(cidr)
        if err != nil {
            fmt.Printf("%-25s  ERROR: %v\n", cidr, err)
            continue
        }
        fmt.Printf("%-25s  host=%s network=%s\n", cidr, host, network)
    }
}
```

## Extracting IPv6 Addresses from Log Lines

```go
package main

import (
    "bufio"
    "fmt"
    "net/netip"
    "os"
    "regexp"
    "strings"
)

// Regex to find potential IPv6 address patterns
var ipv6Pattern = regexp.MustCompile(
    `[0-9a-fA-F:]{2,39}`,
)

func extractIPv6FromLine(line string) []netip.Addr {
    var found []netip.Addr
    matches := ipv6Pattern.FindAllString(line, -1)
    for _, match := range matches {
        // Strip brackets if present
        match = strings.Trim(match, "[]")
        addr, err := netip.ParseAddr(match)
        if err == nil && addr.Is6() {
            found = append(found, addr)
        }
    }
    return found
}

func parseIPv6FromLogs(filename string) map[string]int {
    frequency := make(map[string]int)

    file, err := os.Open(filename)
    if err != nil {
        fmt.Println("Error:", err)
        return frequency
    }
    defer file.Close()

    scanner := bufio.NewScanner(file)
    for scanner.Scan() {
        addrs := extractIPv6FromLine(scanner.Text())
        for _, addr := range addrs {
            frequency[addr.String()]++
        }
    }
    return frequency
}
```

## Handling Compressed vs Expanded Forms

```go
package main

import (
    "fmt"
    "net/netip"
)

func normalizeIPv6(s string) (string, error) {
    addr, err := netip.ParseAddr(s)
    if err != nil {
        return "", err
    }
    // String() always returns the compressed canonical form
    return addr.String(), nil
}

func main() {
    variants := []string{
        "2001:0db8:0000:0000:0000:0000:0000:0001",  // Full expanded
        "2001:db8:0:0:0:0:0:1",                      // Partially compressed
        "2001:DB8::1",                                // Uppercase
        "2001:db8::1",                                // Canonical
    }

    for _, v := range variants {
        normalized, _ := normalizeIPv6(v)
        fmt.Printf("%-50s → %s\n", v, normalized)
        // All should print: 2001:db8::1
    }
}
```

## Conclusion

Go provides two ways to parse IPv6 addresses: the older `net.ParseIP()` returning a `net.IP` slice, and the newer `net/netip.ParseAddr()` returning a value type. Prefer `net/netip` for new code - it handles zone IDs, is comparable with `==`, and is more memory efficient. For URL parsing, `url.Parse()` handles bracket removal automatically via `u.Hostname()`.
