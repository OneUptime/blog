# How to Implement a UDP Multicast Listener in Go for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, UDP, Multicast, IPv4, Networking, Golang.org/x/net

Description: Learn how to implement a UDP IPv4 multicast listener and sender in Go using the golang.org/x/net/ipv4 package for group communication.

## What Is IPv4 Multicast?

Multicast allows one sender to reach multiple receivers efficiently. Instead of unicast (one-to-one) or broadcast (one-to-all), multicast delivers to a subscribed group. IPv4 multicast addresses are in the range `224.0.0.0` to `239.255.255.255`.

## Installation

```bash
go get golang.org/x/net/ipv4
```

## Multicast Receiver (Listener)

```go
package main

import (
    "fmt"
    "log"
    "net"

    "golang.org/x/net/ipv4"
)

const (
    MulticastGroup = "224.0.0.100"  // Multicast group address
    MulticastPort  = 9999
)

func main() {
    // Listen on all interfaces for the multicast port
    addr := fmt.Sprintf("0.0.0.0:%d", MulticastPort)
    conn, err := net.ListenPacket("udp4", addr)
    if err != nil {
        log.Fatalf("ListenPacket error: %v", err)
    }
    defer conn.Close()

    // Wrap in an ipv4 PacketConn for multicast group management
    pc := ipv4.NewPacketConn(conn)

    // Enable the interface index control message so cm.IfIndex is populated
    if err := pc.SetControlMessage(ipv4.FlagInterface, true); err != nil {
        log.Fatalf("SetControlMessage error: %v", err)
    }

    // Get the interface to join on (use net.InterfaceByName for a specific one)
    ifaces, err := net.Interfaces()
    if err != nil {
        log.Fatal(err)
    }

    group := net.ParseIP(MulticastGroup)

    // Join the multicast group on each eligible interface
    for _, iface := range ifaces {
        if iface.Flags&net.FlagMulticast != 0 {
            if err := pc.JoinGroup(&iface, &net.UDPAddr{IP: group}); err != nil {
                log.Printf("JoinGroup on %s failed: %v", iface.Name, err)
                continue
            }
            log.Printf("Joined multicast group %s on interface %s", MulticastGroup, iface.Name)
        }
    }

    buf := make([]byte, 4096)
    log.Printf("Listening for multicast on %s:%d", MulticastGroup, MulticastPort)

    for {
        n, cm, src, err := pc.ReadFrom(buf)
        if err != nil {
            log.Printf("ReadFrom error: %v", err)
            continue
        }
        fmt.Printf("Received %d bytes from %s (via interface index %d): %s\n",
            n, src, cm.IfIndex, string(buf[:n]))
    }
}
```

## Multicast Sender

```go
package main

import (
    "fmt"
    "log"
    "net"
    "time"

    "golang.org/x/net/ipv4"
)

const (
    MulticastGroup = "224.0.0.100"
    MulticastPort  = 9999
)

func main() {
    // Create a UDP connection for sending
    conn, err := net.ListenPacket("udp4", "0.0.0.0:0")  // Any local port
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    pc := ipv4.NewPacketConn(conn)

    // Set TTL for multicast packets (1 = local subnet only)
    if err := pc.SetMulticastTTL(1); err != nil {
        log.Printf("SetMulticastTTL warning: %v", err)
    }

    // Optionally set the outgoing interface for multicast
    iface, err := net.InterfaceByName("eth0")
    if err == nil {
        pc.SetMulticastInterface(iface)
    }

    dst := &net.UDPAddr{
        IP:   net.ParseIP(MulticastGroup),
        Port: MulticastPort,
    }

    for i := 0; i < 5; i++ {
        msg := fmt.Sprintf("Multicast message #%d at %s", i, time.Now().Format(time.RFC3339))
        if _, err := pc.WriteTo([]byte(msg), nil, dst); err != nil {
            log.Printf("WriteTo error: %v", err)
        } else {
            log.Printf("Sent: %s", msg)
        }
        time.Sleep(time.Second)
    }
}
```

## Simplified Multicast with net.UDPConn

For simple use cases without `x/net/ipv4`:

```go
package main

import (
    "fmt"
    "log"
    "net"
)

func main() {
    groupAddr := &net.UDPAddr{IP: net.ParseIP("224.0.0.100"), Port: 9999}

    // ListenMulticastUDP is a convenience wrapper
    conn, err := net.ListenMulticastUDP("udp4", nil, groupAddr)
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    buf := make([]byte, 4096)
    for {
        n, src, err := conn.ReadFromUDP(buf)
        if err != nil {
            break
        }
        fmt.Printf("From %s: %s\n", src, buf[:n])
    }
}
```

## Conclusion

IPv4 multicast in Go requires `net.ListenPacket("udp4", ...)` plus the `golang.org/x/net/ipv4` package for group membership management. Use `JoinGroup` to subscribe to a multicast address on specific interfaces, and `SetMulticastTTL(1)` to limit multicast scope to the local subnet. For simple cases, `net.ListenMulticastUDP` provides a convenient one-call alternative.
