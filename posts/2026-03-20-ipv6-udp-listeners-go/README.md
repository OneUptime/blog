# How to Create IPv6 UDP Listeners in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, UDP, Listeners, Networking, Multicast

Description: Create IPv6 UDP listeners in Go for unicast and multicast communication with practical server and client examples.

## Basic IPv6 UDP Server

```go
package main

import (
    "fmt"
    "net"
    "log"
)

func main() {
    // Resolve UDP IPv6 address
    addr, err := net.ResolveUDPAddr("udp6", "[::]:9090")
    if err != nil {
        log.Fatal("ResolveUDPAddr:", err)
    }

    // Create UDP6 listener
    conn, err := net.ListenUDP("udp6", addr)
    if err != nil {
        log.Fatal("ListenUDP:", err)
    }
    defer conn.Close()

    fmt.Println("IPv6 UDP server on [::]:9090")

    buf := make([]byte, 4096)
    for {
        n, remoteAddr, err := conn.ReadFromUDP(buf)
        if err != nil {
            log.Println("Read error:", err)
            continue
        }

        message := string(buf[:n])
        fmt.Printf("From [%s]:%d: %s\n",
            remoteAddr.IP, remoteAddr.Port, message)

        // Send response back
        response := []byte("ACK: " + message)
        conn.WriteToUDP(response, remoteAddr)
    }
}
```

## IPv6 UDP Client

```go
package main

import (
    "fmt"
    "net"
    "time"
)

func sendUDPv6(serverAddr string, message string) (string, error) {
    raddr, err := net.ResolveUDPAddr("udp6", serverAddr)
    if err != nil {
        return "", fmt.Errorf("resolve: %w", err)
    }

    // Dial to create a connected UDP socket
    conn, err := net.DialUDP("udp6", nil, raddr)
    if err != nil {
        return "", fmt.Errorf("dial: %w", err)
    }
    defer conn.Close()

    if err := conn.SetDeadline(time.Now().Add(5 * time.Second)); err != nil {
        return "", fmt.Errorf("deadline: %w", err)
    }

    _, err = conn.Write([]byte(message))
    if err != nil {
        return "", fmt.Errorf("write: %w", err)
    }

    buf := make([]byte, 4096)
    n, err := conn.Read(buf)
    if err != nil {
        return "", fmt.Errorf("read: %w", err)
    }

    return string(buf[:n]), nil
}

func main() {
    response, err := sendUDPv6("[::1]:9090", "Hello IPv6 UDP!")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    fmt.Println("Response:", response)
}
```

## IPv6 UDP Multicast Receiver

```go
package main

import (
    "fmt"
    "log"
    "net"
)

func joinIPv6Multicast(group string, ifName string, port int) {
    // Resolve the multicast group address
    groupAddr, err := net.ResolveUDPAddr("udp6",
        fmt.Sprintf("[%s]:%d", group, port))
    if err != nil {
        log.Fatal("Resolve:", err)
    }

    // Get the network interface
    iface, err := net.InterfaceByName(ifName)
    if err != nil {
        log.Fatal("Interface:", err)
    }

    // Create a UDP socket bound to the port
    conn, err := net.ListenMulticastUDP("udp6", iface, groupAddr)
    if err != nil {
        log.Fatal("Listen:", err)
    }
    defer conn.Close()

    fmt.Printf("Joined multicast group %s on %s\n", group, ifName)

    buf := make([]byte, 4096)
    for {
        n, src, err := conn.ReadFromUDP(buf)
        if err != nil {
            log.Println("Read error:", err)
            continue
        }
        fmt.Printf("Multicast from [%s]: %s\n",
            src.IP.String(), string(buf[:n]))
    }
}

func main() {
    // Use a sample link-local multicast group
    joinIPv6Multicast("ff02::114", "eth0", 9999)
}
```

## IPv6 UDP Multicast Sender

```go
package main

import (
    "fmt"
    "net"
    "golang.org/x/net/ipv6"
)

func sendIPv6Multicast(group string, ifName string, port int, message string) error {
    // Get the outgoing interface
    iface, err := net.InterfaceByName(ifName)
    if err != nil {
        return fmt.Errorf("interface: %w", err)
    }

    // Create sender socket
    conn, err := net.ListenUDP("udp6", nil)
    if err != nil {
        return fmt.Errorf("listen: %w", err)
    }
    defer conn.Close()

    // Set the outgoing interface for multicast
    pc := ipv6.NewPacketConn(conn)
    if err := pc.SetMulticastInterface(iface); err != nil {
        return fmt.Errorf("set multicast interface: %w", err)
    }
    if err := pc.SetMulticastHopLimit(1); err != nil {
        return fmt.Errorf("set multicast hop limit: %w", err)
    }

    // Send to multicast group
    groupAddr, err := net.ResolveUDPAddr("udp6",
        fmt.Sprintf("[%s]:%d", group, port))
    if err != nil {
        return fmt.Errorf("resolve group: %w", err)
    }
    _, err = conn.WriteToUDP([]byte(message), groupAddr)
    return err
}

func main() {
    err := sendIPv6Multicast("ff02::114", "eth0", 9999, "DISCOVER_SERVICE")
    if err != nil {
        fmt.Println("Error:", err)
    } else {
        fmt.Println("Multicast sent")
    }
}
```

## Async UDP Server with goroutines

```go
package main

import (
    "fmt"
    "net"
    "sync"
)

type UDPv6Server struct {
    conn    *net.UDPConn
    handler func([]byte, *net.UDPAddr) []byte
}

func NewUDPv6Server(port int, handler func([]byte, *net.UDPAddr) []byte) (*UDPv6Server, error) {
    addr, err := net.ResolveUDPAddr("udp6", fmt.Sprintf("[::]:%d", port))
    if err != nil {
        return nil, err
    }
    conn, err := net.ListenUDP("udp6", addr)
    if err != nil {
        return nil, err
    }
    return &UDPv6Server{conn: conn, handler: handler}, nil
}

func (s *UDPv6Server) Serve(workers int) {
    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            buf := make([]byte, 65536)
            for {
                n, addr, err := s.conn.ReadFromUDP(buf)
                if err != nil {
                    return
                }
                if response := s.handler(buf[:n], addr); len(response) > 0 {
                    s.conn.WriteToUDP(response, addr)
                }
            }
        }()
    }
    wg.Wait()
}
```

## Conclusion

Go's `net.ListenUDP("udp6", ...)` creates IPv6 UDP listeners cleanly. For multicast, use `net.ListenMulticastUDP()` for receiving and `golang.org/x/net/ipv6` package for sending to multicast groups with proper interface selection. The `ReadFromUDP`/`WriteToUDP` pair provides the connectionless UDP semantics needed for multicast-style IPv6 protocols.
