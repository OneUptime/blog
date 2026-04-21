# How to Create a TCP Server in Go That Listens on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, TCP, Socket, IPv4, Networking, Server

Description: Learn how to build a TCP server in Go that listens on an IPv4 address using the net package to accept and handle client connections.

## TCP Server in Go

Go's `net` package provides a clean, high-level API for TCP networking. Creating a server involves `net.Listen()`, `Accept()` in a loop, and goroutines for concurrent client handling.

## Basic Echo TCP Server

```go
package main

import (
    "bufio"
    "fmt"
    "log"
    "net"
)

func handleClient(conn net.Conn) {
    defer conn.Close()
    addr := conn.RemoteAddr().String()
    log.Printf("Client connected: %s", addr)

    // bufio.Scanner reads line-delimited input efficiently
    scanner := bufio.NewScanner(conn)
    for scanner.Scan() {
        line := scanner.Text()
        log.Printf("[%s] Received: %s", addr, line)

        // Echo the line back with a newline
        fmt.Fprintf(conn, "%s\n", line)
    }

    if err := scanner.Err(); err != nil {
        log.Printf("[%s] Read error: %v", addr, err)
    }

    log.Printf("Client disconnected: %s", addr)
}

func main() {
    // "tcp4" restricts the listener to IPv4 only
    listener, err := net.Listen("tcp4", "0.0.0.0:9000")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }
    defer listener.Close()

    log.Printf("TCP server listening on %s", listener.Addr())

    for {
        conn, err := listener.Accept()
        if err != nil {
            log.Printf("Accept error: %v", err)
            continue
        }
        // Handle each client in its own goroutine
        go handleClient(conn)
    }
}
```

## Listening on a Specific IPv4 Address

```go
// Listen on a specific interface instead of all interfaces
listener, err := net.Listen("tcp4", "192.168.1.50:9000")
```

Use `0.0.0.0:9000` to accept on all interfaces, or a specific IP to restrict.

## Reading Length-Prefixed Binary Data

```go
import (
    "encoding/binary"
    "io"
    "net"
)

func readMessage(conn net.Conn) ([]byte, error) {
    // Read 4-byte length prefix
    var msgLen uint32
    if err := binary.Read(conn, binary.BigEndian, &msgLen); err != nil {
        return nil, err
    }

    // Read exactly msgLen bytes
    buf := make([]byte, msgLen)
    if _, err := io.ReadFull(conn, buf); err != nil {
        return nil, err
    }
    return buf, nil
}

func writeMessage(conn net.Conn, data []byte) error {
    // Write 4-byte length prefix
    if err := binary.Write(conn, binary.BigEndian, uint32(len(data))); err != nil {
        return err
    }
    _, err := conn.Write(data)
    return err
}
```

## Setting Read Deadlines

```go
import (
    "net"
    "time"
)

func handleClientWithDeadline(conn net.Conn) {
    defer conn.Close()

    // Set a 30-second read deadline; reset on each successful read
    buf := make([]byte, 4096)
    for {
        conn.SetReadDeadline(time.Now().Add(30 * time.Second))
        n, err := conn.Read(buf)
        if err != nil {
            break
        }
        conn.Write(buf[:n])
    }
}
```

## Graceful Server Shutdown

```go
import (
    "context"
    "log"
    "net"
    "os/signal"
    "sync"
    "syscall"
)

func main() {
    listener, err := net.Listen("tcp4", ":9000")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    var wg sync.WaitGroup

    go func() {
        <-ctx.Done()
        log.Println("Shutting down...")
        listener.Close()
    }()

    for {
        conn, err := listener.Accept()
        if err != nil {
            if ctx.Err() != nil {
                break
            }
            log.Printf("Accept error: %v", err)
            continue
        }
        wg.Add(1)
        go func(conn net.Conn) {
            defer wg.Done()
            handleClient(conn)
        }(conn)
    }
    wg.Wait()
    log.Println("Server stopped")
}
```

## Conclusion

Go makes TCP server development straightforward with `net.Listen("tcp4", addr)` and goroutines for concurrency. Use `io.ReadFull` for reading exact byte counts, set deadlines with `SetReadDeadline`, and close the listener and wait for handlers on SIGTERM for graceful shutdown. Go's lightweight goroutines can handle tens of thousands of concurrent connections.
