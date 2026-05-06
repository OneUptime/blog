# How to Implement the Client-Server Pattern with IPv4 TCP in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, TCP, IPv4, Client-Server, Networking, Net

Description: Learn how to implement the client-server pattern with IPv4 TCP in Go using the net package, with goroutine-per-connection concurrency, length-prefixed framing, and graceful shutdown.

## Echo Server

```go
package main

import (
    "io"
    "log"
    "net"
    "os/signal"
    "context"
    "syscall"
)

func handle(conn net.Conn) {
    defer conn.Close()
    log.Printf("[+] %s", conn.RemoteAddr())
    io.Copy(conn, conn)   // echo: copy input back to output
    log.Printf("[-] %s", conn.RemoteAddr())
}

func main() {
    ln, err := net.Listen("tcp4", "0.0.0.0:9000")
    if err != nil {
        log.Fatal(err)
    }
    defer ln.Close()
    log.Println("Echo server on 0.0.0.0:9000")

    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
    defer stop()

    go func() {
        <-ctx.Done()
        ln.Close()  // unblock Accept()
    }()

    for {
        conn, err := ln.Accept()
        if err != nil {
            if ctx.Err() != nil { break }
            log.Printf("accept error: %v", err)
            continue
        }
        go handle(conn)
    }
}
```

## Echo Client

```go
package main

import (
    "bufio"
    "fmt"
    "log"
    "net"
)

func main() {
    conn, err := net.Dial("tcp4", "192.168.1.10:9000")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    fmt.Fprintln(conn, "Hello, server!")
    msg, err := bufio.NewReader(conn).ReadString('\n')
    if err != nil {
        log.Fatal(err)
    }
    fmt.Print("Server: ", msg)
}
```

## Length-Prefixed Framing

```go
package main

import (
    "encoding/binary"
    "io"
    "net"
)

// SendMsg writes a 4-byte big-endian length header followed by payload.
func SendMsg(conn net.Conn, payload []byte) error {
    header := make([]byte, 4)
    binary.BigEndian.PutUint32(header, uint32(len(payload)))
    if _, err := conn.Write(header); err != nil { return err }
    _, err := conn.Write(payload)
    return err
}

// RecvMsg reads the 4-byte header then reads exactly that many bytes.
func RecvMsg(conn net.Conn) ([]byte, error) {
    header := make([]byte, 4)
    if _, err := io.ReadFull(conn, header); err != nil { return nil, err }
    size := binary.BigEndian.Uint32(header)
    body := make([]byte, size)
    _, err := io.ReadFull(conn, body)
    return body, err
}
```

## Request-Reply Server

```go
package main

import (
    "encoding/json"
    "log"
    "net"
)

type Request  struct { Action string `json:"action"` }
type Response struct { Status string `json:"status"` }

func handleConn(conn net.Conn) {
    defer conn.Close()
    enc := json.NewEncoder(conn)
    dec := json.NewDecoder(conn)

    for {
        var req Request
        if err := dec.Decode(&req); err != nil { return }
        log.Printf("Request: %s", req.Action)
        if err := enc.Encode(Response{Status: "ok"}); err != nil { return }
    }
}

func main() {
    ln, err := net.Listen("tcp4", "0.0.0.0:9000")
    if err != nil {
        log.Fatal(err)
    }
    defer ln.Close()
    for {
        conn, err := ln.Accept()
        if err != nil { break }
        go handleConn(conn)
    }
}
```

## Conclusion

Go's `net.Listen("tcp4", addr)` creates a listener restricted to IPv4. Spawn a goroutine per connection - goroutines are lightweight and their stacks start small and grow as needed, so thousands of concurrent connections are practical. Use `io.ReadFull` for framed reads to ensure complete messages even when data arrives in fragments. Cancel the listener from a `context.Context` signal handler (`ln.Close()`) to unblock `Accept()` and trigger a clean shutdown. For large payloads, use `bufio.Reader`/`bufio.Writer` to reduce system call overhead.
