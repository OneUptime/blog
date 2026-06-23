# Validation Summary: How to Choose Between gRPC and REST for Your API

## Status
validated

## Post Type
Comparison / Decision Guide (with code examples in Go, JavaScript, TypeScript, Protobuf, YAML, and CLI)

## Technologies Covered
- gRPC and gRPC-Web
- REST / HTTP/1.1 / HTTP/2
- Protocol Buffers (proto3)
- gRPC-Go (`google.golang.org/grpc`)
- OpenAPI 3.0
- Envoy proxy (gRPC-Web filter)
- grpcurl, Server-Sent Events (SSE), WebSocket
- gRPC-Gateway (`google/api/annotations.proto`)

## Sources Consulted
- gRPC official docs — concepts & guides: https://grpc.io/docs/
- gRPC status code definitions: https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
- gRPC ↔ HTTP status mapping (used by grpc-gateway / Google APIs): https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto
- gRPC-Go API reference (`grpc.Dial`, `grpc.WithTransportCredentials`, deprecation of `grpc.WithInsecure`): https://pkg.go.dev/google.golang.org/grpc and https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- Protocol Buffers proto3 language guide: https://protobuf.dev/programming-guides/proto3/
- Go `strconv` package: https://pkg.go.dev/strconv
- Envoy gRPC-Web filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter
- gRPC-Web client docs: https://github.com/grpc/grpc-web
- grpcurl usage: https://github.com/fullstorydev/grpcurl

## Issues Found
1. **Compile error in the API Gateway Go example (`Implementation Example`).** The code assigned a `string` to the `Id` field of `GetUserRequest`, but the proto defines `int64 id = 1`, so `Id` is a Go `int64`. The original:
   ```go
   userID := r.URL.Query().Get("id")        // string
   ... &userpb.GetUserRequest{ Id: userID } // int64 field — does not compile
   ```
   Fixed by parsing the query parameter to `int64` with `strconv.ParseInt` and returning HTTP 400 on a parse error, plus adding the `strconv` import. This matches the proto contract shown earlier in the post.

2. **Deprecated gRPC dial option.** `grpc.WithInsecure()` has been deprecated since grpc-go v1.34 in favor of transport credentials. Replaced with `grpc.WithTransportCredentials(insecure.NewCredentials())` and added the `google.golang.org/grpc/credentials/insecure` import.

## Review Notes
- **gRPC → HTTP status code table** was verified and is correct: CANCELLED→499, INVALID_ARGUMENT→400, NOT_FOUND→404, PERMISSION_DENIED→403, UNAUTHENTICATED→401, INTERNAL→500, UNAVAILABLE→503, OK→200. These match the canonical mapping used by grpc-gateway and Google APIs.
- `grpc.Dial` itself is also now soft-deprecated in recent grpc-go versions in favor of `grpc.NewClient` (which has lazy-connect semantics and no longer needs `WithBlock`). `grpc.Dial` still works and is widely used, so it was left as-is to keep the example minimal; readers on the newest grpc-go may prefer `grpc.NewClient`.
- The Envoy config is illustrative and broadly correct. Note that on very recent Envoy releases the `envoy.filters.http.router` filter expects an explicit `typed_config` (`type.googleapis.com/envoy.extensions.filters.http.router.v3.Router`); the shorthand shown still parses on many versions. Not changed since it is version-dependent and the example is for illustration.
- Performance/latency/throughput numbers (payload sizes, serialization benchmarks, req/sec) are clearly presented as illustrative figures, not measurements from a specific benchmark, and are directionally accurate for typical JSON-vs-Protobuf comparisons.
- The "New connection per request (HTTP/1.1)" table cell is a simplification — HTTP/1.1 supports keep-alive by default — but it accurately reflects the practical contrast with gRPC's persistent multiplexed HTTP/2 connection, so it was left intact.
- JavaScript/TypeScript (fetch, SSE, WebSocket, gRPC-Web), Protobuf, OpenAPI, and grpcurl examples were all verified as syntactically correct and using current APIs.
