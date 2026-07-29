# Validation Summary: Why Does gRPC Return `DEADLINE_EXCEEDED` After Work Has Already Started?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- gRPC deadlines, cancellation, status codes, and retries
- gRPC Service Config and deadline propagation
- Go `context.Context`
- Protocol Buffers service and message definitions
- HTTP/2 transport and flow control
- Distributed-system idempotency and asynchronous-operation patterns

## Sources Consulted
- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [gRPC status codes](https://grpc.io/docs/guides/status-codes/)
- [gRPC cancellation guide](https://grpc.io/docs/guides/cancellation/)
- [gRPC retry guide](https://grpc.io/docs/guides/retry/)
- [gRPC Service Config guide](https://grpc.io/docs/guides/service-config/)
- [gRPC error handling](https://grpc.io/docs/guides/error/)
- [gRPC Wait-for-Ready guide](https://grpc.io/docs/guides/wait-for-ready/)
- [gRPC flow-control guide](https://grpc.io/docs/guides/flow-control/)
- [gRPC Go basics tutorial](https://grpc.io/docs/languages/go/basics/)
- [Go `context` package documentation](https://pkg.go.dev/context)
- [Go `time` package documentation](https://pkg.go.dev/time)
- [Protocol Buffers proto3 language specification](https://protobuf.dev/reference/protobuf/proto3-spec/)
- [RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html)

## Issues Found
- The status-lookup example placed `rpc` declarations at the top level, but Protobuf requires RPC methods to appear inside a `service` definition. Wrapped both methods in `service OrderService` so the fragment uses valid `.proto` syntax.
- The retry statement said configuration was "per method and per status code," which could imply that gRPC defines a separate policy for each status. Changed it to state that retry policies use Service Config at per-method granularity and contain a list of retryable status codes, matching the official retry model.

## Review Notes
- The central claim is correct: `DEADLINE_EXCEEDED` can be returned even when a state-changing operation completed successfully.
- The descriptions of client/server deadline observations, cooperative cancellation, cancellation-versus-commit races, default deadline behavior, deadline propagation, clock-skew handling, Go context propagation, and retry safety agree with the official documentation.
- The Go calls are valid illustrative fragments for a generated unary gRPC client, assuming the surrounding `downstream`, `request`, and `ctx` declarations.
- The Protobuf fragments assume the referenced message types are defined elsewhere in the schema.
- The post contains no terminal commands, configuration snippets, or version-specific claims requiring additional corrections.
