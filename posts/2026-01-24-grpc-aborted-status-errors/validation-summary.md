# Validation Summary: How to Fix 'Aborted' Status Errors in gRPC

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- gRPC status codes and retry semantics
- grpc-go
- gRPC Python
- Go
- Python
- PostgreSQL transaction errors
- psycopg2
- Prometheus Python client

## Sources Consulted
- gRPC Status Codes documentation: https://grpc.io/docs/guides/status-codes/
- gRPC Retry documentation: https://grpc.io/docs/guides/retry/
- grpc-go package documentation: https://pkg.go.dev/google.golang.org/grpc
- grpc-go insecure credentials documentation: https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- gRPC Python API documentation: https://grpc.github.io/grpc/python/grpc.html
- psycopg2 errors documentation: https://www.psycopg.org/docs/errors.html
- PostgreSQL serialization failure handling documentation: https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html
- Prometheus Python client Histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/

## Issues Found
- The Go retry example imported `google.golang.org/grpc` but did not use it, which would cause a Go compile error. Removed the unused import.
- The Go retry example logged every retryable failure as `ABORTED` even though the retry configuration also included `UNAVAILABLE`. Updated the log message to say "retryable error".
- The service-config example used `grpc.Dial` with `grpc.WithInsecure()`. Updated the example to use `grpc.NewClient` and `grpc.WithTransportCredentials(insecure.NewCredentials())`, matching current grpc-go guidance.
- The Python monitoring interceptor replaced the original unary handler without preserving request deserialization and response serialization, and it only inspected `grpc.RpcError`. Updated it to call `continuation` once, preserve the original serializers, return non-unary handlers unchanged, and detect ABORTED status from either the context or a `grpc.RpcError`.

## Review Notes
The post's core ABORTED guidance matches gRPC's documented distinction: use ABORTED when the client should retry at a higher level, FAILED_PRECONDITION when state must be fixed first, and UNAVAILABLE when retrying the failing call may be enough. The retry examples are illustrative and should still be adapted carefully for non-idempotent operations.
