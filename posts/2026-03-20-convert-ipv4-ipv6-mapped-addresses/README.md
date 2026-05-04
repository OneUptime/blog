# How to Convert Between IPv4 and IPv6-Mapped Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, IPv6, Address Mapping, Python, Go, Networking

Description: Convert between IPv4 addresses and their IPv6-mapped equivalents (::ffff:0:0/96) in Python, Go, and JavaScript to support dual-stack applications.

## Introduction

IPv6-mapped IPv4 addresses have the form `::ffff:<IPv4>` (e.g., `::ffff:192.168.1.1`). They allow IPv6-only sockets to represent IPv4 connections, and are critical in dual-stack networking. Many operating systems present incoming IPv4 connections on IPv6 sockets using this format.

## Format

```text
IPv4:          192.168.1.100
IPv6-mapped:   ::ffff:192.168.1.100
Full notation: 0000:0000:0000:0000:0000:ffff:c0a8:0164
```

## Python

```python
import ipaddress

def ipv4_to_mapped(ipv4_str: str) -> str:
    v4 = ipaddress.IPv4Address(ipv4_str)
    return f"::ffff:{v4}"

def mapped_to_ipv4(ipv6_str: str) -> str | None:
    v6 = ipaddress.IPv6Address(ipv6_str)
    if v6.ipv4_mapped is not None:
        return str(v6.ipv4_mapped)
    return None

# Examples

print(ipv4_to_mapped("192.168.1.100"))           # ::ffff:192.168.1.100
print(ipv4_to_mapped("10.0.0.1"))                # ::ffff:10.0.0.1
print(mapped_to_ipv4("::ffff:192.168.1.100"))    # 192.168.1.100
print(mapped_to_ipv4("2001:db8::1"))             # None (not mapped)
```

Note: `str(ipaddress.IPv6Address("::ffff:192.168.1.100"))` returns the compressed hexadecimal form `::ffff:c0a8:164`. To preserve the familiar dotted-quad notation, build the string explicitly as shown above.

## Go

Use the `net/netip` package (Go 1.18+). Note that the older `net.IP.String()` method renders IPv4-mapped IPv6 addresses as plain dotted decimal (e.g. `192.168.1.100`), so it cannot produce the `::ffff:x.x.x.x` form.

```go
package main

import (
    "fmt"
    "net/netip"
)

func ipv4ToMapped(ipv4 string) string {
    addr, err := netip.ParseAddr(ipv4)
    if err != nil || !addr.Is4() {
        return ""
    }
    // AddrFrom16 of the 16-byte form yields a 4-in-6 Addr,
    // which prints as ::ffff:x.x.x.x
    return netip.AddrFrom16(addr.As16()).String()
}

func mappedToIPv4(ipv6 string) string {
    addr, err := netip.ParseAddr(ipv6)
    if err != nil || !addr.Is4In6() {
        return ""
    }
    return addr.Unmap().String()
}

func main() {
    fmt.Println(ipv4ToMapped("192.168.1.100"))         // ::ffff:192.168.1.100
    fmt.Println(mappedToIPv4("::ffff:192.168.1.100"))  // 192.168.1.100
    fmt.Println(mappedToIPv4("2001:db8::1"))           // "" (not IPv4-mapped)
}
```

## JavaScript

JavaScript has no built-in IP address library, but the dotted-quad mapped form is just a string concatenation, and parsing back out is a simple regex match.

```javascript
function toMapped(ipv4) {
    return `::ffff:${ipv4}`;
}

function fromMapped(ipv6) {
    const m = ipv6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    return m ? m[1] : null;
}

console.log(toMapped("192.168.1.100"));           // ::ffff:192.168.1.100
console.log(fromMapped("::ffff:192.168.1.100"));  // 192.168.1.100
console.log(fromMapped("2001:db8::1"));           // null (not mapped)
```

## Detecting Mapped Addresses in Dual-Stack Servers

```python
import ipaddress

def normalize_client_ip(addr: str) -> str:
    """Strip IPv6-mapped prefix to return the real IPv4 address."""
    try:
        v6 = ipaddress.IPv6Address(addr)
        return str(v6.ipv4_mapped) if v6.ipv4_mapped is not None else addr
    except ValueError:
        return addr  # already IPv4

# When accept() returns "::ffff:10.0.0.5"
print(normalize_client_ip("::ffff:10.0.0.5"))  # 10.0.0.5
```

## Conclusion

IPv6-mapped IPv4 addresses follow the `::ffff:0:0/96` prefix. Python's `ipaddress` module exposes `ipv4_mapped` directly; Go's `net/netip` package handles the conversion via `Is4In6` and `Unmap`; in JavaScript simple string manipulation works for the common `::ffff:x.x.x.x` form. Always normalize mapped addresses when logging or performing access control checks.
