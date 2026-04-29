# How to Create IPv6 TCP Listeners in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, TCP, Listeners, Server, Networking

Description: Create IPv6 TCP listeners in Go using net.Listen, handle dual-stack connections, and manage client IPv6 addresses.

## Simple IPv6 TCP Listener

```go
package main

import (
    "fmt"
    "io"
    "net"
    "log"
)

func main() {
    // Listen on all IPv6 interfaces, port 8080
    // "tcp6" = IPv6 TCP only
    ln, err := net.Listen("tcp6", "[::]:8080")
    if err != nil {
        log.Fatal("Failed to listen:", err)
    }
    defer ln.Close()

    fmt.Println("IPv6 TCP server listening on [::]:8080")

    for {
        conn, err := ln.Accept()
        if err != nil {
            log.Println("Accept error:", err)
            continue
        }

        go handleConnection(conn)
    }
}

func handleConnection(conn net.Conn) {
    defer conn.Close()

    // Get client address (IPv6)
    remoteAddr := conn.RemoteAddr().(*net.TCPAddr)
    fmt.Printf("Connection from [%s]:%d\n",
        remoteAddr.IP, remoteAddr.Port)

    // Echo server: read and write back
    io.Copy(conn, conn)
}
```

## Dual-Stack TCP Listener (IPv4 + IPv6, Where Supported)

```go
package main

import (
    "fmt"
    "net"
    "log"
)

func dualStackListen(port int) (net.Listener, error) {
    // "tcp" on an unspecified address may accept both IPv4 and IPv6
    // on platforms that support IPv4-mapped IPv6 addresses.
    // On Linux, net.ipv6.bindv6only=0 allows IPv4-mapped connections.
    // Some systems, such as OpenBSD and DragonFly BSD, require separate listeners.
    addr := fmt.Sprintf("[::]:%d", port)
    return net.Listen("tcp", addr)
}

func main() {
    ln, err := dualStackListen(9000)
    if err != nil {
        log.Fatal(err)
    }
    defer ln.Close()
    fmt.Println("TCP listener on [::]:9000")

    for {
        conn, err := ln.Accept()
        if err != nil {
            continue
        }
        go func(c net.Conn) {
            defer c.Close()
            remote := c.RemoteAddr()
            fmt.Printf("Connection: %s → %s\n",
                remote.String(), c.LocalAddr().String())
        }(conn)
    }
}
```

## Listening on Specific IPv6 Addresses

```go
package main

import (
    "fmt"
    "io"
    "net"
    "log"
)

func listenOnIPv6Addresses(addresses []string, port int) []net.Listener {
    var listeners []net.Listener

    for _, addr := range addresses {
        listenAddr := fmt.Sprintf("[%s]:%d", addr, port)
        ln, err := net.Listen("tcp6", listenAddr)
        if err != nil {
            log.Printf("Cannot listen on %s: %v", listenAddr, err)
            continue
        }
        fmt.Printf("Listening on %s\n", listenAddr)
        listeners = append(listeners, ln)
    }

    return listeners
}

func main() {
    addresses := []string{
        "::1",              // Loopback
        "2001:db8::1",      // Documentation example; replace with an address assigned to this host
    }

    listeners := listenOnIPv6Addresses(addresses, 8080)
    for _, ln := range listeners {
        go func(l net.Listener) {
            for {
                conn, err := l.Accept()
                if err != nil {
                    return
                }
                go handleConnection(conn)
            }
        }(ln)
    }

    // Block forever
    select {}
}

func handleConnection(conn net.Conn) {
    defer conn.Close()
    io.Copy(conn, conn)
}
```

## Extracting IPv6 Client Information

```go
package main

import (
    "fmt"
    "net"
    "net/netip"
)

func getClientInfo(conn net.Conn) (addr netip.Addr, port uint16, zone string) {
    tcpAddr := conn.RemoteAddr().(*net.TCPAddr)

    // Convert to netip.Addr for modern handling
    ipAddr, ok := netip.AddrFromSlice(tcpAddr.IP)
    if !ok {
        return
    }

    // Handle IPv4-mapped IPv6 (::ffff:x.x.x.x)
    if ipAddr.Is4In6() {
        ipAddr = ipAddr.Unmap()  // Returns the plain IPv4 address
    }

    return ipAddr, uint16(tcpAddr.Port), tcpAddr.Zone
}

func handleConnection(conn net.Conn) {
    defer conn.Close()

    addr, port, zone := getClientInfo(conn)
    version := "IPv4"
    if addr.Is6() {
        version = "IPv6"
    }

    if zone != "" {
        fmt.Printf("[%s] %s%%%s port=%d\n", version, addr, zone, port)
    } else {
        fmt.Printf("[%s] %s port=%d\n", version, addr, port)
    }
}
```

## Concurrent IPv6 Server with Graceful Shutdown

```go
package main

import (
    "context"
    "fmt"
    "io"
    "net"
    "os/signal"
    "sync"
    "syscall"
)

type IPv6Server struct {
    listener net.Listener
    wg       sync.WaitGroup
}

func NewIPv6Server(port int) (*IPv6Server, error) {
    ln, err := net.Listen("tcp6", fmt.Sprintf("[::]:%d", port))
    if err != nil {
        return nil, err
    }
    return &IPv6Server{listener: ln}, nil
}

func (s *IPv6Server) Serve(ctx context.Context) {
    go func() {
        <-ctx.Done()
        s.listener.Close()
    }()

    for {
        conn, err := s.listener.Accept()
        if err != nil {
            if ctx.Err() != nil {
                return  // Shutting down
            }
            continue
        }

        s.wg.Add(1)
        go func() {
            defer s.wg.Done()
            defer conn.Close()
            handleConnection(conn)
        }()
    }
}

func (s *IPv6Server) Wait() {
    s.wg.Wait()
}

func handleConnection(conn net.Conn) {
    io.Copy(conn, conn)
}

func main() {
    server, err := NewIPv6Server(8080)
    if err != nil {
        panic(err)
    }

    ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT)
    defer cancel()

    fmt.Println("IPv6 server started on [::]:8080")
    server.Serve(ctx)
    server.Wait()
    fmt.Println("Server stopped gracefully")
}
```

## Conclusion

Creating IPv6 TCP listeners in Go is straightforward: use `net.Listen("tcp6", "[::]:port")` for IPv6-only. A `net.Listen("tcp", "[::]:port")` listener on an unspecified address may accept both IPv4 and IPv6 on platforms that support IPv4-mapped IPv6 addresses; otherwise, use separate listeners. The `net.TCPAddr` type provides the client's IP address, port, and zone when applicable. Use `net/netip` for modern, efficient address handling and `context.Context` for graceful shutdown.
