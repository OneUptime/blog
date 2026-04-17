# Validation Summary: How to Build a gRPC API on Top of ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- gRPC (google.golang.org/grpc)
- Protocol Buffers (proto3)
- Go
- ClickHouse
- clickhouse-go/v2 native driver
- protoc / protoc-gen-go / protoc-gen-go-grpc

## Sources Consulted
- gRPC Go Generated Code Reference — https://grpc.io/docs/languages/go/generated-code/
- gRPC Go Quick Start — https://grpc.io/docs/languages/go/quickstart/
- google.golang.org/grpc pkg.go.dev — https://pkg.go.dev/google.golang.org/grpc
- ClickHouse Date/Time Functions — https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse formatDateTime specifiers (`%H`, `%i`, `%s`)
- clickhouse-go/v2 README and placeholder docs — https://github.com/ClickHouse/clickhouse-go

## Issues Found
- **Incorrect comment in proto service definition.** The `service AnalyticsService` block labeled `GetDailyMetrics` as `// Unary RPC`, but the RPC returns `stream DailyMetric`, making it a server-streaming RPC. Replaced the comment with `// Server-side streaming for daily metric rows` so both streaming RPCs are accurately described.

## Review Notes
- `grpc.Dial` was deprecated in grpc-go v1.63 (2024) in favor of `grpc.NewClient`. The code still compiles and works, but new code should prefer `grpc.NewClient("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))` (requires importing `google.golang.org/grpc/credentials/insecure`).
- `grpc.WithInsecure()` is likewise deprecated in favor of `grpc.WithTransportCredentials(insecure.NewCredentials())`.
- The generated server-stream interface name `AnalyticsService_GetDailyMetricsServer` follows the traditional `{Service}_{Method}Server` naming and is still emitted by `protoc-gen-go-grpc`; newer generator versions additionally expose generic `grpc.ServerStreamingServer[T]` aliases.
- The `protoc --go_out=. --go-grpc_out=. analytics.proto` command works but a more robust invocation would add `--go_opt=paths=source_relative --go-grpc_opt=paths=source_relative`.
- The `GetDailyMetrics` query interpolates `req.Days` via `fmt.Sprintf` rather than a bound parameter. Since `Days` is a `uint32` the injection surface is bounded, but using a parameterized query would be a stronger practice.
- `formatDateTime(event_time, '%Y-%m-%dT%H:%i:%s')` is correct: ClickHouse follows MySQL-style specifiers where `%i` denotes minutes (00–59).
- `today() - N` returns a `Date` N days before today; comparing against a `DateTime` column is valid — ClickHouse lifts the Date to midnight DateTime for the comparison.
- `grpcServer.Serve(lis)` return value is ignored in `main()`; checking and logging the error would be a minor improvement but is not technically incorrect.
