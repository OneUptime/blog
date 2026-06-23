# Validation Summary: How to Use Unary, Server-Streaming, Client-Streaming,

## Status
validated

## Post Type
Tutorial / Guide (hands-on implementation of all four gRPC communication patterns in Go)

## Technologies Covered
- gRPC (grpc-go)
- Protocol Buffers (proto3)
- Go (goroutines, channels, sync.WaitGroup, context)
- gRPC status codes / error handling (`google.golang.org/grpc/codes`, `google.golang.org/grpc/status`)

## Sources Consulted
- gRPC Core Concepts (RPC life cycle: unary, server-streaming, client-streaming, bidirectional) — https://grpc.io/docs/what-is-grpc/core-concepts/
- gRPC Go Basics tutorial — https://grpc.io/docs/languages/go/basics/
- grpc-go package reference (`grpc.NewServer`, `MaxRecvMsgSize`, `MaxSendMsgSize`, `Dial`, `NewClient`, `WithBlock`/`WithTimeout` deprecation) — https://pkg.go.dev/google.golang.org/grpc
- gRPC status codes — https://pkg.go.dev/google.golang.org/grpc/codes
- Protocol Buffers proto3 language guide — https://protobuf.dev/programming-guides/proto3/
- Go spec on imports (unused imports are a compile-time error) — https://go.dev/ref/spec#Import_declarations

## Issues Found
All issues found were Go compile errors caused by incorrect import blocks (Go treats unused imports and missing imports as hard compile errors). Fixed:

1. **`client/client_streaming.go` — missing `fmt` import.** The `UploadFile` function calls `fmt.Sprintf(...)` to build chunk IDs, but `fmt` was not imported, while `google.golang.org/grpc` was imported and never used. Replaced the unused `grpc` import with `fmt`.
2. **`client/unary.go` — unused `google.golang.org/grpc` import.** The file only uses `context`, `log`, `time`, `pb`, `codes`, and `status`. Removed the unused `grpc` import.
3. **`server/unary.go` — unused `fmt` import.** `GetItem` uses `status`/`codes`/`time` but not `fmt`. Removed it.
4. **`server/server_streaming.go` — unused `fmt` import.** `ListItems` uses `status.Errorf`/`time.Sleep` but not `fmt`. Removed it.
5. **`server/bidirectional.go` — unused `log` import.** No `log.*` calls in the file. Removed it.
6. **`recovery/stream_recovery.go` — unused `google.golang.org/grpc` import.** No `grpc.*` symbols referenced. Removed it.

All other code was verified and is correct:
- The proto3 service definition correctly maps the four RPC kinds (`returns (Item)`, `returns (stream Item)`, `(stream Item) returns (...)`, `(stream ...) returns (stream ...)`).
- Server/client streaming control flow (`stream.Send`, `stream.Recv`, `io.EOF` handling, `SendAndClose`, `CloseAndRecv`, `CloseSend`) matches grpc-go semantics.
- The bidirectional implementation correctly uses one goroutine for sending and one for receiving — the recommended pattern, since concurrent `SendMsg`/`RecvMsg` from multiple goroutines is unsafe but one-sender + one-receiver is safe.
- Calling `stream.CloseAndRecv()` after a `Send` failure to surface the real RPC error is the documented client-streaming pattern.
- `status.FromError`, the retryable error-code classification (`Unavailable`, `ResourceExhausted`, `Aborted`, `DeadlineExceeded`), and exponential-backoff logic are correct.
- Server options `grpc.MaxRecvMsgSize` / `grpc.MaxSendMsgSize` are valid `ServerOption`s.

## Review Notes
- **Deprecated dial API (not changed):** `cmd/client/main.go` uses `grpc.Dial(...)` with `grpc.WithBlock()` and `grpc.WithTimeout(...)`. As of grpc-go v1.63 these are deprecated in favor of `grpc.NewClient(...)` (which connects lazily and does not support `WithBlock`/`WithTimeout`). The code still compiles and works against current grpc-go, so it was left as-is to avoid changing connection semantics, but a future revision could migrate to `grpc.NewClient` plus an explicit `conn.Connect()` / readiness wait if eager-connect behavior is desired.
- The `transform` operation in the bidirectional server mutates the stored `*pb.Item` in place via the shared map; in a concurrent server this map access would need synchronization. This is acceptable for an illustrative example but worth noting for production use.
- `getItemsByCategory` ignores the `category` argument (filter is a placeholder comment); this is clearly intentional scaffolding for the example and not a correctness error.
