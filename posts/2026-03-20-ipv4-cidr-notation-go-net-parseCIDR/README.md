# How to Handle IPv4 CIDR Notation in Go with net.ParseCIDR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv4, CIDR, Networking, Net package, Subnetting

Description: Learn how to parse, validate, and perform calculations with IPv4 CIDR notation in Go using net.ParseCIDR and related net package functions.

## Parsing CIDR Notation

```go
package main

import (
    "fmt"
    "log"
    "net"
)

func main() {
    // net.ParseCIDR parses a CIDR string and returns:
    // - ip: the host address (may have host bits set)
    // - network: the network address with host bits zeroed
    ip, network, err := net.ParseCIDR("192.168.1.100/24")
    if err != nil {
        log.Fatalf("ParseCIDR error: %v", err)
    }

    fmt.Printf("Host IP:        %s\n", ip)           // 192.168.1.100
    fmt.Printf("Network:        %s\n", network)      // 192.168.1.0/24
    fmt.Printf("Network IP:     %s\n", network.IP)   // 192.168.1.0
    fmt.Printf("Subnet Mask:    %s\n", network.Mask) // ffffff00

    // Ones = prefix length, Bits = total bits
    ones, bits := network.Mask.Size()
    fmt.Printf("Prefix length:  /%d (of %d bits)\n", ones, bits)
}
```

## Checking if an IP is in a CIDR Block

```go
package main

import (
    "fmt"
    "net"
)

func IsInCIDR(ipStr, cidrStr string) (bool, error) {
    ip := net.ParseIP(ipStr)
    if ip == nil {
        return false, fmt.Errorf("invalid IP: %s", ipStr)
    }

    _, network, err := net.ParseCIDR(cidrStr)
    if err != nil {
        return false, fmt.Errorf("invalid CIDR: %s", cidrStr)
    }

    return network.Contains(ip), nil
}

func main() {
    tests := [][2]string{
        {"192.168.1.50", "192.168.1.0/24"},   // true
        {"192.168.2.1", "192.168.1.0/24"},    // false
        {"10.0.0.1", "10.0.0.0/8"},           // true
        {"172.16.5.1", "172.16.0.0/12"},      // true
        {"8.8.8.8", "192.168.0.0/16"},        // false
    }

    for _, t := range tests {
        result, err := IsInCIDR(t[0], t[1])
        if err != nil {
            fmt.Printf("Error: %v\n", err)
        } else {
            fmt.Printf("%-16s in %-20s -> %v\n", t[0], t[1], result)
        }
    }
}
```

## Calculating Network Details

```go
package main

import (
    "encoding/binary"
    "fmt"
    "net"
)

func NetworkDetails(cidr string) {
    _, network, err := net.ParseCIDR(cidr)
    if err != nil {
        fmt.Printf("Invalid CIDR: %v\n", err)
        return
    }

    ones, bits := network.Mask.Size()
    hostBits := bits - ones

    // Network address (first address)
    networkIP := network.IP.To4()
    if networkIP == nil {
        fmt.Println("CIDR must be IPv4")
        return
    }

    // Broadcast address (network | ^mask)
    broadcastIP := make(net.IP, 4)
    for i := 0; i < 4; i++ {
        broadcastIP[i] = networkIP[i] | ^network.Mask[i]
    }

    totalHosts := uint64(1) << uint(hostBits)
    usableHosts := totalHosts

    var firstHost, lastHost net.IP
    switch ones {
    case 32:
        firstHost = make(net.IP, 4)
        lastHost = make(net.IP, 4)
        copy(firstHost, networkIP)
        copy(lastHost, networkIP)
    case 31:
        firstHost = make(net.IP, 4)
        lastHost = make(net.IP, 4)
        copy(firstHost, networkIP)
        copy(lastHost, broadcastIP)
    default:
        // For prefixes smaller than /31, exclude network and broadcast.
        usableHosts = totalHosts - 2

        // First usable host (network + 1)
        firstHost = make(net.IP, 4)
        copy(firstHost, networkIP)
        n := binary.BigEndian.Uint32(firstHost)
        binary.BigEndian.PutUint32(firstHost, n+1)

        // Last usable host (broadcast - 1)
        lastHost = make(net.IP, 4)
        copy(lastHost, broadcastIP)
        m := binary.BigEndian.Uint32(lastHost)
        binary.BigEndian.PutUint32(lastHost, m-1)
    }

    fmt.Printf("CIDR:      %s\n", cidr)
    fmt.Printf("Network:   %s\n", networkIP)
    fmt.Printf("Broadcast: %s\n", broadcastIP)
    fmt.Printf("First host:%s\n", firstHost)
    fmt.Printf("Last host: %s\n", lastHost)
    fmt.Printf("Hosts:     %d usable (%d total)\n", usableHosts, totalHosts)
    fmt.Printf("Prefix:    /%d\n", ones)
}

func main() {
    NetworkDetails("192.168.1.0/24")
    fmt.Println()
    NetworkDetails("10.0.0.0/8")
}
```

## Enumerating Subnets

```go
package main

import (
    "encoding/binary"
    "fmt"
    "net"
)

// SplitCIDR splits a CIDR into smaller subnets of the given prefix length
func SplitCIDR(cidr string, newPrefix int) ([]string, error) {
    _, network, err := net.ParseCIDR(cidr)
    if err != nil {
        return nil, err
    }

    networkIP := network.IP.To4()
    if networkIP == nil {
        return nil, fmt.Errorf("CIDR must be IPv4")
    }

    ones, bits := network.Mask.Size()
    if newPrefix <= ones || newPrefix > bits {
        return nil, fmt.Errorf("newPrefix must be between /%d and /%d", ones+1, bits)
    }

    var subnets []string
    current := binary.BigEndian.Uint32(networkIP)
    subnetCount := uint64(1) << uint(newPrefix-ones)
    subnetSize := uint32(1) << uint(bits-newPrefix)
    newMask := net.CIDRMask(newPrefix, bits)

    for i := uint64(0); i < subnetCount; i++ {
        ip := make(net.IP, 4)
        binary.BigEndian.PutUint32(ip, current)
        subnets = append(subnets, (&net.IPNet{IP: ip, Mask: newMask}).String())
        current += subnetSize
    }

    return subnets, nil
}
```

## Conclusion

`net.ParseCIDR` is the standard Go function for CIDR parsing, returning both the host IP and the network address. Use `network.Contains(ip)` for membership testing, `network.Mask.Size()` for prefix length, and bitwise operations on the 4-byte IP representation for calculations like broadcast address and host enumeration.
