# Securing the OnData Method in Cilium Network Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Network Security, OnData, L7 Proxy, Input Validation

Description: Learn how to implement a secure OnData method for Cilium L7 parsers with proper input validation, bounds checking, and safe byte-level parsing to prevent common protocol parser vulnerabilities.

---

## Introduction

The `OnData` method is the heart of every Cilium L7 protocol parser. It is called each time new data arrives on a proxied connection, and it must decide whether to pass, drop, or request more data. Because this method processes untrusted network input directly, it is the primary attack surface of any parser.

Securing the OnData method requires disciplined input validation at every step: checking data lengths before accessing bytes, enforcing protocol-specific invariants, and handling malformed input gracefully without panicking or leaking memory. Cilium's proxylib recovers from parser panics and drops the connection as a parser error, so a single unchecked slice access can disrupt proxied traffic for that connection and hide the real policy decision behind a parser failure.

This guide covers practical techniques for writing a secure OnData implementation in Cilium's proxylib framework, with code examples drawn from real protocol parsing patterns.

## Prerequisites

- Cilium source code with a proxy skeleton already created
- Go 1.21 or later
- Understanding of the proxylib Reader API
- Familiarity with binary protocol parsing concepts
- Knowledge of your target protocol's wire format

## Safe Data Reading with the Reader API

The proxylib Reader provides safe methods for accessing connection data. Always use Reader methods rather than direct slice operations:

```go
func (p *Parser) OnData(reply bool, reader *proxylib.Reader) (proxylib.OpType, int) {
    // Always check available data first
    dataLen := reader.Length()
    if dataLen < 4 {
        return proxylib.MORE, 4 - dataLen
    }

    // Use PeekFull to examine data without consuming it
    header := make([]byte, 4)
    if _, err := reader.PeekFull(header); err != nil {
        log.WithError(err).Error("Unexpected header read error")
        return proxylib.ERROR, int(proxylib.ERROR_INVALID_FRAME_LENGTH)
    }

    // Parse the message length from the header
    msgLen := int(binary.BigEndian.Uint32(header))

    // Validate message length before proceeding
    if msgLen <= 0 {
        log.Warn("Invalid message length <= 0")
        return proxylib.ERROR, int(proxylib.ERROR_INVALID_FRAME_LENGTH)
    }
    if msgLen > maxMessageSize {
        log.WithField("msgLen", msgLen).Warn("Message exceeds maximum size")
        return proxylib.ERROR, int(proxylib.ERROR_INVALID_FRAME_LENGTH)
    }

    // Check if full message is available
    totalLen := 4 + msgLen // header + body
    if dataLen < totalLen {
        return proxylib.MORE, totalLen - dataLen
    }

    // Now safe to read the full message
    return p.parseMessage(reply, reader, totalLen)
}
```

## Implementing Bounds-Checked Parsing

Every byte access must be guarded by a preceding length check:

```go
// parseMessage handles a complete protocol message
func (p *Parser) parseMessage(reply bool, reader *proxylib.Reader, totalLen int) (proxylib.OpType, int) {
    // Read the complete message
    data := make([]byte, totalLen)
    if _, err := reader.PeekFull(data); err != nil {
        // Should not happen since we checked length in OnData
        log.WithError(err).Error("Unexpected read error")
        return proxylib.ERROR, int(proxylib.ERROR_INVALID_FRAME_LENGTH)
    }

    // Skip the 4-byte length header
    body := data[4:]

    // Parse command byte (offset 0 in body)
    if len(body) < 1 {
        return proxylib.ERROR, int(proxylib.ERROR_INVALID_FRAME_LENGTH)
    }
    command := body[0]

    // Parse request ID (bytes 1-4 in body)
    if len(body) < 5 {
        return proxylib.ERROR, int(proxylib.ERROR_INVALID_FRAME_LENGTH)
    }
    requestID := binary.BigEndian.Uint32(body[1:5])

    log.WithFields(log.Fields{
        "command":   command,
        "requestID": requestID,
        "reply":     reply,
    }).Debug("Parsed MyProtocol message")

    // Apply L7 policy
    if !p.matchesPolicy(command) {
        return proxylib.DROP, totalLen
    }

    return proxylib.PASS, totalLen
}
```

```mermaid
flowchart TD
    A[OnData Called] --> B{Data available?}
    B -->|No| C[Return MORE, bytes needed]
    B -->|Yes| D{Can read header?}
    D -->|No| E[Return MORE, header bytes needed]
    D -->|Yes| F[Parse message length]
    F --> G{Length valid?}
    G -->|No| H[Return ERROR]
    G -->|Yes| I{Full message available?}
    I -->|No| J[Return MORE, missing bytes]
    I -->|Yes| K[Parse message body]
    K --> L{Policy allows?}
    L -->|Yes| M[Return PASS, totalLen]
    L -->|No| N[Return DROP, totalLen]
```

## Preventing Integer Overflow Attacks

Protocol parsers commonly read length fields from the wire. These values must be validated to prevent integer overflows:

```go
const (
    maxMessageSize   = 1 << 20 // 1 MB
    maxStringLength  = 1 << 16 // 64 KB
    maxArrayElements = 10000
)

// safeReadLength reads a 4-byte big-endian length and validates it
func safeReadLength(data []byte, offset int, maxLen int) (int, error) {
    if offset < 0 || offset > len(data)-4 {
        return 0, fmt.Errorf("insufficient data for length field at offset %d", offset)
    }

    length32 := int32(binary.BigEndian.Uint32(data[offset : offset+4]))

    // Check for negative values (sign bit set in the original int32)
    if length32 < 0 {
        return 0, fmt.Errorf("negative length %d at offset %d", length32, offset)
    }

    length := int(length32)

    // Check against maximum
    if length > maxLen {
        return 0, fmt.Errorf("length %d exceeds maximum %d at offset %d",
            length, maxLen, offset)
    }

    return length, nil
}

// Usage in OnData:
func (p *Parser) OnData(reply bool, reader *proxylib.Reader) (proxylib.OpType, int) {
    dataLen := reader.Length()
    if dataLen < 4 {
        return proxylib.MORE, 4 - dataLen
    }

    header := make([]byte, 4)
    if _, err := reader.PeekFull(header); err != nil {
        return proxylib.ERROR, int(proxylib.ERROR_INVALID_FRAME_LENGTH)
    }
    msgLen, err := safeReadLength(header, 0, maxMessageSize)
    if err != nil {
        log.WithError(err).Warn("Invalid message length")
        return proxylib.ERROR, int(proxylib.ERROR_INVALID_FRAME_LENGTH)
    }

    totalLen := 4 + msgLen
    if dataLen < totalLen {
        return proxylib.MORE, totalLen - dataLen
    }

    return p.parseMessage(reply, reader, totalLen)
}
```

## Handling Partial Reads and Fragmentation

TCP does not preserve message boundaries. Your OnData method will be called with partial messages regularly:

```go
func (p *Parser) OnData(reply bool, reader *proxylib.Reader) (proxylib.OpType, int) {
    dataLen := reader.Length()

    // Phase 1: Need at least the header
    if dataLen < headerSize {
        // Request exactly the additional bytes we need - do not over-request
        return proxylib.MORE, headerSize - dataLen
    }

    header := make([]byte, headerSize)
    if _, err := reader.PeekFull(header); err != nil {
        return proxylib.ERROR, int(proxylib.ERROR_INVALID_FRAME_LENGTH)
    }
    msgLen, err := safeReadLength(header, 0, maxMessageSize)
    if err != nil {
        return proxylib.ERROR, int(proxylib.ERROR_INVALID_FRAME_LENGTH)
    }

    totalLen := headerSize + msgLen

    // Phase 2: Need the full message body
    if dataLen < totalLen {
        return proxylib.MORE, totalLen - dataLen
    }

    // Phase 3: Full message available - parse and decide
    result, consumed := p.parseMessage(reply, reader, totalLen)

    // Log the access for audit trail
    p.logAccess(reply, totalLen, result)

    return result, consumed
}
```

## Verification

Test the OnData method against edge cases:

```bash
# Run parser tests

go test ./proxylib/myprotocol/... -v -run TestOnData

# Run with race detector
go test ./proxylib/myprotocol/... -race -v

# Run fuzzing if available (Go 1.18+)
go test ./proxylib/myprotocol/... -fuzz=FuzzOnData -fuzztime=30s
```

Write specific security-focused tests:

```go
func TestOnDataZeroLengthMessage(t *testing.T) {
    // Zero-length messages should be handled safely
    // ... test implementation
}

func TestOnDataMaxSizeMessage(t *testing.T) {
    // Messages at exactly maxMessageSize should be accepted
    // ... test implementation
}

func TestOnDataOversizedMessage(t *testing.T) {
    // Messages exceeding maxMessageSize should be rejected
    // ... test implementation
}

func TestOnDataNegativeLength(t *testing.T) {
    // Negative length fields (sign bit set) should be rejected
    // ... test implementation
}
```

## Troubleshooting

**Problem: Parser panics on short packets**
A panic in OnData typically means a slice access without a preceding bounds check. Search for all `data[` and `body[` accesses and ensure each has a `len()` guard above it.

**Problem: Connections hang after partial message**
Verify that your MORE return value requests the correct number of additional bytes, not the total message size. The proxylib framework interprets the value as the number of more bytes needed before calling OnData again.

**Problem: Parser drops valid messages**
Enable debug logging and check the length calculations. Off-by-one errors in header size constants are common. Verify your protocol's header size against the specification.

**Problem: Memory usage spikes during parsing**
Avoid copying more data than needed. Use `PeekFull` with small buffers for headers before allocating space for a complete message body.

## Conclusion

Securing the OnData method is the most critical step in building a Cilium L7 parser. By consistently validating lengths before accessing data, enforcing maximum size limits, handling integer overflows, and gracefully managing TCP fragmentation, you build a parser that is resilient against malformed and malicious input. Combine these techniques with fuzz testing to gain confidence that your parser handles the full spectrum of inputs safely.
