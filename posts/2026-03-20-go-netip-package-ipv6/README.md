# How to Use the Go netip Package for IPv6 Address Handling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Netip, IPv6, Networking, IP Addresses, Programming, Net/netip

Description: Learn how to use Go's modern netip package for efficient, immutable IPv6 address parsing, comparison, prefix matching, and address manipulation.

---

Go 1.18 introduced the `net/netip` package - a modern alternative to `net.IP` for working with IP addresses. `netip.Addr` is a small, immutable value type that takes less memory than `net.IP` and supports both IPv4 and IPv6 including scoped (zone ID) addresses.

---

## Why Use netip Instead of net.IP?

| Feature | net.IP | netip.Addr |
|---------|--------|-----------|
| Representation | `[]byte` slice | Small value type |
| Comparability | No (slice) | Yes (comparable) |
| Map key | No | Yes |
| Immutability | No | Yes |
| Zone ID support | No | Yes |
| API | Older, verbose | Modern, clean |

---

## Parsing IPv6 Addresses

```go
package main

import (
    "fmt"
    "net/netip"
)

func main() {
    // Parse an IPv6 address
    addr, err := netip.ParseAddr("2001:db8::1")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }

    fmt.Println("Address:", addr)
    fmt.Println("Is IPv6:", addr.Is6())
    fmt.Println("Is IPv4:", addr.Is4())
    fmt.Println("Is loopback:", addr.IsLoopback())
    fmt.Println("Is link-local:", addr.IsLinkLocalUnicast())
    fmt.Println("Is global unicast:", addr.IsGlobalUnicast())
    fmt.Println("Is multicast:", addr.IsMulticast())
    fmt.Println("Bit length:", addr.BitLen())
}
```

---

## Working with Address Types

```go
func classifyAddress(addrStr string) {
    addr, err := netip.ParseAddr(addrStr)
    if err != nil {
        fmt.Printf("%-25s → INVALID\n", addrStr)
        return
    }

    var addrType string
    switch {
    case addr.IsLoopback():
        addrType = "Loopback"
    case addr.IsLinkLocalUnicast():
        addrType = "Link-Local Unicast"
    case addr.IsLinkLocalMulticast():
        addrType = "Link-Local Multicast"
    case addr.IsGlobalUnicast():
        addrType = "Global Unicast"
    case addr.IsMulticast():
        addrType = "Multicast"
    case addr.IsUnspecified():
        addrType = "Unspecified (::)"
    default:
        addrType = "Other"
    }

    fmt.Printf("%-25s → %s\n", addrStr, addrType)
}

func main() {
    addresses := []string{
        "::1",
        "fe80::1",
        "2001:db8::1",
        "ff02::1",
        "::",
        "fe80::1%eth0",  // With zone ID
    }
    for _, a := range addresses {
        classifyAddress(a)
    }
}
```

---

## Address Comparison and Use as Map Keys

```go
func addressComparison() {
    addr1, _ := netip.ParseAddr("2001:db8::1")
    addr2, _ := netip.ParseAddr("2001:db8::1")
    addr3, _ := netip.ParseAddr("2001:db8::2")

    // Direct comparison (works because netip.Addr is comparable)
    fmt.Println("addr1 == addr2:", addr1 == addr2)  // true
    fmt.Println("addr1 == addr3:", addr1 == addr3)  // false
    fmt.Println("addr1 < addr3:", addr1.Less(addr3))  // true

    // Use as map key (not possible with net.IP)
    ipCount := map[netip.Addr]int{}
    ipCount[addr1]++
    ipCount[addr2]++  // Same key as addr1
    ipCount[addr3]++

    fmt.Println("Count for 2001:db8::1:", ipCount[addr1])  // 2
    fmt.Println("Count for 2001:db8::2:", ipCount[addr3])  // 1
}
```

---

## Working with Prefixes (CIDR)

```go
func prefixExamples() {
    // Parse a CIDR prefix
    prefix, err := netip.ParsePrefix("2001:db8::/32")
    if err != nil {
        panic(err)
    }

    fmt.Println("Prefix:", prefix)
    fmt.Println("Addr:", prefix.Addr())
    fmt.Println("Bits:", prefix.Bits())
    fmt.Println("Is valid:", prefix.IsValid())
    fmt.Println("Masked:", prefix.Masked())  // Normalized form

    // Check if an address is in the prefix
    test1, _ := netip.ParseAddr("2001:db8::1")
    test2, _ := netip.ParseAddr("2001:db9::1")

    fmt.Println("2001:db8::1 in /32:", prefix.Contains(test1))  // true
    fmt.Println("2001:db9::1 in /32:", prefix.Contains(test2))  // false
}
```

---

## Address/Port (AddrPort)

```go
func addrPortExample() {
    // Parse address:port
    ap, err := netip.ParseAddrPort("[2001:db8::1]:8080")
    if err != nil {
        panic(err)
    }

    fmt.Println("Addr:", ap.Addr())
    fmt.Println("Port:", ap.Port())

    // Create from components
    addr, _ := netip.ParseAddr("2001:db8::1")
    ap2 := netip.AddrPortFrom(addr, 443)
    fmt.Println("AddrPort:", ap2)  // [2001:db8::1]:443
}
```

---

## Converting Between net.IP and netip.Addr

```go
import "net"

func convertBetweenTypes() {
    // netip.Addr → net.IP
    addr, _ := netip.ParseAddr("2001:db8::1")
    netIP := addr.AsSlice()  // Returns []byte
    legacyIP := net.IP(netIP)
    fmt.Println("net.IP:", legacyIP)

    // net.IP → netip.Addr
    legacyIP2 := net.ParseIP("192.0.2.1")
    addr2, ok := netip.AddrFromSlice(legacyIP2)
    if ok {
        // net.ParseIP returns IPv4 addresses in 16-byte IPv4-mapped form.
        // Unmap converts ::ffff:192.0.2.1 to 192.0.2.1.
        addr2 = addr2.Unmap()
        fmt.Println("netip.Addr:", addr2)
    }
}
```

---

## Building an IP Range Checker

```go
type IPRange struct {
    start netip.Addr
    end   netip.Addr
}

func (r IPRange) Contains(addr netip.Addr) bool {
    return !addr.Less(r.start) && !r.end.Less(addr)
}

func main() {
    r := IPRange{
        start: netip.MustParseAddr("2001:db8::100"),
        end:   netip.MustParseAddr("2001:db8::200"),
    }

    test := netip.MustParseAddr("2001:db8::150")
    fmt.Println("In range:", r.Contains(test))  // true
}
```

---

## Best Practices

1. **Prefer netip.Addr over net.IP** for new code when you want an immutable, comparable value type
2. **Use MustParse*** only with hard-coded strings you know are valid
3. **Use Unmap()** when converting IPv4 values from net.IP, because `net.ParseIP` returns them in IPv4-mapped IPv6 form
4. **Use Prefix.Masked()** to normalize prefixes (e.g., `2001:db8::1/32` → `2001:db8::/32`)
5. **Use AddrPort** for address+port pairs instead of parsing strings manually

---

## Conclusion

The `net/netip` package is a modern way to work with IP addresses in Go. It takes less memory than `net.IP`, is immutable and comparable (usable as map keys), and has a cleaner API. Use it for new IPv6-aware Go code.

---

*Build and monitor your Go-based networking tools with [OneUptime](https://oneuptime.com).*
