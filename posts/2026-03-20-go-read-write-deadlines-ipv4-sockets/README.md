# How to Set Read and Write Deadlines on IPv4 Sockets in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Socket, IPv4, TCP, Networking, Deadlines, Timeout

Description: Configure read and write deadlines on Go TCP connections over IPv4 to prevent goroutine leaks and unresponsive connections from hanging indefinitely.

## Introduction

Network connections can hang forever if a remote peer stops sending data or becomes unresponsive. Go's `net.Conn` interface provides `SetReadDeadline`, `SetWriteDeadline`, and `SetDeadline` methods to set absolute I/O deadlines so blocked operations eventually fail instead of hanging indefinitely, ensuring your application stays responsive.

## Basic Deadline Usage

```go
package main

import (
    "errors"
    "fmt"
    "net"
    "os"
    "time"
)

func connectWithDeadlines(address string) error {
    // Establish a TCP connection with a 5-second connection timeout
    conn, err := net.DialTimeout("tcp4", address, 5*time.Second)
    if err != nil {
        return fmt.Errorf("connect failed: %w", err)
    }
    defer conn.Close()

    // Set a write deadline: we must finish writing within 5 seconds
    if err := conn.SetWriteDeadline(time.Now().Add(5 * time.Second)); err != nil {
        return fmt.Errorf("set write deadline: %w", err)
    }

    // Send a request
    _, err = conn.Write([]byte("GET / HTTP/1.0\r\nHost: example.com\r\n\r\n"))
    if err != nil {
        return fmt.Errorf("write failed: %w", err)
    }

    // Set a read deadline: give the server 10 seconds to send data back
    if err := conn.SetReadDeadline(time.Now().Add(10 * time.Second)); err != nil {
        return fmt.Errorf("set read deadline: %w", err)
    }

    // Read the response (will return error if 10s read deadline expires)
    buf := make([]byte, 4096)
    n, err := conn.Read(buf)
    if err != nil {
        if errors.Is(err, os.ErrDeadlineExceeded) {
            return fmt.Errorf("read timeout: server did not respond in time")
        }
        return fmt.Errorf("read failed: %w", err)
    }

    fmt.Printf("Received %d bytes: %s\n", n, buf[:n])
    return nil
}
```

## Using SetDeadline (Combined Read+Write)

```go
// SetDeadline sets both read and write deadlines simultaneously
conn.SetDeadline(time.Now().Add(30 * time.Second))
```

## Resetting Deadlines in a Loop

For long-lived connections that exchange multiple messages, reset the deadline before each operation:

```go
func handleConnection(conn net.Conn) {
    defer conn.Close()
    buf := make([]byte, 1024)

    for {
        // Reset read deadline for each message (30 seconds to receive next message)
        conn.SetReadDeadline(time.Now().Add(30 * time.Second))

        n, err := conn.Read(buf)
        if err != nil {
            if errors.Is(err, os.ErrDeadlineExceeded) {
                fmt.Println("Connection idle timeout - closing")
            } else {
                fmt.Printf("Read error: %v\n", err)
            }
            return
        }

        // Process message...
        message := string(buf[:n])
        fmt.Printf("Received: %s\n", message)

        // Reset write deadline and respond
        conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
        if _, err := conn.Write([]byte("ACK\n")); err != nil {
            fmt.Printf("Write error: %v\n", err)
            return
        }
    }
}
```

## Server Example with Per-Connection Deadlines

```go
package main

import (
    "errors"
    "fmt"
    "net"
    "os"
    "time"
)

func main() {
    // Listen on IPv4 only
    ln, err := net.Listen("tcp4", ":8080")
    if err != nil {
        panic(err)
    }
    defer ln.Close()
    fmt.Println("Listening on :8080")

    for {
        conn, err := ln.Accept()
        if err != nil {
            fmt.Printf("Accept error: %v\n", err)
            continue
        }
        go handleConnectionWithTimeout(conn)
    }
}

func handleConnectionWithTimeout(conn net.Conn) {
    defer conn.Close()

    // Total connection deadline: 60 seconds for the entire session
    conn.SetDeadline(time.Now().Add(60 * time.Second))

    buf := make([]byte, 512)
    n, err := conn.Read(buf)
    if err != nil {
        if errors.Is(err, os.ErrDeadlineExceeded) {
            fmt.Printf("Client %s timed out\n", conn.RemoteAddr())
        }
        return
    }

    fmt.Printf("Request from %s: %s\n", conn.RemoteAddr(), buf[:n])
    conn.Write([]byte("HTTP/1.0 200 OK\r\nContent-Length: 5\r\n\r\nHello"))
}
```

## Canceling Deadlines

To remove a deadline (allow indefinite blocking again):

```go
// Clear the read deadline
conn.SetReadDeadline(time.Time{})

// Clear all deadlines
conn.SetDeadline(time.Time{})
```

## Conclusion

Always set deadlines on production Go network connections. Without them, goroutines block forever on unresponsive peers, causing goroutine leaks and eventual memory exhaustion. The pattern of resetting the deadline before each read/write operation in a loop is the standard approach for long-lived protocol connections.
