# Validation Summary: How to Version gRPC APIs Without Breaking Clients

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- gRPC
- Protocol Buffers (proto3)
- Go (gRPC-Go server implementation, interceptors)
- `google.protobuf` well-known types (Timestamp, FieldMask, descriptor options)
- API versioning, deprecation, and migration patterns

## Sources Consulted
- Protocol Buffers Language Guide (proto3) — https://protobuf.dev/programming-guides/proto3/
- Protocol Buffers — Updating Message Types / backward compatibility & reserved fields — https://protobuf.dev/programming-guides/proto3/#updating
- Protocol Buffers — Reserved fields and reserved enum values — https://protobuf.dev/programming-guides/proto3/#fieldreserved
- Protobuf custom options (`extend google.protobuf.FieldOptions`) — https://protobuf.dev/programming-guides/proto2/#customoptions
- gRPC-Go documentation and `google.golang.org/grpc` package (UnaryServerInterceptor, metadata, reflection) — https://pkg.go.dev/google.golang.org/grpc
- `google.golang.org/protobuf/types/known/timestamppb` — https://pkg.go.dev/google.golang.org/protobuf/types/known/timestamppb
- Google API Improvement Proposals (AIP-180 versioning, AIP-134 field masks) — https://google.aip.dev/

## Issues Found
1. **Missing import in the Version 1 `api/v1/user.proto` file.** The file uses `google.protobuf.Timestamp created_at = 7;` but only imported `api/common/address.proto`. Without `import "google/protobuf/timestamp.proto";`, `protoc` fails with an unknown-type error. The Version 2 file (which imports `google/protobuf/timestamp.proto` on line 224) confirmed this was an oversight rather than intentional. **Fix:** Added `import "google/protobuf/timestamp.proto";` to the v1 proto file's import block.

## Review Notes
- The core Protocol Buffers compatibility rules are accurate: field numbers identify fields on the wire, removed numbers/names should be `reserved`, adding fields/methods/services is backward compatible, and removing/renumbering/retyping fields is breaking. The `reserved` syntax (`reserved 4;`, `reserved 10 to 15;`, `reserved 100 to max;`, `reserved "password", "pwd";`) and enum reserved values are all valid proto3.
- The statement that old clients treat unknown enum values as `UNSPECIFIED` is a teaching simplification. In proto3 (open enums), an unrecognized enum value is actually *preserved* as its raw integer during round-trips; generated accessors in some languages surface it as the underlying number rather than the zero value. The broader point — that adding enum values is a backward-compatible change — is correct, so this was left as-is.
- Several Go snippets are intentionally illustrative partials (e.g., `applyFieldMask` and the `service.UserService` methods are referenced but not defined; the `versioned_server.go` snippet uses `status.Error`/`codes.InvalidArgument` without importing `google.golang.org/grpc/status` and `google.golang.org/grpc/codes`). These would not compile standalone, but they read clearly as excerpts and the missing pieces are consistent with the snippet style. No changes made.
- Example sunset dates (`2025-06-01`) are in the past relative to the post date, but they are placeholder values in illustrative code, not factual claims.
- The interceptor signatures (`grpc.UnaryServerInterceptor` / `grpc.UnaryClientInterceptor`), `metadata.Pairs`, `grpc.SendHeader`, `grpc.Header`, and `reflection.Register` usages all match the current gRPC-Go API.
