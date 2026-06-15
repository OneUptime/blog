# Validation Summary: How to Implement Custom Binary Protocols Over TCP in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- TCP
- Custom binary protocols
- Message framing
- Go standard library packages: `net`, `io`, `encoding/binary`, `bufio`

## Sources Consulted
- Go `io` package documentation: https://pkg.go.dev/io
- Go `encoding/binary` package documentation: https://pkg.go.dev/encoding/binary
- Go `net` package documentation: https://pkg.go.dev/net
- Go `bufio` package documentation: https://pkg.go.dev/bufio
- Go `hash/crc32` package documentation: https://pkg.go.dev/hash/crc32
- RFC 9293, Transmission Control Protocol: https://datatracker.ietf.org/doc/html/rfc9293

## Issues Found
- The server example referenced `io.EOF` without importing the `io` package. Added the missing import so the snippet is syntactically correct.
- The server example called `processData` without defining it. Added a minimal placeholder function so the example is complete.
- The server and client examples ignored errors from `protocol.Encode` in two places. Added explicit error handling so write failures are not silently discarded.
- The decoder enforced `MaxPayloadSize`, but the encoder did not. Added the same payload-size guard to `Encode` so oversized messages are rejected before writing.
- The checksum recommendation implied TCP itself was an unreliable transport. Updated the wording to clarify that application checksums are for end-to-end payload integrity beyond TCP's per-segment checksum.

## Review Notes
The protocol framing, `io.ReadFull` usage, big-endian integer encoding, TCP stream-boundary explanation, deadlines, and buffered I/O guidance are technically correct. The performance comparison remains appropriately caveated as workload-dependent, but specific ratios should be treated as illustrative unless backed by project-specific benchmarks.
