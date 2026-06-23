# Validation Summary: How to Handle Deadlines and Timeouts in gRPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC (deadlines, timeouts, deadline propagation, context cancellation)
- Go (`google.golang.org/grpc`, `context` package, unary/server interceptors)
- Python (`grpcio`)
- Node.js / TypeScript (`@grpc/grpc-js`)
- Prometheus (`client_golang` / `promauto`) for metrics

## Sources Consulted
- gRPC official docs — Deadlines blog/guide: https://grpc.io/docs/guides/deadlines/
- gRPC Go API reference (`grpc.NewClient`, interceptors): https://pkg.go.dev/google.golang.org/grpc
- gRPC Go `insecure` credentials: https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- Go standard library `context` package: https://pkg.go.dev/context
- gRPC Python API (call options / timeout): https://grpc.github.io/grpc/python/grpc.html
- gRPC-js (Node.js) docs: https://grpc.github.io/grpc/node/
- Prometheus Go client (`promauto`): https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto

## Issues Found
- **Missing `log` import (Go snippet "Adjusting Deadlines for Downstream Calls")**: The code called `log.Printf(...)` but the import block only listed `context`, `time`, `codes`, `status`, and `pb`. This would not compile. Fixed by adding `"log"` to the import block.

## Review Notes
- The core API usage is current and correct: the post uses `grpc.NewClient` (the recommended replacement for the deprecated `grpc.Dial`) and `insecure.NewCredentials()` rather than the deprecated `grpc.WithInsecure()`.
- Deadline vs. timeout distinction, automatic deadline propagation, and use of `context.WithTimeout` / `context.WithDeadline` are all accurately described and consistent with the official gRPC deadlines guide.
- The Python (`timeout=` call option), Node.js/TypeScript (`{ deadline: Date }` call option, `grpc.status.DEADLINE_EXCEEDED`), and Prometheus `promauto` examples are all idiomatic and correct.
- Minor (not changed, illustrative-only): The `ServerTimeoutInterceptor` runs the handler in a goroutine and returns on `ctx.Done()`; the spawned goroutine can outlive the request if the handler ignores context cancellation. This is an accepted illustrative pattern but worth noting as a potential goroutine leak in production.
- Minor (not changed): `calculatePercentile` uses simple linear indexing (`int((len-1) * p)`), which is a reasonable nearest-rank approximation and the comment already flags it as simplified.
- Several snippets are intentionally partial (undefined helper types/methods like `orderServer`, `processOrder`, `MetricsCollector`), which is appropriate for a tutorial and does not affect correctness of the demonstrated concepts.
