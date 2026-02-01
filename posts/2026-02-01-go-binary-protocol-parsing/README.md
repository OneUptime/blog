# How to Handle Binary Protocol Parsing in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Binary, Parsing, Protocols, Networking, encoding/binary

Description: A practical guide to parsing and encoding binary protocols in Go using encoding/binary and bytes packages.

---

Binary protocols are everywhere. From network packets to file formats, database wire protocols to IoT sensor data, understanding how to parse and encode binary data is a fundamental skill. Go ships with excellent standard library support for this through the `encoding/binary` and `bytes` packages. This guide walks through practical patterns for handling binary protocols in production Go code.

## Understanding Byte Order (Endianness)

Before touching any code, you need to understand endianness. When a multi-byte value like a 32-bit integer gets stored in memory or transmitted over a network, the bytes can be arranged in two ways:

- **Big Endian**: Most significant byte first (network byte order)
- **Little Endian**: Least significant byte first (x86 processors use this)

The number `0x12345678` stored in 4 bytes looks different depending on endianness:

```
Big Endian:    [0x12] [0x34] [0x56] [0x78]
Little Endian: [0x78] [0x56] [0x34] [0x12]
```

Network protocols typically use big endian (hence "network byte order"), while most modern CPUs use little endian. Getting this wrong means your parser will produce garbage values. The `encoding/binary` package provides `binary.BigEndian` and `binary.LittleEndian` to handle both.

## Reading Fixed-Size Values

The simplest case is reading fixed-size integers from a byte slice. The `encoding/binary` package provides direct functions for this.

This example shows how to read different integer types from a byte buffer:

```go
package main

import (
    "encoding/binary"
    "fmt"
)

func main() {
    // Sample binary data - imagine this came from a network socket
    data := []byte{0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07}
    
    // Read a 16-bit unsigned integer from the first 2 bytes
    // Using big endian byte order (most significant byte first)
    val16 := binary.BigEndian.Uint16(data[0:2])
    fmt.Printf("16-bit value: %d (0x%04x)\n", val16, val16)
    
    // Read a 32-bit unsigned integer from bytes 0-3
    val32 := binary.BigEndian.Uint32(data[0:4])
    fmt.Printf("32-bit value: %d (0x%08x)\n", val32, val32)
    
    // Read a 64-bit unsigned integer from all 8 bytes
    val64 := binary.BigEndian.Uint64(data[0:8])
    fmt.Printf("64-bit value: %d (0x%016x)\n", val64, val64)
}
```

These functions panic if the slice is too short, so always validate your input length first in production code.

## Writing Fixed-Size Values

Writing works the same way in reverse. You allocate a byte slice and use the `Put` methods.

This example demonstrates encoding integers back into binary format:

```go
package main

import (
    "encoding/binary"
    "fmt"
)

func main() {
    // Create a buffer to hold our encoded data
    buf := make([]byte, 8)
    
    // Write a 32-bit value at offset 0
    binary.BigEndian.PutUint32(buf[0:4], 0xDEADBEEF)
    
    // Write a 16-bit value at offset 4
    binary.BigEndian.PutUint16(buf[4:6], 0xCAFE)
    
    // Write another 16-bit value at offset 6
    binary.BigEndian.PutUint16(buf[6:8], 0xBABE)
    
    fmt.Printf("Encoded bytes: %x\n", buf)
    // Output: deadbeefcafebabe
}
```

## Parsing Structs with binary.Read

For more complex protocols with multiple fields, manually slicing bytes gets tedious. The `binary.Read` function can populate a struct directly from an `io.Reader`.

This example parses a simple packet header into a struct:

```go
package main

import (
    "bytes"
    "encoding/binary"
    "fmt"
    "log"
)

// PacketHeader represents a fixed-size protocol header
// All fields must be fixed-size types - no slices, strings, or maps
type PacketHeader struct {
    Version    uint8
    Type       uint8
    Length     uint16
    SequenceID uint32
    Timestamp  uint64
}

func main() {
    // Simulated binary packet data (16 bytes total)
    rawData := []byte{
        0x01,                   // Version: 1
        0x02,                   // Type: 2
        0x00, 0x40,             // Length: 64 (big endian)
        0x00, 0x00, 0x00, 0x0A, // SequenceID: 10 (big endian)
        0x00, 0x00, 0x01, 0x8D, // Timestamp (big endian)
        0x9A, 0x5B, 0xC8, 0x00, // ...continued
    }
    
    // Create a reader from the byte slice
    reader := bytes.NewReader(rawData)
    
    // Parse directly into the struct
    var header PacketHeader
    err := binary.Read(reader, binary.BigEndian, &header)
    if err != nil {
        log.Fatalf("failed to parse header: %v", err)
    }
    
    fmt.Printf("Version: %d\n", header.Version)
    fmt.Printf("Type: %d\n", header.Type)
    fmt.Printf("Length: %d\n", header.Length)
    fmt.Printf("SequenceID: %d\n", header.SequenceID)
    fmt.Printf("Timestamp: %d\n", header.Timestamp)
}
```

Important constraints: the struct can only contain fixed-size types. No `string`, `[]byte`, or `int` (use `int32` or `int64` instead). The `int` type has platform-dependent size, which breaks binary encoding.

## Writing Structs with binary.Write

The reverse operation uses `binary.Write` to encode a struct into bytes.

This example encodes a header struct back to binary:

```go
package main

import (
    "bytes"
    "encoding/binary"
    "fmt"
    "log"
)

type PacketHeader struct {
    Version    uint8
    Type       uint8
    Length     uint16
    SequenceID uint32
    Timestamp  uint64
}

func main() {
    header := PacketHeader{
        Version:    1,
        Type:       3,
        Length:     128,
        SequenceID: 42,
        Timestamp:  1706745600000,
    }
    
    // Create a buffer to write into
    buf := new(bytes.Buffer)
    
    // Encode the struct
    err := binary.Write(buf, binary.BigEndian, &header)
    if err != nil {
        log.Fatalf("failed to encode header: %v", err)
    }
    
    fmt.Printf("Encoded: %x\n", buf.Bytes())
    fmt.Printf("Length: %d bytes\n", buf.Len())
}
```

## Handling Variable-Length Data

Real protocols rarely consist of just fixed-size headers. You typically have a length field followed by variable-length payload data. This requires a two-phase approach: parse the header to get the length, then read that many bytes.

This example shows how to parse a message with a variable-length payload:

```go
package main

import (
    "bytes"
    "encoding/binary"
    "fmt"
    "io"
    "log"
)

// Message has a fixed header followed by variable payload
type Message struct {
    Type       uint8
    PayloadLen uint16
    Payload    []byte
}

func ParseMessage(r io.Reader) (*Message, error) {
    msg := &Message{}
    
    // Read the fixed-size fields first (3 bytes total)
    // We read into a small buffer to avoid multiple syscalls
    headerBuf := make([]byte, 3)
    _, err := io.ReadFull(r, headerBuf)
    if err != nil {
        return nil, fmt.Errorf("reading header: %w", err)
    }
    
    // Parse header fields
    msg.Type = headerBuf[0]
    msg.PayloadLen = binary.BigEndian.Uint16(headerBuf[1:3])
    
    // Now read the variable-length payload
    // Sanity check the length to avoid allocating huge buffers
    if msg.PayloadLen > 65000 {
        return nil, fmt.Errorf("payload too large: %d", msg.PayloadLen)
    }
    
    msg.Payload = make([]byte, msg.PayloadLen)
    _, err = io.ReadFull(r, msg.Payload)
    if err != nil {
        return nil, fmt.Errorf("reading payload: %w", err)
    }
    
    return msg, nil
}

func main() {
    // Sample message: type=1, payload="Hello, Binary!"
    testData := []byte{
        0x01,       // Type
        0x00, 0x0E, // PayloadLen: 14 (big endian)
    }
    testData = append(testData, []byte("Hello, Binary!")...)
    
    reader := bytes.NewReader(testData)
    msg, err := ParseMessage(reader)
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Type: %d\n", msg.Type)
    fmt.Printf("Payload: %s\n", string(msg.Payload))
}
```

Notice the use of `io.ReadFull` instead of the plain `Read` method. The `Read` method can return fewer bytes than requested, which would corrupt your parsing. `io.ReadFull` blocks until it reads exactly the requested number of bytes or hits an error.

## Buffer Management for High Throughput

When parsing thousands of messages per second, allocating new byte slices for each message kills performance. Use buffer pools to recycle memory.

This example demonstrates efficient buffer pooling:

```go
package main

import (
    "bytes"
    "encoding/binary"
    "fmt"
    "io"
    "sync"
)

// Pool for reusing header buffers
var headerPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 16) // Size of our largest header
    },
}

// Pool for reusing payload buffers - use for common payload sizes
var payloadPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 1024)
    },
}

type Parser struct {
    reader io.Reader
}

func (p *Parser) ParseHeader() (msgType uint8, length uint16, err error) {
    // Get a buffer from the pool instead of allocating
    buf := headerPool.Get().([]byte)
    defer headerPool.Put(buf)
    
    // Read exactly 3 bytes for our header
    _, err = io.ReadFull(p.reader, buf[:3])
    if err != nil {
        return 0, 0, err
    }
    
    msgType = buf[0]
    length = binary.BigEndian.Uint16(buf[1:3])
    return msgType, length, nil
}

func (p *Parser) ParsePayload(length uint16) ([]byte, error) {
    // For small payloads, try to use pooled buffer
    // For large ones, allocate fresh to avoid holding huge buffers in pool
    var buf []byte
    if length <= 1024 {
        poolBuf := payloadPool.Get().([]byte)
        buf = poolBuf[:length]
        // Note: caller must return this to pool when done
    } else {
        buf = make([]byte, length)
    }
    
    _, err := io.ReadFull(p.reader, buf)
    if err != nil {
        return nil, err
    }
    return buf, nil
}

func main() {
    data := []byte{0x05, 0x00, 0x05, 'h', 'e', 'l', 'l', 'o'}
    parser := &Parser{reader: bytes.NewReader(data)}
    
    msgType, length, err := parser.ParseHeader()
    if err != nil {
        panic(err)
    }
    
    payload, err := parser.ParsePayload(length)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("Type: %d, Payload: %s\n", msgType, payload)
}
```

The `sync.Pool` automatically manages buffer lifecycle. Buffers get recycled when possible and garbage collected when the pool grows too large.

## Robust Error Handling

Production parsers need to handle malformed input gracefully. Never trust incoming data.

This example shows defensive parsing with proper error handling:

```go
package main

import (
    "encoding/binary"
    "errors"
    "fmt"
    "io"
)

var (
    ErrBufferTooShort  = errors.New("buffer too short")
    ErrInvalidVersion  = errors.New("unsupported protocol version")
    ErrPayloadTooLarge = errors.New("payload exceeds maximum size")
    ErrInvalidChecksum = errors.New("checksum mismatch")
)

const (
    MaxPayloadSize    = 1 << 20 // 1 MB max payload
    SupportedVersion  = 2
    MinPacketSize     = 8 // Minimum valid packet size
)

type Packet struct {
    Version  uint8
    Flags    uint8
    Length   uint32
    Checksum uint16
    Payload  []byte
}

func ParsePacket(data []byte) (*Packet, error) {
    // Check minimum size before accessing any bytes
    if len(data) < MinPacketSize {
        return nil, fmt.Errorf("%w: got %d, need %d", 
            ErrBufferTooShort, len(data), MinPacketSize)
    }
    
    pkt := &Packet{}
    
    // Parse fixed header
    pkt.Version = data[0]
    pkt.Flags = data[1]
    pkt.Length = binary.BigEndian.Uint32(data[2:6])
    pkt.Checksum = binary.BigEndian.Uint16(data[6:8])
    
    // Validate version early - fail fast on incompatible protocols
    if pkt.Version != SupportedVersion {
        return nil, fmt.Errorf("%w: got %d, want %d", 
            ErrInvalidVersion, pkt.Version, SupportedVersion)
    }
    
    // Validate length before using it to slice
    if pkt.Length > MaxPayloadSize {
        return nil, fmt.Errorf("%w: %d bytes", ErrPayloadTooLarge, pkt.Length)
    }
    
    // Check if buffer actually contains the claimed payload
    expectedTotal := 8 + int(pkt.Length) // header + payload
    if len(data) < expectedTotal {
        return nil, fmt.Errorf("%w: got %d, need %d", 
            ErrBufferTooShort, len(data), expectedTotal)
    }
    
    // Extract payload
    pkt.Payload = data[8 : 8+pkt.Length]
    
    // Verify checksum (simple example - use CRC32 or better in real code)
    computed := computeChecksum(pkt.Payload)
    if computed != pkt.Checksum {
        return nil, fmt.Errorf("%w: got 0x%04x, want 0x%04x", 
            ErrInvalidChecksum, computed, pkt.Checksum)
    }
    
    return pkt, nil
}

func computeChecksum(data []byte) uint16 {
    var sum uint32
    for _, b := range data {
        sum += uint32(b)
    }
    return uint16(sum & 0xFFFF)
}

func main() {
    // Valid packet with checksum
    validPacket := []byte{
        0x02,                   // Version 2
        0x00,                   // Flags
        0x00, 0x00, 0x00, 0x05, // Length: 5
        0x02, 0x1C,             // Checksum for "hello"
        'h', 'e', 'l', 'l', 'o',
    }
    
    pkt, err := ParsePacket(validPacket)
    if err != nil {
        fmt.Printf("Parse error: %v\n", err)
        return
    }
    
    fmt.Printf("Parsed: version=%d, payload=%s\n", pkt.Version, pkt.Payload)
}
```

Key patterns here: validate lengths before slicing, use sentinel errors for error type checking, wrap errors with context using `%w`, and fail fast on fatal conditions like version mismatches.

## Streaming Parsers for Large Data

When dealing with data larger than memory or continuous streams (like TCP connections), you need a streaming parser that processes data incrementally.

This example implements a simple state machine parser:

```go
package main

import (
    "encoding/binary"
    "fmt"
    "io"
)

type ParserState int

const (
    StateReadingHeader ParserState = iota
    StateReadingPayload
)

type StreamParser struct {
    state      ParserState
    headerBuf  []byte
    headerPos  int
    payloadBuf []byte
    payloadPos int
    payloadLen int
}

func NewStreamParser() *StreamParser {
    return &StreamParser{
        state:     StateReadingHeader,
        headerBuf: make([]byte, 4), // 2 bytes type + 2 bytes length
    }
}

// Feed processes incoming bytes and returns complete messages
// This allows parsing data as it arrives without buffering everything
func (p *StreamParser) Feed(data []byte) ([][]byte, error) {
    var messages [][]byte
    pos := 0
    
    for pos < len(data) {
        switch p.state {
        case StateReadingHeader:
            // Copy bytes into header buffer
            needed := len(p.headerBuf) - p.headerPos
            available := len(data) - pos
            toCopy := min(needed, available)
            
            copy(p.headerBuf[p.headerPos:], data[pos:pos+toCopy])
            p.headerPos += toCopy
            pos += toCopy
            
            // Check if header is complete
            if p.headerPos == len(p.headerBuf) {
                p.payloadLen = int(binary.BigEndian.Uint16(p.headerBuf[2:4]))
                p.payloadBuf = make([]byte, p.payloadLen)
                p.payloadPos = 0
                p.state = StateReadingPayload
            }
            
        case StateReadingPayload:
            needed := p.payloadLen - p.payloadPos
            available := len(data) - pos
            toCopy := min(needed, available)
            
            copy(p.payloadBuf[p.payloadPos:], data[pos:pos+toCopy])
            p.payloadPos += toCopy
            pos += toCopy
            
            // Check if payload is complete
            if p.payloadPos == p.payloadLen {
                // Message complete - return a copy
                msg := make([]byte, len(p.payloadBuf))
                copy(msg, p.payloadBuf)
                messages = append(messages, msg)
                
                // Reset for next message
                p.headerPos = 0
                p.state = StateReadingHeader
            }
        }
    }
    
    return messages, nil
}

func main() {
    parser := NewStreamParser()
    
    // Simulate fragmented data arriving in chunks
    // Message: type=1, length=5, payload="hello"
    chunk1 := []byte{0x00, 0x01} // Partial header
    chunk2 := []byte{0x00, 0x05, 'h', 'e'} // Rest of header + partial payload
    chunk3 := []byte{'l', 'l', 'o'} // Rest of payload
    
    for i, chunk := range [][]byte{chunk1, chunk2, chunk3} {
        msgs, _ := parser.Feed(chunk)
        fmt.Printf("Chunk %d: received %d complete messages\n", i+1, len(msgs))
        for _, msg := range msgs {
            fmt.Printf("  Message: %s\n", msg)
        }
    }
}
```

This pattern handles arbitrary fragmentation of the input stream. Data can arrive one byte at a time or in huge chunks - the parser handles both correctly.

## Putting It All Together

Binary protocol parsing in Go comes down to a few key principles:

1. Always know your byte order and use the appropriate `binary.BigEndian` or `binary.LittleEndian`
2. Use fixed-size types in structs (`uint32`, not `int`)
3. Validate all lengths before using them to slice buffers
4. Use `io.ReadFull` when you need exactly N bytes
5. Pool buffers in high-throughput scenarios
6. Build streaming parsers for network protocols

The `encoding/binary` package handles the tedious byte manipulation, letting you focus on protocol logic. Combined with proper error handling and buffer management, you can build parsers that handle millions of messages per second without breaking a sweat.

---

*Monitor your protocol parsers with [OneUptime](https://oneuptime.com) - track parsing errors and throughput metrics.*
