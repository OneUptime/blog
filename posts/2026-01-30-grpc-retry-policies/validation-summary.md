# Validation Summary: How to Implement gRPC Retry Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC service config
- gRPC retry policies
- gRPC request hedging
- Go / grpc-go
- Python / grpcio
- Circuit breaker and retry budget patterns

## Sources Consulted
- gRPC Retry guide: https://grpc.io/docs/guides/retry/
- gRPC Request Hedging guide: https://grpc.io/docs/guides/request-hedging/
- gRPC client retries gRFC A6: https://github.com/grpc/proposal/blob/master/A6-client-retries.md
- grpc-go API documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC Python API documentation: https://grpc.github.io/grpc/python/grpc.html
- gRPC Core channel argument documentation: https://grpc.github.io/grpc/core/group__grpc__arg__keys.html

## Issues Found
- The Go retry example used `grpc.Dial`, which is deprecated in current grpc-go documentation. Changed it to `grpc.NewClient` and adjusted the surrounding wording because `NewClient` creates a client channel without performing immediate I/O.
- The hedging section presented a Go implementation even though the official gRPC hedging language support table lists Go as not yet supported. Replaced the Go-specific code with a language-neutral service config example and added a language-support caveat.
- The circuit breaker example imported the unused `errors` package, which made the Go snippet fail to compile. Removed the unused import.
- The circuit breaker comment said the half-open state allows one request through, but the implementation allowed unlimited requests while half-open. Added `halfOpenInFlight` tracking so the code matches the stated behavior.

## Review Notes
The retry policy JSON fields and Python channel option are consistent with official gRPC service-config and Python API documentation. The post's custom retry budget example is a standalone pattern; gRPC also supports built-in retry throttling via the top-level `retryThrottling` service-config field.
