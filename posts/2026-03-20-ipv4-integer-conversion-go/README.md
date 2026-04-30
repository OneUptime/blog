# How to Convert Between IPv4 Addresses and Integer Representations in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv4, Integer Conversion, Networking, Net package

Description: Learn how to convert IPv4 addresses to their 32-bit integer representation and back in Go using the net package and binary encoding.

## Why Convert IPv4 to Integer?

Integer representation enables efficient IP arithmetic: subnet calculations, range comparisons, sorting, and storing IPs in numeric database columns. An IPv4 address is 4 octets = 32 bits = one uint32 value.

## IPv4 String to uint32

```go
package main

import (
    "encoding/binary"
    "fmt"
    "net"
)

// IPv4ToUint32 converts a dotted-decimal IPv4 string to a 32-bit integer
func IPv4ToUint32(s string) (uint32, error) {
    ip := net.ParseIP(s)
    if ip == nil {
        return 0, fmt.Errorf("invalid IP: %s", s)
    }

    // To4() returns a 4-byte slice in network byte order (big-endian)
    ip4 := ip.To4()
    if ip4 == nil {
        return 0, fmt.Errorf("not an IPv4 address: %s", s)
    }

    // big-endian uint32: ip4[0]<<24 | ip4[1]<<16 | ip4[2]<<8 | ip4[3]
    return binary.BigEndian.Uint32(ip4), nil
}

func main() {
    examples := []string{"0.0.0.0", "10.0.0.1", "192.168.1.255", "255.255.255.255"}

    for _, s := range examples {
        n, err := IPv4ToUint32(s)
        if err != nil {
            fmt.Printf("Error: %v\n", err)
            continue
        }
        fmt.Printf("%-18s -> %10d  (hex: %08X)\n", s, n, n)
    }
}
```

## uint32 to IPv4 String

```go
package main

import (
    "encoding/binary"
    "fmt"
    "net"
)

// Uint32ToIPv4 converts a 32-bit integer to a dotted-decimal IPv4 string
func Uint32ToIPv4(n uint32) string {
    ip := make(net.IP, 4)
    binary.BigEndian.PutUint32(ip, n)
    return ip.String()
}

func main() {
    numbers := []uint32{0, 167772161, 3232236031, 4294967295}

    for _, n := range numbers {
        ip := Uint32ToIPv4(n)
        fmt.Printf("%10d -> %s\n", n, ip)
    }
}
```

## Practical: IP Range Check

```go
package main

import (
    "encoding/binary"
    "fmt"
    "net"
)

func ipToUint32(ip net.IP) (uint32, bool) {
    ip4 := ip.To4()
    if ip4 == nil {
        return 0, false
    }

    return binary.BigEndian.Uint32(ip4), true
}

func IsInRange(ipStr, startStr, endStr string) bool {
    ip := net.ParseIP(ipStr)
    start := net.ParseIP(startStr)
    end := net.ParseIP(endStr)

    if ip == nil || start == nil || end == nil {
        return false
    }

    n, ok := ipToUint32(ip)
    if !ok {
        return false
    }

    s, ok := ipToUint32(start)
    if !ok {
        return false
    }

    e, ok := ipToUint32(end)
    if !ok {
        return false
    }

    return n >= s && n <= e
}

func main() {
    fmt.Println(IsInRange("192.168.1.50", "192.168.1.1", "192.168.1.100"))  // true
    fmt.Println(IsInRange("10.0.0.1", "192.168.1.1", "192.168.1.100"))      // false
}
```

## Sorting a List of IPv4 Addresses

```go
package main

import (
    "encoding/binary"
    "fmt"
    "net"
    "sort"
)

func sortIPv4s(ips []string) {
    sort.Slice(ips, func(i, j int) bool {
        a := net.ParseIP(ips[i]).To4()
        b := net.ParseIP(ips[j]).To4()
        return binary.BigEndian.Uint32(a) < binary.BigEndian.Uint32(b)
    })
}

func main() {
    ips := []string{"10.0.0.5", "192.168.1.1", "10.0.0.1", "172.16.0.1"}
    sortIPv4s(ips)
    fmt.Println(ips)
}
```

## Incrementing an IP Address

```go
package main

import (
    "encoding/binary"
    "fmt"
    "net"
)

func NextIP(ip net.IP) net.IP {
    ip4 := ip.To4()
    n := binary.BigEndian.Uint32(ip4)
    n++
    next := make(net.IP, 4)
    binary.BigEndian.PutUint32(next, n)
    return next
}

func main() {
    ip := net.ParseIP("192.168.1.1")
    for i := 0; i < 5; i++ {
        fmt.Println(ip)
        ip = NextIP(ip)
    }
}
```

## Conclusion

Converting IPv4 addresses to `uint32` and back is straightforward in Go using `net.IP.To4()` and `encoding/binary`. This enables efficient IP arithmetic for range checking, sorting, subnet enumeration, and CIDR calculations-all common needs in network programming.
