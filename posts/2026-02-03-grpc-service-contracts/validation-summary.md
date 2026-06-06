# Validation Summary: How to Design gRPC Service Contracts

## Status
validated

## Post Type
Tutorial / Guide — a practical reference covering Protocol Buffer message design, RPC patterns, error handling, versioning, and API evolution with code examples in protobuf and Go.

## Technologies Covered
- gRPC (Go server implementations)
- Protocol Buffers (proto3 syntax)
- google.golang.org/grpc/codes and google.golang.org/grpc/status packages
- google.golang.org/genproto/googleapis/rpc/errdetails package
- Well-known types: google/protobuf/timestamp.proto, google/protobuf/field_mask.proto, google.protobuf.Int32Value
- gRPC status code conventions
- API versioning patterns (package-based)

## Sources Consulted
- gRPC Status Codes reference: https://grpc.io/docs/guides/status-codes/
- Protocol Buffers Language Guide (proto3): https://protobuf.dev/programming-guides/proto3/
- Go Generated Code Guide: https://protobuf.dev/reference/go/go-generated/
- gRPC Go Basics Tutorial: https://grpc.io/docs/languages/go/basics/
- errdetails package on pkg.go.dev: https://pkg.go.dev/google.golang.org/genproto/googleapis/rpc/errdetails
- Protocol Buffers Encoding (varint tag encoding): https://protobuf.dev/programming-guides/encoding/

## Issues Found

1. **Outdated claim about unknown enum value handling (fixed).**
   The original text stated: "Adding new enum values - Old clients treat unknown values as the default (0)." This reflects pre-3.5 proto3 behavior. In modern proto3, unrecognized enum values are preserved as their underlying integer value rather than being coerced to 0 (open enums in C++/Go; closed enums in Java still expose the integer via accessor methods). Replaced with an accurate explanation that recommends handling unknown values via a `default` branch.

2. **Missing status code 15 (DATA_LOSS) (fixed).**
   The status code table jumped from 14 (UNAVAILABLE) directly to 16 (UNAUTHENTICATED), omitting 15 (DATA_LOSS), which is a real gRPC canonical status code ("Unrecoverable data loss or corruption"). Added the row for completeness.

## Review Notes

- **`go_package` option syntax**: The semicolon-separated form `"github.com/mycompany/api/inventory/v1;inventorypb"` is valid and widely used, but the official Go protobuf docs now discourage it in favor of just the import path (letting the package name derive automatically). Not strictly wrong, so left as-is to preserve the author's style; readers using fresh codebases may want to consult the current Go protobuf guidance.
- **`SendAndClose` vs `CloseAndRecv`**: The post only shows server-side client-streaming code, which correctly uses `stream.SendAndClose(response)`. On the client side the corresponding call is `stream.CloseAndRecv()`; the post does not conflate these, so no fix needed.
- **`if err == io.EOF`**: gRPC streams traditionally return `io.EOF` as a direct sentinel, so the direct comparison is idiomatic and works. Modern Go style would prefer `errors.Is(err, io.EOF)`, but the post's form is correct.
- **Field number encoding (1–15 → 1 byte, 16–2047 → 2 bytes)**: Verified against the protobuf encoding spec. Correct.
- **proto3 `optional` keyword**: Verified — fully supported since protobuf 3.15 for explicit presence tracking on scalars; recommended by current docs.
- **Status code numbers**: All listed code numbers (0–14, 16) match the canonical gRPC status code list.
- **`errdetails` import path and `BadRequest_FieldViolation`**: Verified current and correct at `google.golang.org/genproto/googleapis/rpc/errdetails`.
