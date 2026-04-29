# How to Create IPv6 Sockets in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Socket, Networking, Net package, Socket Programming

Description: Create IPv6 TCP and UDP servers and clients in Go using the net package, with proper handling of dual-stack, IPv6-only, and link-local connections.

## Introduction

Go's `net` package abstracts socket creation through high-level types like `net.Listener`, `net.Conn`, and `net.PacketConn`. IPv6 support is built in - the key is using the right network string: `"tcp6"` for IPv6-only, and `"[::]:port"` for the wildcard bind address. With a wildcard listen address, `"tcp"` may create a dual-stack listener on platforms that support IPv4-mapped IPv6 sockets, but that behavior is OS-dependent.

## IPv6 TCP Server

```go
package main

import (
    "fmt"
    "io"
    "net"
    "os"
)

func main() {
    // "tcp6" = IPv6-only TCP
    // Use "tcp" with a wildcard address for OS-dependent dual-stack behavior
    listener, err := net.Listen("tcp6", "[::]:8080")
    if err != nil {
        fmt.Fprintf(os.Stderr, "Listen error: %v\n", err)
        os.Exit(1)
    }
    defer listener.Close()

    fmt.Println("IPv6 TCP server listening on [::]:8080")

    for {
        conn, err := listener.Accept()
        if err != nil {
            fmt.Fprintf(os.Stderr, "Accept error: %v\n", err)
            continue
        }
        go handleTCPConn(conn)
    }
}

func handleTCPConn(conn net.Conn) {
    defer conn.Close()

    // Extract host and port from the remote address
    remoteAddr := conn.RemoteAddr().String()
    host, port, err := net.SplitHostPort(remoteAddr)
    if err != nil {
        fmt.Println("Error parsing remote addr:", err)
        return
    }

    fmt.Printf("Connection from [%s]:%s\n", host, port)
    io.WriteString(conn, "Hello IPv6 client!\n")
}
```

## IPv6 TCP Client

```go
package main

import (
    "fmt"
    "io"
    "net"
    "os"
    "time"
)

func connectIPv6(addr string, port string) (net.Conn, error) {
    // net.JoinHostPort adds brackets around IPv6 addresses
    target := net.JoinHostPort(addr, port)

    // Dial with a timeout
    conn, err := net.DialTimeout("tcp6", target, 10*time.Second)
    if err != nil {
        return nil, fmt.Errorf("dial %s: %w", target, err)
    }
    return conn, nil
}

func main() {
    conn, err := connectIPv6("::1", "8080")
    if err != nil {
        fmt.Fprintln(os.Stderr, "Connection failed:", err)
        os.Exit(1)
    }
    defer conn.Close()

    fmt.Printf("Connected to %s\n", conn.RemoteAddr())

    // Read response
    response, err := io.ReadAll(conn)
    if err == nil {
        fmt.Printf("Server: %s", response)
    }
}
```

## IPv6 UDP Server and Client

```go
package main

import (
    "fmt"
    "net"
    "os"
)

func udpIPv6Server(port string) {
    // "udp6" for IPv6-only UDP
    addr, err := net.ResolveUDPAddr("udp6", "[::]:"+port)
    if err != nil {
        fmt.Fprintln(os.Stderr, err)
        return
    }

    conn, err := net.ListenUDP("udp6", addr)
    if err != nil {
        fmt.Fprintln(os.Stderr, err)
        return
    }
    defer conn.Close()
    fmt.Printf("UDP server listening on [::]:%s\n", port)

    buf := make([]byte, 4096)
    for {
        n, remoteAddr, err := conn.ReadFromUDP(buf)
        if err != nil {
            continue
        }

        fmt.Printf("Received %d bytes from [%s]:%d: %s\n",
            n, remoteAddr.IP, remoteAddr.Port, buf[:n])

        // Echo back
        conn.WriteToUDP([]byte("ACK"), remoteAddr)
    }
}

func udpIPv6Client(serverIP, port, message string) {
    serverAddr, err := net.ResolveUDPAddr("udp6",
        net.JoinHostPort(serverIP, port))
    if err != nil {
        fmt.Fprintln(os.Stderr, err)
        return
    }

    conn, err := net.DialUDP("udp6", nil, serverAddr)
    if err != nil {
        fmt.Fprintln(os.Stderr, err)
        return
    }
    defer conn.Close()

    conn.Write([]byte(message))

    buf := make([]byte, 1024)
    n, err := conn.Read(buf)
    if err == nil {
        fmt.Printf("Server replied: %s\n", buf[:n])
    }
}
```

## Dual-Stack Server (IPv4 and IPv6)

```go
package main

import (
    "fmt"
    "io"
    "net"
)

func dualStackServer(port string) error {
    // "tcp" with "[::]:port" may create a dual-stack listener when the OS
    // supports IPv4-mapped IPv6 sockets; otherwise use separate listeners
    listener, err := net.Listen("tcp", "[::]:"+port)
    if err != nil {
        return err
    }
    defer listener.Close()
    fmt.Printf("Dual-stack server on [::]:%s\n", port)

    for {
        conn, err := listener.Accept()
        if err != nil {
            continue
        }
        go func(c net.Conn) {
            defer c.Close()
            if remote, ok := c.RemoteAddr().(*net.TCPAddr); ok && remote.IP.To4() == nil {
                fmt.Printf("IPv6 client: %s\n", remote)
            } else {
                fmt.Printf("IPv4 client: %s\n", c.RemoteAddr())
            }
            io.WriteString(c, "Hello dual-stack client!\n")
        }(conn)
    }
}
```

## Link-Local Connections with Scope ID

```go
package main

import (
    "fmt"
    "net"
    "time"
)

func connectLinkLocal(addr, iface, port string) (net.Conn, error) {
    // Verify the interface exists
    _, err := net.InterfaceByName(iface)
    if err != nil {
        return nil, fmt.Errorf("interface %s not found: %w", iface, err)
    }

    // Build the address with zone ID for link-local
    // Go uses addr%interface notation for zone IDs
    target := fmt.Sprintf("[%s%%%s]:%s", addr, iface, port)
    return net.DialTimeout("tcp6", target, 10*time.Second)
}

// Example: connect to fe80::1 on interface eth0
// conn, err := connectLinkLocal("fe80::1", "eth0", "8080")
```

## Conclusion

Go's `net` package makes IPv6 socket programming straightforward. Use `"tcp6"` for IPv6-only listeners. A wildcard `"tcp"` listener such as `"[::]:port"` may accept both IPv4 and IPv6, depending on OS support for IPv4-mapped IPv6 sockets. The `net.JoinHostPort()` function correctly formats IPv6 addresses in brackets for host:port strings. `net.SplitHostPort()` correctly parses bracketed IPv6 from address strings, and the `%interface` zone ID syntax handles link-local address connections.
