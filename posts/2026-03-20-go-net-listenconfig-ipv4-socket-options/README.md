# How to Use Go net.ListenConfig to Customize IPv4 Socket Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Net.ListenConfig, IPv4, Socket Options, Networking, TCP, Syscalls

Description: Use Go's net.ListenConfig with a Control function to set low-level IPv4 socket options like SO_REUSEPORT, TCP_FASTOPEN, and SO_KEEPALIVE before binding a listener.

## Introduction

Go's standard `net.Listen` creates a TCP listener with sensible defaults, but sometimes you need to customize socket options - for example, enabling `SO_REUSEPORT` for multi-process servers, `TCP_FASTOPEN` for reduced latency on supported systems, or `SO_RCVBUF`/`SO_SNDBUF` for high-throughput servers. `net.ListenConfig` with a `Control` function provides this capability.

## Basic ListenConfig Usage

```go
package main

import (
    "context"
    "fmt"
    "net"
    "syscall"

    "golang.org/x/sys/unix"
)

func main() {
    // Create a ListenConfig with a Control function
    lc := net.ListenConfig{
        Control: func(network, address string, conn syscall.RawConn) error {
            var setsockoptErr error
            
            err := conn.Control(func(fd uintptr) {
                // Enable SO_REUSEPORT: allow multiple sockets to bind to the same port
                // Useful for multi-process servers (e.g., running multiple Go processes)
                setsockoptErr = unix.SetsockoptInt(
                    int(fd),
                    unix.SOL_SOCKET,
                    unix.SO_REUSEPORT,
                    1,
                )
            })
            
            if err != nil {
                return err
            }
            return setsockoptErr
        },
    }

    // Create the listener using the configured options
    ln, err := lc.Listen(context.Background(), "tcp4", ":8080")
    if err != nil {
        panic(err)
    }
    defer ln.Close()

    fmt.Println("Listening on :8080 with SO_REUSEPORT enabled")
    // Accept connections...
}
```

## Setting Multiple Socket Options

```go
package main

import (
    "context"
    "net"
    "syscall"
    "time"

    "golang.org/x/sys/unix"
)

func createOptimizedListener(address string) (net.Listener, error) {
    lc := net.ListenConfig{
        Control: func(network, address string, conn syscall.RawConn) error {
            var setsockoptErr error

            err := conn.Control(func(fd uintptr) {
                fdInt := int(fd)

                // SO_REUSEADDR: allow rebinding to a recently used port
                if setsockoptErr = unix.SetsockoptInt(fdInt, unix.SOL_SOCKET, unix.SO_REUSEADDR, 1); setsockoptErr != nil {
                    return
                }

                // SO_REUSEPORT: allow multiple listeners on the same port
                if setsockoptErr = unix.SetsockoptInt(fdInt, unix.SOL_SOCKET, unix.SO_REUSEPORT, 1); setsockoptErr != nil {
                    return
                }

                // TCP_FASTOPEN: enable Fast Open on the listener (Linux); value is the queue length
                if setsockoptErr = unix.SetsockoptInt(fdInt, unix.IPPROTO_TCP, unix.TCP_FASTOPEN, 16); setsockoptErr != nil {
                    return
                }

                // SO_RCVBUF: increase receive buffer (bytes) for high-throughput servers
                if setsockoptErr = unix.SetsockoptInt(fdInt, unix.SOL_SOCKET, unix.SO_RCVBUF, 4*1024*1024); setsockoptErr != nil {
                    return
                }

                // SO_SNDBUF: increase send buffer
                setsockoptErr = unix.SetsockoptInt(fdInt, unix.SOL_SOCKET, unix.SO_SNDBUF, 4*1024*1024)
            })

            if err != nil {
                return err
            }
            return setsockoptErr
        },
        // Set keepalive period for accepted connections
        KeepAlive: 30 * time.Second,
    }

    return lc.Listen(context.Background(), "tcp4", address)
}
```

## Enabling TCP Keep-Alive

```go
lc := net.ListenConfig{
    // Built-in keepalive support (no raw socket required)
    KeepAlive: 30 * time.Second,
}

ln, err := lc.Listen(context.Background(), "tcp4", ":9090")
```

For more control over keep-alive parameters (idle time, interval, probes), use `ListenConfig.KeepAliveConfig` (Go 1.23+):

```go
lc := net.ListenConfig{
    KeepAliveConfig: net.KeepAliveConfig{
        Enable:   true,
        Idle:     60 * time.Second,
        Interval: 10 * time.Second,
        Count:    5,
    },
}

ln, err := lc.Listen(context.Background(), "tcp4", ":9090")
```

## Dialing with Custom Socket Options

Use `net.Dialer.Control` for the client side:

```go
dialer := &net.Dialer{
    Timeout:   5 * time.Second,
    KeepAlive: 30 * time.Second,
    Control: func(network, address string, conn syscall.RawConn) error {
        var setsockoptErr error

        err := conn.Control(func(fd uintptr) {
            // Set IPv4 TOS for QoS marking on client connections
            setsockoptErr = unix.SetsockoptInt(int(fd), unix.IPPROTO_IP, unix.IP_TOS, 0x10) // IPTOS_LOWDELAY
        })

        if err != nil {
            return err
        }
        return setsockoptErr
    },
}

conn, err := dialer.DialContext(context.Background(), "tcp4", "10.0.0.1:8080")
```

## Conclusion

`net.ListenConfig`, `net.KeepAliveConfig`, and `net.Dialer.Control` give you fine-grained control over IPv4 socket options in Go without creating the listener manually. Use `Control` for OS-specific options such as `SO_REUSEPORT`, `TCP_FASTOPEN`, and buffer sizes, and use `KeepAlive` or `KeepAliveConfig` to tune TCP keep-alive behavior.
