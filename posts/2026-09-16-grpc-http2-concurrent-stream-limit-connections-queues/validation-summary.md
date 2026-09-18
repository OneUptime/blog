# Validation Summary: Fix gRPC HTTP/2 Stream Limits: Connections, Queues, and `MAX_CONCURRENT_STREAMS`

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- gRPC
- Go
- HTTP/2
- Client-side admission control
- Proxies and connection pools

## Sources Consulted
- [gRPC Performance Best Practices](https://grpc.io/docs/guides/performance/)
- [gRPC Flow Control Guide](https://grpc.io/docs/guides/flow-control/)
- [gRPC-Go package documentation](https://pkg.go.dev/google.golang.org/grpc)
- [RFC 9113: HTTP/2, Stream Concurrency](https://www.rfc-editor.org/rfc/rfc9113.html#section-5.1.2)
- [RFC 9113: HTTP/2, Defined Settings](https://www.rfc-editor.org/rfc/rfc9113.html#section-6.5.2)

## Issues Found
- The example described the HTTP/2 concurrent-stream limit as “negotiated.” RFC 9113 states that settings are not negotiated; they describe characteristics of the sending peer and are acknowledged by the receiver. Changed “negotiated limit” to “advertised limit” to match the protocol semantics.

## Review Notes
The Go examples are syntactically valid and use current, non-deprecated APIs. `grpc.MaxConcurrentStreams` is a `ServerOption` accepting a `uint32`, and the literal `256` is valid. The admission gate correctly rejects excess work with `ResourceExhausted`, preserves context cancellation status, and holds its slot until a unary callback returns. The post correctly warns that streaming calls must retain admission for the full stream lifecycle. The numeric concurrency examples are explicitly illustrative and do not claim a gRPC default.
