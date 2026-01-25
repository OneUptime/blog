# How to Implement Custom Binary Protocols Over TCP in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, TCP, Binary Protocol, Networking, Low-Level

Description: Learn how to design and implement custom binary protocols over TCP in Go for high-performance network communication, with practical examples covering message framing, serialization, and connection handling.

---

When you need maximum control over network communication, HTTP and JSON are not always the right choice. Custom binary protocols give you smaller payloads, faster parsing, and complete control over the wire format. Go's standard library makes this surprisingly straightforward.

This guide walks through building a working binary protocol from scratch, covering the key patterns you will need in production systems.

## Why Binary Protocols?

Before diving into code, it helps to understand when binary protocols make sense:

- **Performance-critical systems** where JSON parsing overhead matters
- **Bandwidth-constrained environments** like IoT or mobile networks
- **Real-time applications** like games, trading systems, or telemetry
- **Interoperability** with existing systems that speak a specific binary format

The tradeoff is complexity. You lose the human readability of text protocols and need to handle versioning carefully. But for the right use cases, the performance gains justify the effort.

## Designing the Message Format

Every binary protocol needs a way to frame messages. Without framing, the receiver cannot tell where one message ends and another begins. TCP is a stream protocol - it does not preserve message boundaries.

The most common approach is a length-prefixed format:

```
+----------------+----------------+
| Length (4 bytes) | Payload       |
+----------------+----------------+
```

Here is a more complete header for a real protocol:

```
+----------+----------+----------+------------------+
| Magic (2) | Version (1) | Type (1) | Length (4)    | Payload |
+----------+----------+----------+------------------+---------+
```

The magic bytes help identify protocol traffic and catch framing errors. Version allows protocol evolution. Type indicates the message kind.

## Building the Protocol Layer

Let's implement this step by step. First, define the message structure and constants:

```go
package protocol

import (
    "encoding/binary"
    "errors"
    "io"
)

const (
    MagicByte1     = 0xCA
    MagicByte2     = 0xFE
    HeaderSize     = 8
    MaxPayloadSize = 1 << 20 // 1MB limit
    ProtocolVersion = 1
)

// Message types
const (
    TypePing     uint8 = 1
    TypePong     uint8 = 2
    TypeData     uint8 = 3
    TypeAck      uint8 = 4
    TypeError    uint8 = 5
)

var (
    ErrInvalidMagic   = errors.New("invalid magic bytes")
    ErrPayloadTooLarge = errors.New("payload exceeds maximum size")
    ErrUnsupportedVersion = errors.New("unsupported protocol version")
)

type Message struct {
    Version uint8
    Type    uint8
    Payload []byte
}
```

## Encoding Messages

The encoder writes the header followed by the payload. Using `encoding/binary` keeps the byte order consistent:

```go
// Encode writes a message to the given writer
func Encode(w io.Writer, msg *Message) error {
    header := make([]byte, HeaderSize)

    // Magic bytes for protocol identification
    header[0] = MagicByte1
    header[1] = MagicByte2

    // Version and message type
    header[2] = msg.Version
    header[3] = msg.Type

    // Payload length in big-endian format
    binary.BigEndian.PutUint32(header[4:8], uint32(len(msg.Payload)))

    // Write header first
    if _, err := w.Write(header); err != nil {
        return err
    }

    // Write payload if present
    if len(msg.Payload) > 0 {
        if _, err := w.Write(msg.Payload); err != nil {
            return err
        }
    }

    return nil
}
```

## Decoding Messages

The decoder reads the fixed-size header first, validates it, then reads exactly the number of bytes specified in the length field:

```go
// Decode reads a message from the given reader
func Decode(r io.Reader) (*Message, error) {
    header := make([]byte, HeaderSize)

    // Read the complete header
    if _, err := io.ReadFull(r, header); err != nil {
        return nil, err
    }

    // Validate magic bytes
    if header[0] != MagicByte1 || header[1] != MagicByte2 {
        return nil, ErrInvalidMagic
    }

    version := header[2]
    if version != ProtocolVersion {
        return nil, ErrUnsupportedVersion
    }

    msgType := header[3]
    payloadLen := binary.BigEndian.Uint32(header[4:8])

    // Guard against memory exhaustion attacks
    if payloadLen > MaxPayloadSize {
        return nil, ErrPayloadTooLarge
    }

    // Read the payload
    payload := make([]byte, payloadLen)
    if payloadLen > 0 {
        if _, err := io.ReadFull(r, payload); err != nil {
            return nil, err
        }
    }

    return &Message{
        Version: version,
        Type:    msgType,
        Payload: payload,
    }, nil
}
```

The `io.ReadFull` function is essential here. A regular `Read` call might return fewer bytes than requested if the data arrives in chunks. `ReadFull` blocks until all bytes are read or an error occurs.

## Building the Server

With encoding and decoding in place, the server becomes straightforward:

```go
package main

import (
    "log"
    "net"
    "protocol" // import your protocol package
)

func handleConnection(conn net.Conn) {
    defer conn.Close()

    for {
        msg, err := protocol.Decode(conn)
        if err != nil {
            if err != io.EOF {
                log.Printf("decode error: %v", err)
            }
            return
        }

        // Handle different message types
        switch msg.Type {
        case protocol.TypePing:
            response := &protocol.Message{
                Version: protocol.ProtocolVersion,
                Type:    protocol.TypePong,
                Payload: nil,
            }
            if err := protocol.Encode(conn, response); err != nil {
                log.Printf("encode error: %v", err)
                return
            }

        case protocol.TypeData:
            // Process the data payload
            processData(msg.Payload)

            // Send acknowledgment
            ack := &protocol.Message{
                Version: protocol.ProtocolVersion,
                Type:    protocol.TypeAck,
                Payload: nil,
            }
            protocol.Encode(conn, ack)
        }
    }
}

func main() {
    listener, err := net.Listen("tcp", ":9000")
    if err != nil {
        log.Fatal(err)
    }
    defer listener.Close()

    log.Println("Server listening on :9000")

    for {
        conn, err := listener.Accept()
        if err != nil {
            log.Printf("accept error: %v", err)
            continue
        }
        go handleConnection(conn)
    }
}
```

## Building the Client

The client mirrors the server logic:

```go
package main

import (
    "log"
    "net"
    "protocol"
)

func main() {
    conn, err := net.Dial("tcp", "localhost:9000")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    // Send a ping
    ping := &protocol.Message{
        Version: protocol.ProtocolVersion,
        Type:    protocol.TypePing,
        Payload: nil,
    }

    if err := protocol.Encode(conn, ping); err != nil {
        log.Fatal(err)
    }

    // Wait for pong
    response, err := protocol.Decode(conn)
    if err != nil {
        log.Fatal(err)
    }

    if response.Type == protocol.TypePong {
        log.Println("Received pong from server")
    }

    // Send some data
    data := &protocol.Message{
        Version: protocol.ProtocolVersion,
        Type:    protocol.TypeData,
        Payload: []byte("Hello, binary world!"),
    }
    protocol.Encode(conn, data)
}
```

## Production Considerations

A few things matter when moving to production:

**Timeouts** - Set read and write deadlines to prevent hung connections:

```go
conn.SetReadDeadline(time.Now().Add(30 * time.Second))
msg, err := protocol.Decode(conn)
```

**Connection pooling** - For clients making many requests, reuse connections rather than opening new ones for each message.

**Buffered I/O** - Wrap connections with `bufio.Reader` and `bufio.Writer` to reduce system calls:

```go
reader := bufio.NewReader(conn)
writer := bufio.NewWriter(conn)

msg, err := protocol.Decode(reader)
protocol.Encode(writer, response)
writer.Flush() // Do not forget to flush
```

**Checksums** - For unreliable networks, add a CRC32 or similar checksum to detect corruption.

**Protocol versioning** - Plan for backwards compatibility from the start. The version byte in the header enables graceful upgrades.

## Performance Comparison

In benchmarks against JSON over HTTP, a well-designed binary protocol typically shows:

- 5-10x smaller message sizes for structured data
- 3-5x faster serialization and deserialization
- Lower memory allocations per message
- Reduced CPU usage under load

The exact numbers depend heavily on your payload structure and access patterns. Profile your specific use case before committing to a binary protocol.

## Wrapping Up

Custom binary protocols are not complicated once you understand the fundamentals: frame your messages with length prefixes, use `io.ReadFull` for reading exact byte counts, validate input aggressively, and handle errors at every step.

Go's standard library provides everything you need. The `encoding/binary` package handles byte order, `net` gives you TCP primitives, and `io` interfaces make the code composable.

Start with the simplest design that works, then add complexity only where measurements show it is needed.
