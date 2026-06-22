# Validation Summary: How to Fix 'Unknown' Status Errors in gRPC

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- gRPC
- grpc-go
- Protocol Buffers
- Go
- NGINX gRPC proxying
- Prometheus alerting rules

## Sources Consulted
- gRPC status code guide: https://grpc.io/docs/guides/status-codes/
- grpc-go package documentation: https://pkg.go.dev/google.golang.org/grpc
- grpc-go status package documentation: https://pkg.go.dev/google.golang.org/grpc/status
- NGINX ngx_http_grpc_module documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- Protocol Buffers proto3 language guide: https://protobuf.dev/programming-guides/proto3/
- Protocol Buffers best practices: https://protobuf.dev/best-practices/dos-donts/

## Issues Found
- The post overstated that unhandled panics or exceptions in grpc-go are automatically returned as `UNKNOWN`. grpc-go documents that non-status handler errors are converted to `codes.Unknown`; unhandled panics need recovery code. Updated the description, diagram, heading text, comments, and conclusion to distinguish plain returned errors from panics.
- The validation interceptor snippet used `grpc.UnaryServerInterceptor` without importing `google.golang.org/grpc`. Added the missing import.
- The error details snippet used `log.Printf` and `log.Println` without importing `log`. Added the missing import.
- The HTTP/2 client snippet and connection pool used deprecated `grpc.Dial`. Updated them to use `grpc.NewClient`, matching current grpc-go documentation.
- The HTTP/2 snippet imported `net` but did not use it. Removed the unused import.
- The NGINX gRPC proxy configuration was labeled as YAML and used the deprecated `listen ... http2` style. Changed the fence to `nginx` and updated the current example to use `http2 on;`.
- The proto compatibility section claimed incompatible proto versions directly cause `UNKNOWN`. Updated it to describe decoding errors or application-level failures, which is more accurate for Protocol Buffers compatibility behavior.
- The serialization example implied generated Go handlers can compile with the wrong response type. Updated the wording to explain that generated Go methods enforce the return type and that custom or lower-level handlers must return values the codec can marshal.

## Review Notes
The code snippets remain illustrative and depend on project-specific generated protobuf packages and placeholder service types. The grpc-go examples now avoid deprecated client construction APIs, but older projects pinned to grpc-go versions before `NewClient` would need `grpc.Dial` or an upgrade.
