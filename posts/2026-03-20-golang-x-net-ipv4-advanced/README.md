# How to Use golang.org/x/net/ipv4 Package for Advanced IPv4 Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv4, Golang.org/x/net, Networking, Multicast, Socket Options

Description: Learn how to use the golang.org/x/net/ipv4 package to access advanced IPv4 socket options including TTL control, multicast, and control messages in Go.

## Installation

```bash
go get golang.org/x/net/ipv4
```

## What Does golang.org/x/net/ipv4 Provide?

The standard `net` package doesn't expose all IPv4 socket options. The `ipv4` package fills this gap by wrapping `net.Conn` and `net.PacketConn`, and by providing `RawConn` support for raw IPv4 sockets, to expose:

- IP_TTL (unicast TTL control)
- IP_MULTICAST_TTL and multicast group membership
- IP_TOS (Type of Service / DSCP)
- Per-packet control messages for received TTL, destination address, and interface index

## Controlling Unicast TTL

```go
package main

import (
    "fmt"
    "log"
    "net"

    "golang.org/x/net/ipv4"
)

func main() {
    conn, err := net.Dial("ip4:icmp", "8.8.8.8")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    // Wrap in an ipv4.Conn to access IP-level options
    c := ipv4.NewConn(conn)

    // Set the TTL for outgoing packets
    if err := c.SetTTL(64); err != nil {
        log.Printf("SetTTL error: %v", err)
    }

    // Read current TTL
    ttl, err := c.TTL()
    if err == nil {
        fmt.Printf("Current TTL: %d\n", ttl)
    }
}
```

## Setting Type of Service (ToS/DSCP)

```go
package main

import (
    "log"
    "net"

    "golang.org/x/net/ipv4"
)

const (
    DSCP_CS0  = 0x00  // Best effort
    DSCP_EF   = 0xB8  // Expedited Forwarding (low latency, e.g., VoIP)
    DSCP_AF41 = 0x88  // Assured Forwarding (streaming video)
)

func main() {
    conn, err := net.Dial("tcp4", "192.168.1.100:9000")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    c := ipv4.NewConn(conn)

    // Set ToS/DSCP for QoS marking
    if err := c.SetTOS(DSCP_EF); err != nil {
        log.Printf("SetTOS warning: %v", err)
    }

    log.Printf("Connected with EF DSCP marking for low-latency traffic")
}
```

## Receiving Control Messages (Per-Packet Metadata)

```go
package main

import (
    "fmt"
    "log"
    "net"

    "golang.org/x/net/ipv4"
)

func main() {
    conn, err := net.ListenPacket("udp4", "0.0.0.0:9001")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    pc := ipv4.NewPacketConn(conn)

    // Enable receiving of control messages
    if err := pc.SetControlMessage(ipv4.FlagTTL|ipv4.FlagDst|ipv4.FlagInterface, true); err != nil {
        log.Fatal(err)
    }

    buf := make([]byte, 4096)
    for {
        n, cm, src, err := pc.ReadFrom(buf)
        if err != nil {
            break
        }

        fmt.Printf("Packet from %s:\n", src)
        fmt.Printf("  Data: %s\n", buf[:n])
        if cm != nil {
            fmt.Printf("  Received TTL: %d\n", cm.TTL)
            fmt.Printf("  Destination IP: %s\n", cm.Dst)
            fmt.Printf("  Interface index: %d\n", cm.IfIndex)
        }
    }
}
```

## Multicast Group Management

```go
package main

import (
    "fmt"
    "log"
    "net"

    "golang.org/x/net/ipv4"
)

func main() {
    conn, err := net.ListenPacket("udp4", "0.0.0.0:9999")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    pc := ipv4.NewPacketConn(conn)

    iface, err := net.InterfaceByName("eth0")
    if err != nil {
        log.Fatal(err)
    }

    group := &net.UDPAddr{IP: net.ParseIP("224.0.0.100")}

    // Join multicast group
    if err := pc.JoinGroup(iface, group); err != nil {
        log.Fatalf("JoinGroup: %v", err)
    }
    log.Printf("Joined 224.0.0.100 on eth0")
    defer pc.LeaveGroup(iface, group)

    // Set outgoing multicast interface and TTL
    if err := pc.SetMulticastInterface(iface); err != nil {
        log.Fatal(err)
    }
    if err := pc.SetMulticastTTL(1); err != nil {
        log.Fatal(err)
    }

    buf := make([]byte, 4096)
    for {
        n, _, src, err := pc.ReadFrom(buf)
        if err != nil {
            break
        }
        fmt.Printf("Multicast from %s: %s\n", src, buf[:n])
    }
}
```

## Conclusion

`golang.org/x/net/ipv4` extends Go's standard networking with fine-grained IPv4 control: TTL manipulation, DSCP/ToS marking, per-packet control messages, and multicast group management. Use it whenever you need capabilities beyond what the standard `net` package exposes, particularly for QoS-sensitive applications, custom routing, or multicast group management.
