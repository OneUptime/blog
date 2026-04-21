# How to Build a TCP Client in Go for IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, TCP, Client, IPv4, Networking, Net package

Description: Learn how to build a TCP client in Go that connects to an IPv4 server, sends data, and receives responses using the net package.

## Basic TCP Client

```go
package main

import (
    "bufio"
    "fmt"
    "log"
    "net"
)

func main() {
    // net.Dial("tcp4", ...) forces IPv4-only connection
    conn, err := net.Dial("tcp4", "127.0.0.1:9000")
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer conn.Close()

    log.Printf("Connected to %s", conn.RemoteAddr())

    // Send a message (conn implements io.Writer)
    message := "Hello, Go TCP server!\n"
    _, err = fmt.Fprint(conn, message)
    if err != nil {
        log.Fatalf("Failed to send: %v", err)
    }

    // Read the response line
    reader := bufio.NewReader(conn)
    response, err := reader.ReadString('\n')
    if err != nil {
        log.Fatalf("Failed to read: %v", err)
    }

    fmt.Printf("Server response: %s", response)
}
```

## Connecting with a Timeout

```go
package main

import (
    "fmt"
    "log"
    "net"
    "time"
)

func connectWithTimeout(host string, port string, timeout time.Duration) (net.Conn, error) {
    // DialTimeout sets a deadline for the connection attempt
    conn, err := net.DialTimeout("tcp4", net.JoinHostPort(host, port), timeout)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to %s:%s with timeout %v: %w", host, port, timeout, err)
    }
    return conn, nil
}

func main() {
    conn, err := connectWithTimeout("192.168.1.100", "9000", 5*time.Second)
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    // Set a read/write deadline for future I/O operations
    conn.SetDeadline(time.Now().Add(30 * time.Second))

    fmt.Fprintf(conn, "Hello!\n")

    buf := make([]byte, 1024)
    n, err := conn.Read(buf)
    if err != nil {
        log.Fatalf("Read error: %v", err)
    }
    fmt.Printf("Response: %s", buf[:n])
}
```

## Using net.Dialer for Advanced Options

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net"
    "time"
)

func main() {
    dialer := &net.Dialer{
        Timeout:   5 * time.Second,    // Connection timeout
        KeepAlive: 30 * time.Second,   // TCP keepalive interval

        // Use an IPv4 local address; "tcp4" below forces IPv4
        LocalAddr: &net.TCPAddr{
            IP:   net.ParseIP("0.0.0.0"),
            Port: 0,   // Let OS choose source port
        },
    }

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    conn, err := dialer.DialContext(ctx, "tcp4", "192.168.1.100:9000")
    if err != nil {
        log.Fatalf("Dial failed: %v", err)
    }
    defer conn.Close()

    fmt.Fprintf(conn, "Hello from dialer!\n")

    buf := make([]byte, 4096)
    n, _ := conn.Read(buf)
    fmt.Println(string(buf[:n]))
}
```

## Sending and Receiving Binary Data

```go
package main

import (
    "encoding/binary"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net"
)

// sendJSON sends a JSON-encoded message with a 4-byte length prefix
func sendJSON(conn net.Conn, data interface{}) error {
    payload, err := json.Marshal(data)
    if err != nil {
        return err
    }

    if err := binary.Write(conn, binary.BigEndian, uint32(len(payload))); err != nil {
        return err
    }
    _, err = conn.Write(payload)
    return err
}

// recvJSON reads a length-prefixed JSON message
func recvJSON(conn net.Conn, target interface{}) error {
    var msgLen uint32
    if err := binary.Read(conn, binary.BigEndian, &msgLen); err != nil {
        return err
    }
    buf := make([]byte, msgLen)
    if _, err := io.ReadFull(conn, buf); err != nil {
        return err
    }
    return json.Unmarshal(buf, target)
}

func main() {
    conn, err := net.Dial("tcp4", "127.0.0.1:9009")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    request := map[string]string{"action": "ping", "id": "client-1"}
    sendJSON(conn, request)

    var response map[string]interface{}
    recvJSON(conn, &response)
    fmt.Printf("Response: %v\n", response)
}
```

## Conclusion

Go's `net.Dial("tcp4", addr)` provides a simple, idiomatic way to make IPv4 TCP connections. Use `net.DialTimeout` for connection timeouts, `net.Dialer` for advanced options like keepalive, and `conn.SetDeadline` for read/write timeouts. `io.ReadFull` is the standard way to read an exact number of bytes.
