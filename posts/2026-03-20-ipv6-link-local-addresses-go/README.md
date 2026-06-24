# How to Handle IPv6 Link-Local Addresses in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Link-Local, Zone ID, Networking, Net/netip

Description: Handle IPv6 link-local addresses in Go, including zone ID management, interface binding, and NDP neighbor discovery.

## Understanding Link-Local Addresses

IPv6 link-local addresses (fe80::/10) are automatically assigned to every IPv6-capable interface. They are scoped to the local link - not routable beyond the directly connected network.

Key characteristic: Link-local addresses require a **zone ID** (interface name or index) when used as socket addresses, because the same address (fe80::1) might exist on multiple interfaces.

## Listing Link-Local Addresses

```go
package main

import (
    "fmt"
    "net"
    "net/netip"
)

func listLinkLocalAddresses() {
    interfaces, err := net.Interfaces()
    if err != nil {
        panic(err)
    }

    for _, iface := range interfaces {
        if iface.Flags&net.FlagUp == 0 {
            continue  // Skip down interfaces
        }

        addrs, err := iface.Addrs()
        if err != nil {
            continue
        }

        for _, addr := range addrs {
            var ip net.IP
            switch v := addr.(type) {
            case *net.IPNet:
                ip = v.IP
            case *net.IPAddr:
                ip = v.IP
            }

            if ip == nil {
                continue
            }

            netipAddr, ok := netip.AddrFromSlice(ip)
            if !ok {
                continue
            }

            if netipAddr.Is6() && netipAddr.IsLinkLocalUnicast() {
                // Link-local found - format with zone ID
                fmt.Printf("%s: [%s%%%s]\n",
                    iface.Name, netipAddr, iface.Name)
            }
        }
    }
}

func main() {
    listLinkLocalAddresses()
}
```

## Connecting to a Link-Local Address

To connect to a link-local address, you must specify the zone ID:

```go
package main

import (
    "context"
    "fmt"
    "net"
)

func connectLinkLocal(ipv6Addr, ifaceName string, port int) (net.Conn, error) {
    // Validate the interface and fetch its index
    iface, err := net.InterfaceByName(ifaceName)
    if err != nil {
        return nil, fmt.Errorf("interface %s not found: %w", ifaceName, err)
    }

    // Format address with zone ID
    // Go's net package accepts an RFC 4007 zone in the literal IPv6 address
    addrWithZone := fmt.Sprintf("[%s%%%s]:%d", ipv6Addr, ifaceName, port)

    dialer := &net.Dialer{}
    conn, err := dialer.DialContext(
        context.Background(),
        "tcp6",
        addrWithZone,
    )
    if err != nil {
        return nil, fmt.Errorf("connect to link-local failed: %w", err)
    }

    fmt.Printf("Connected via interface index %d\n", iface.Index)
    return conn, nil
}

func main() {
    conn, err := connectLinkLocal("fe80::1", "eth0", 22)
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer conn.Close()
    fmt.Println("Connected:", conn.RemoteAddr())
}
```

## Binding a Server to a Link-Local Address

```go
package main

import (
    "fmt"
    "net"
)

func listenOnLinkLocal(ifaceName string, port int) (net.Listener, error) {
    // Find the link-local address of the interface
    iface, err := net.InterfaceByName(ifaceName)
    if err != nil {
        return nil, err
    }

    addrs, err := iface.Addrs()
    if err != nil {
        return nil, err
    }

    var linkLocalAddr string
    for _, addr := range addrs {
        switch v := addr.(type) {
        case *net.IPNet:
            if v.IP.To4() == nil && v.IP.IsLinkLocalUnicast() {
                linkLocalAddr = v.IP.String()
            }
        case *net.IPAddr:
            if v.IP.To4() == nil && v.IP.IsLinkLocalUnicast() {
                linkLocalAddr = v.IP.String()
            }
        }
    }

    if linkLocalAddr == "" {
        return nil, fmt.Errorf("no link-local address on %s", ifaceName)
    }

    // Bind with zone ID
    listenAddr := fmt.Sprintf("[%s%%%s]:%d", linkLocalAddr, ifaceName, port)
    return net.Listen("tcp6", listenAddr)
}
```

## Handling Zone IDs in net/netip

```go
package main

import (
    "fmt"
    "net/netip"
)

func handleZoneID() {
    // Parse link-local with zone ID
    addr, err := netip.ParseAddr("fe80::1%eth0")
    if err != nil {
        panic(err)
    }

    fmt.Println("Full address:", addr)               // fe80::1%eth0
    fmt.Println("Zone:", addr.Zone())                // eth0
    fmt.Println("Without zone:", addr.WithZone(""))  // fe80::1
    fmt.Println("Is link-local:", addr.IsLinkLocalUnicast())  // true

    // Compare addresses ignoring zone
    addr1, _ := netip.ParseAddr("fe80::1%eth0")
    addr2, _ := netip.ParseAddr("fe80::1%eth1")

    // With zone: not equal
    fmt.Println("With zone equal:", addr1 == addr2)  // false

    // Without zone: equal
    fmt.Println("Without zone equal:",
        addr1.WithZone("") == addr2.WithZone(""))  // true
}
```

## Link-Local Multicast Probe

```go
package main

import (
    "fmt"
    "net"
    "time"
)

func probeLinkLocalMulticast(ifaceName string) {
    // ff02::1 is the all-nodes multicast address (link-scope)
    allNodes := fmt.Sprintf("ff02::1%%%s", ifaceName)

    // OS ping tools or raw ICMPv6 are better suited for active discovery.
    // Neighbor Discovery itself uses ICMPv6, not UDP.
    fmt.Printf("Sending to all-nodes multicast: %s\n", allNodes)

    // Send a UDP datagram to a link-scope multicast address
    addr := fmt.Sprintf("[%s]:9999", allNodes)
    conn, err := net.Dial("udp6", addr)
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer conn.Close()

    conn.SetDeadline(time.Now().Add(2 * time.Second))
    conn.Write([]byte("multicast-probe"))
    fmt.Println("Probe sent - this is multicast probing, not NDP neighbor discovery")
}
```

## Conclusion

When you use IPv6 link-local addresses as literal socket addresses in Go, include a zone ID. The `net/netip` package provides clean zone ID access via `addr.Zone()` and `addr.WithZone("")`. When connecting or binding to a link-local address, include the `%ifname` suffix to specify which interface the address belongs to.
