# Validation Summary: How to Handle Interceptors in gRPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC
- gRPC-Go interceptors
- gRPC Python interceptors
- Go context and metadata
- JWT authentication with golang-jwt/jwt
- Prometheus Go client metrics
- Token bucket rate limiting

## Sources Consulted
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go metadata package documentation: https://pkg.go.dev/google.golang.org/grpc/metadata
- gRPC-Go peer package documentation: https://pkg.go.dev/google.golang.org/grpc/peer
- go-grpc-middleware v2 documentation: https://pkg.go.dev/github.com/grpc-ecosystem/go-grpc-middleware/v2
- gRPC Python API documentation: https://grpc.github.io/grpc/python/grpc.html
- golang-jwt/jwt v5 documentation: https://pkg.go.dev/github.com/golang-jwt/jwt/v5
- Prometheus Go client documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Prometheus promauto documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto

## Issues Found
- The stream authentication interceptor parsed a Bearer token but did not reject authorization headers without the `Bearer ` prefix. Added the same invalid-format check used by the unary interceptor.
- The rate-limit IP helper used the `:authority` pseudo-header as a peer address fallback. Replaced it with `peer.FromContext(ctx)` and added the required `google.golang.org/grpc/peer` import.
- The chaining example used the deprecated v1 `github.com/grpc-ecosystem/go-grpc-middleware` chain helpers. Updated it to current built-in `grpc.ChainUnaryInterceptor` and `grpc.ChainStreamInterceptor`.
- The unary metrics interceptor counted a sent message even when the handler returned an error. Changed it to always count the received request and count a sent response message only on success.
- The Python auth interceptor returned only a unary-unary abort handler, which was incorrect for streaming RPCs. Updated it to preserve each RPC cardinality and serializer/deserializer when aborting.
- The Python auth interceptor said it stored claims in context but returned the handler unchanged. Updated it to pass claims through `contextvars`, matching gRPC Python's documented interceptor state mechanism.
- The Go auth test helper returned `context.Background()` instead of attaching incoming authorization metadata. Updated it to use `metadata.Pairs` and `metadata.NewIncomingContext`.

## Review Notes
The JWT example is intentionally simplified and uses an HMAC shared secret for illustration. In production, key rotation, issuer/audience validation, leeway, and stronger claim typing should be considered.
