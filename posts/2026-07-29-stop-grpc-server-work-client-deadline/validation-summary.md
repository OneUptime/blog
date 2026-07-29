# Validation Summary: How to Stop Server Work When a gRPC Client Deadline Expires

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- gRPC and gRPC-Go
- Go `context.Context`
- Go `database/sql`
- Protocol Buffers
- `golang.org/x/sync/errgroup`
- Cooperative cancellation and deadlines
- Goroutine and stream lifecycle management
- Idempotent state-changing RPCs
- Transactional outbox and durable-operation patterns

## Sources Consulted

- [gRPC cancellation guide](https://grpc.io/docs/guides/cancellation/)
- [gRPC deadlines and propagation](https://grpc.io/docs/guides/deadlines/)
- [gRPC retry guide](https://grpc.io/docs/guides/retry/)
- [gRPC Go generated-code reference](https://grpc.io/docs/languages/go/generated-code/)
- [gRPC Go basics tutorial](https://grpc.io/docs/languages/go/basics/)
- [gRPC-Go package API](https://pkg.go.dev/google.golang.org/grpc)
- [gRPC-Go status package](https://pkg.go.dev/google.golang.org/grpc/status)
- [Current gRPC-Go `protoc-gen-go-grpc` generator source](https://github.com/grpc/grpc-go/blob/v1.82.1/cmd/protoc-gen-go-grpc/grpc.go)
- [Go context package](https://pkg.go.dev/context)
- [Go database/sql package](https://pkg.go.dev/database/sql)
- [Go guide to canceling in-progress database operations](https://go.dev/doc/database/cancel-operations)
- [Go guide to managing database connections](https://go.dev/doc/database/manage-connections)
- [Go guide to executing transactions](https://go.dev/doc/database/execute-transactions)
- [Go errgroup package](https://pkg.go.dev/golang.org/x/sync/errgroup)
- [AIP-151: Long-running operations](https://google.aip.dev/151)
- [AIP-155: Request identification](https://google.aip.dev/155)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## Issues Found

- The streaming guidance treated every `Recv()` error as a termination signal. In gRPC-Go, `io.EOF` is a normal client half-close for client-streaming and bidirectional handlers; only other receive errors mean that the stream terminated unexpectedly. Updated the guidance to distinguish `io.EOF`, allow the handler to complete its defined response behavior, and return on non-EOF receive errors or send errors.
- The checklist said to close server streams. gRPC-Go server stream interfaces do not expose a close method; the server terminates a stream by returning from the handler. Updated the cleanup and stream-error checklist items accordingly.
- The explicit-cancellation test sequence created a cancellable context but did not say to call its cancel function. Updated the sequence to run the blocking handler in a goroutine, trigger cancellation or wait for the deadline, and then wait for the handler to exit.

## Review Notes

- The cancellation, deadline propagation, context derivation, status conversion, database cleanup, `errgroup`, commit-race, idempotency, outbox, and durable-job explanations match the consulted documentation.
- Current gRPC-Go generated code uses generic stream interfaces by default but still emits method-specific server stream aliases for backward compatibility, so `pb.ExportService_ExportServer` remains valid.
- The SQL placeholder `$1` assumes a PostgreSQL-compatible driver. The post correctly notes that cancellation behavior and latency depend on the selected driver and database server.
- The durable-job protobuf is schematic: `Operation` must be defined or imported. APIs following Google AIP conventions can use `google.longrunning.Operation` and the standard Operations service.
