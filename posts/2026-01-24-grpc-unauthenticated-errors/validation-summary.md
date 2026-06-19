# Validation Summary: How to Fix 'Unauthenticated' Errors in gRPC

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- gRPC and gRPC status codes
- gRPC-Go server and client interceptors
- gRPC metadata and per-RPC credentials
- JWT validation with github.com/golang-jwt/jwt/v5
- TLS and mTLS configuration in Go
- grpcurl CLI testing

## Sources Consulted
- gRPC status code documentation: https://grpc.io/docs/guides/status-codes/
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go metadata package documentation: https://pkg.go.dev/google.golang.org/grpc/metadata
- gRPC-Go credentials package documentation: https://pkg.go.dev/google.golang.org/grpc/credentials
- gRPC-Go insecure credentials package documentation: https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- golang-jwt/jwt v5 package documentation: https://pkg.go.dev/github.com/golang-jwt/jwt/v5
- grpcurl command package documentation: https://pkg.go.dev/github.com/fullstorydev/grpcurl/cmd/grpcurl
- Go io/ioutil deprecation documentation: https://pkg.go.dev/io/ioutil
- Go crypto/tls documentation: https://pkg.go.dev/crypto/tls

## Issues Found
- The stream interceptor authenticated the stream context but discarded the context containing JWT claims. Added a wrapped server stream so stream handlers receive the authenticated context.
- The server JWT interceptor imported `time` but did not use it, making the snippet fail to compile. Added `jwt.WithLeeway(30 * time.Second)` to match the clock-skew guidance and use the import correctly.
- The client connection example used deprecated `grpc.WithInsecure()` and deprecated `grpc.Dial()`. Updated it to `grpc.WithTransportCredentials(insecure.NewCredentials())` and `grpc.NewClient()`.
- The client connection example imported `metadata` without using it. Removed that unused import.
- The token refresh example read `refreshToken` directly from `TokenManager` without holding the read lock. Added `GetRefreshToken()` and used it during refresh.
- The grpcurl examples omitted the assumption that server reflection is required when no proto descriptors are provided. Added a note to use reflection or pass `-proto`/`-protoset`.
- The standalone token validation utility did not check for an empty `JWT_SECRET` and did not validate the signing method. Added both checks.
- The TLS example used deprecated `io/ioutil.ReadFile` and imported `net` without using it. Updated to `os.ReadFile` and removed the unused import.

## Review Notes
The examples are illustrative and still use simplified application-specific placeholders such as `myapp` packages, service registration, and token refresh implementation. Production code should also prefer typed context keys instead of raw string keys for JWT claims.
