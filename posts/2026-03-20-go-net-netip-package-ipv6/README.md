# How to Use Go net/netip Package for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Netip, Net/netip, Networking, Programming

Description: Use Go's net/netip package (introduced in Go 1.18) for efficient, immutable IPv6 address and prefix operations.

## Why net/netip?

Go 1.18 introduced the `net/netip` package as a more efficient alternative to `net.IP`. The new types are:
- **Value types** (not pointers): Copy-by-value, comparable with `==`
- **Immutable**: Thread-safe without synchronization
- **Memory efficient**: On 64-bit platforms, `netip.Addr` is 24 bytes, while `net.IP` has a 24-byte slice header plus separate 4- or 16-byte backing storage
- **Built-in IPv6 zone support**: Handles `fe80::1%eth0` natively

## Basic netip.Addr Operations

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
        panic(err)
    }

    fmt.Println("Address:", addr)          // 2001:db8::1
    fmt.Println("Is IPv6:", addr.Is6())    // true
    fmt.Println("Is IPv4:", addr.Is4())    // false
    fmt.Println("Is valid:", addr.IsValid())
    fmt.Println("Is loopback:", addr.IsLoopback())
    fmt.Println("Is link-local:", addr.IsLinkLocalUnicast())
    fmt.Println("Is global unicast:", addr.IsGlobalUnicast())

    // Get the raw 16-byte representation
    bytes := addr.As16()
    fmt.Printf("Bytes: %x\n", bytes)

    // Compare addresses (value equality, no pointers)
    addr2, _ := netip.ParseAddr("2001:db8::1")
    fmt.Println("Addresses equal:", addr == addr2)  // true

    // Increment address
    next := addr.Next()
    fmt.Println("Next address:", next)  // 2001:db8::2
}
```

## IPv6 with Zone IDs (Link-Local)

```go
package main

import (
    "fmt"
    "net/netip"
)

func main() {
    // Parse IPv6 with zone ID (e.g., link-local with interface scope)
    addr, err := netip.ParseAddr("fe80::1%eth0")
    if err != nil {
        panic(err)
    }

    fmt.Println("Address:", addr)           // fe80::1%eth0
    fmt.Println("Zone:", addr.Zone())       // eth0
    fmt.Println("Without zone:", addr.WithZone(""))   // fe80::1
    fmt.Println("Is link-local:", addr.IsLinkLocalUnicast())  // true
}
```

## Working with netip.Prefix

```go
package main

import (
    "fmt"
    "net/netip"
)

func main() {
    // Parse a CIDR prefix
    prefix, err := netip.ParsePrefix("2001:db8::/32")
    if err != nil {
        panic(err)
    }

    fmt.Println("Prefix:", prefix)           // 2001:db8::/32
    fmt.Println("Address:", prefix.Addr())   // 2001:db8::
    fmt.Println("Bits:", prefix.Bits())      // 32
    fmt.Println("Is valid:", prefix.IsValid())

    // Check if an address is in the prefix
    testAddr, _ := netip.ParseAddr("2001:db8:1::100")
    fmt.Println("In prefix:", prefix.Contains(testAddr))  // true

    // Get masked prefix (normalize host bits to 0)
    masked := prefix.Masked()
    fmt.Println("Masked:", masked)  // 2001:db8::/32

    // Generate the next subnet
    next := nextSubnet(prefix)
    fmt.Println("Next /32:", next)
}

func nextSubnet(p netip.Prefix) netip.Prefix {
    if !p.IsValid() {
        return netip.Prefix{}
    }
    // Calculate the address after this subnet ends
    last := lastAddr(p)
    next := last.Next()
    if !next.IsValid() {
        return netip.Prefix{}
    }
    nextPrefix, _ := next.Prefix(p.Bits())
    return nextPrefix
}

func lastAddr(p netip.Prefix) netip.Addr {
    if !p.IsValid() {
        return netip.Addr{}
    }
    // Calculate the last address in the prefix
    addr := p.Masked().Addr()
    bits := p.Bits()
    // Host bits are all 1s
    a := addr.As16()
    for i := bits; i < 128; i++ {
        byteIdx := i / 8
        bitIdx := 7 - (i % 8)
        a[byteIdx] |= 1 << bitIdx
    }
    return netip.AddrFrom16(a)
}
```

## AddrPort for Socket Addresses

```go
package main

import (
    "fmt"
    "net"
    "net/netip"
)

func main() {
    // Create a socket address (IP + port)
    addrPort, err := netip.ParseAddrPort("[2001:db8::1]:8080")
    if err != nil {
        panic(err)
    }

    fmt.Println("AddrPort:", addrPort)       // [2001:db8::1]:8080
    fmt.Println("Addr:", addrPort.Addr())    // 2001:db8::1
    fmt.Println("Port:", addrPort.Port())    // 8080

    // Construct from components
    addr, _ := netip.ParseAddr("2001:db8::1")
    ap := netip.AddrPortFrom(addr, 443)
    fmt.Println("Constructed:", ap)          // [2001:db8::1]:443

    // Convert to net.TCPAddr for use with net package
    tcpAddr := &net.TCPAddr{
        IP:   addr.AsSlice(),
        Port: int(ap.Port()),
    }
    fmt.Println("TCPAddr:", tcpAddr)
}
```

## Converting Between net.IP and netip.Addr

```go
import (
    "net"
    "net/netip"
)

// Convert net.IP to netip.Addr
func netIPToAddr(ip net.IP) (netip.Addr, bool) {
    if ip4 := ip.To4(); ip4 != nil {
        return netip.AddrFromSlice(ip4)
    }
    return netip.AddrFromSlice(ip.To16())
}

// Convert netip.Addr to net.IP
func addrToNetIP(addr netip.Addr) net.IP {
    return net.IP(addr.AsSlice())
}
```

## Conclusion

Go's `net/netip` package provides a modern, efficient way to work with IPv6 addresses. The value-type semantics (comparable with `==`, copy-by-value) make it ideal for maps and sets. The built-in zone support handles link-local addresses cleanly. For new Go code, prefer `net/netip` types over the older `net.IP` slice-based approach.
