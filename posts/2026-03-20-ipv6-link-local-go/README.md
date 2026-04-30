# How to Work with IPv6 Link-Local Addresses in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Go, Link-Local, Zone ID, Networking

Description: Handle IPv6 link-local addresses in Go including zone IDs, binding to specific interfaces, using link-local addresses for discovery, and connecting to link-local endpoints.

## Understanding Link-Local and Zone IDs

```go
package main

import (
    "fmt"
    "net"
    "net/netip"
)

func main() {
    // Link-local addresses: fe80::/10
    // Scoped addresses often need a zone ID (interface name)

    // Parse link-local - valid without zone but not enough for a scoped socket address
    addr, _ := netip.ParseAddr("fe80::1")
    fmt.Println("Is link-local:", addr.IsLinkLocalUnicast())  // true

    // With zone ID - for scoped socket operations
    addrWithZone, _ := netip.ParseAddrPort("[fe80::1%eth0]:8080")
    fmt.Println("Addr:", addrWithZone.Addr())   // fe80::1%eth0
    fmt.Println("Zone:", addrWithZone.Addr().Zone())  // eth0

    // net.IP approach
    ip := net.ParseIP("fe80::1")
    fmt.Println("net.IP link-local:", ip.IsLinkLocalUnicast())  // true
    // net.IP has no zone ID - must use net.IPAddr, net.TCPAddr, or net.UDPAddr

    // For scoped IPv6 socket addresses, specify the interface
    ipAddr := &net.IPAddr{IP: ip, Zone: "eth0"}
    fmt.Println("With zone:", ipAddr)  // fe80::1%eth0
}
```

## List Link-Local Addresses on All Interfaces

```go
package main

import (
    "fmt"
    "net"
)

func getLinkLocalAddresses() []struct {
    Iface string
    Addr  net.IP
} {
    var results []struct {
        Iface string
        Addr  net.IP
    }

    ifaces, err := net.Interfaces()
    if err != nil {
        return results
    }

    for _, iface := range ifaces {
        if iface.Flags&net.FlagLoopback != 0 {
            continue  // skip loopback
        }

        addrs, _ := iface.Addrs()
        for _, addr := range addrs {
            var ip net.IP
            switch v := addr.(type) {
            case *net.IPNet:
                ip = v.IP
            case *net.IPAddr:
                ip = v.IP
            }
            if ip != nil && ip.IsLinkLocalUnicast() {
                results = append(results, struct {
                    Iface string
                    Addr  net.IP
                }{iface.Name, ip})
            }
        }
    }
    return results
}

func main() {
    linkLocals := getLinkLocalAddresses()
    fmt.Printf("Found %d link-local addresses:\n", len(linkLocals))
    for _, ll := range linkLocals {
        fmt.Printf("  %s%%%-12s  (fe80:: range)\n", ll.Addr, ll.Iface)
    }
}
```

## Dial to Link-Local Address with Zone ID

```go
package main

import (
    "fmt"
    "net"
    "time"
)

func dialLinkLocal(ipv6LinkLocal, zone, port string) (net.Conn, error) {
    // Zone ID is required for a remote link-local literal
    // Combine as: "fe80::1%eth0"
    addr := fmt.Sprintf("[%s%%%s]:%s", ipv6LinkLocal, zone, port)
    fmt.Printf("Dialing: %s\n", addr)

    conn, err := net.DialTimeout("tcp6", addr, 5*time.Second)
    if err != nil {
        return nil, fmt.Errorf("dial failed: %w", err)
    }
    return conn, nil
}

func main() {
    // Connect to a router's link-local SSH or management port
    conn, err := dialLinkLocal("fe80::1", "eth0", "22")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer conn.Close()

    local := conn.LocalAddr()
    remote := conn.RemoteAddr()
    fmt.Printf("Connected: %s → %s\n", local, remote)
}
```

## Listen on Link-Local Address

```go
package main

import (
    "fmt"
    "net"
)

func listenLinkLocal(ifaceName string, port int) (net.Listener, error) {
    // Bind to an actual link-local address assigned to the interface
    iface, err := net.InterfaceByName(ifaceName)
    if err != nil {
        return nil, err
    }

    addrs, err := iface.Addrs()
    if err != nil {
        return nil, err
    }

    for _, addr := range addrs {
        var ip net.IP
        switch v := addr.(type) {
        case *net.IPNet:
            ip = v.IP
        case *net.IPAddr:
            ip = v.IP
        }
        if ip != nil && ip.IsLinkLocalUnicast() {
            return net.ListenTCP("tcp6", &net.TCPAddr{
                IP:   ip,
                Port: port,
                Zone: iface.Name,
            })
        }
    }

    return nil, fmt.Errorf("no IPv6 link-local address on %s", ifaceName)
}

func main() {
    ln, err := listenLinkLocal("eth0", 8080)
    if err != nil {
        fmt.Println("Listen error:", err)
        return
    }
    defer ln.Close()
    fmt.Printf("Listening on: %s\n", ln.Addr())

    for {
        conn, err := ln.Accept()
        if err != nil {
            break
        }
        fmt.Printf("  Connection from: %s\n", conn.RemoteAddr())
        conn.Close()
    }
}
```

## UDP with Link-Local Multicast

```go
package main

import (
    "fmt"
    "net"
)

func sendMulticast(iface, message string) error {
    // ff02::1 = all nodes on the local link
    multicastAddr := &net.UDPAddr{
        IP:   net.ParseIP("ff02::1"),
        Port: 9999,
        Zone: iface,  // Zone ID selects the link for this destination
    }

    conn, err := net.DialUDP("udp6", nil, multicastAddr)
    if err != nil {
        return err
    }
    defer conn.Close()

    _, err = conn.Write([]byte(message))
    return err
}

func receiveMulticast(iface string) error {
    // Join the all-nodes group on a specific interface
    ifi, err := net.InterfaceByName(iface)
    if err != nil {
        return err
    }

    groupAddr := &net.UDPAddr{
        IP:   net.ParseIP("ff02::1"),
        Port: 9999,
    }

    conn, err := net.ListenMulticastUDP("udp6", ifi, groupAddr)
    if err != nil {
        return err
    }
    defer conn.Close()

    buf := make([]byte, 1024)
    for {
        n, addr, err := conn.ReadFromUDP(buf)
        if err != nil {
            return err
        }
        fmt.Printf("Multicast from [%s%%%s]: %s\n", addr.IP, addr.Zone, buf[:n])
    }
}

func main() {
    // Example: send a discovery message to all nodes on the local link
    if err := sendMulticast("eth0", "IPv6 discovery probe"); err != nil {
        fmt.Println("Send error:", err)
    }
}
```

## Conclusion

IPv6 link-local addresses in Go often need a zone ID to disambiguate the interface, especially when you dial or parse a scoped literal such as `"[fe80::1%eth0]:8080"`. Use `net.IPAddr`, `net.TCPAddr`, or `net.UDPAddr` when you need to carry both the IP and zone, or append `%iface` to the address string for APIs such as `Dial`. Use `net/netip.Addr.Zone()` to extract the zone from a parsed address. When listening, bind to an actual link-local address assigned to the interface, not just the `fe80::/10` prefix or the unspecified `::` address with a zone. For link-local multicast, use `net.ListenMulticastUDP` with the specific interface you want to join on. Always check `ip.IsLinkLocalUnicast()` before using a link-local address and ensure your application handles scoped IPv6 addresses gracefully.
