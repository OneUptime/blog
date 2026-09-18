# Validation Summary: Evolve Proto3 Scalars to `optional` Without Breaking Older gRPC Clients

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Protocol Buffers (proto3)
- gRPC
- Go generated protobuf APIs (Open Struct and Opaque)
- Protobuf binary wire format
- ProtoJSON and JSON gateways
- `google.protobuf.FieldMask`
- Backward-compatible schema evolution

## Sources Consulted
- [Protocol Buffers: Application Note—Field Presence](https://protobuf.dev/programming-guides/field_presence/)
- [Protocol Buffers: Proto3 Language Guide—Updating a Message Type](https://protobuf.dev/programming-guides/proto3/#updating)
- [Protocol Buffers: Go Generated Code Guide (Open)](https://protobuf.dev/reference/go/go-generated/)
- [Protocol Buffers: Go Generated Code Guide (Opaque)](https://protobuf.dev/reference/go/go-generated-opaque/)
- [Protocol Buffers: Encoding](https://protobuf.dev/programming-guides/encoding/)
- [Protocol Buffers: ProtoJSON Format](https://protobuf.dev/programming-guides/json/)
- [Go package documentation: `google.golang.org/protobuf/proto`](https://pkg.go.dev/google.golang.org/protobuf/proto)
- [Go package documentation: `google.golang.org/protobuf/types/known/fieldmaskpb`](https://pkg.go.dev/google.golang.org/protobuf/types/known/fieldmaskpb)

## Issues Found
No technical issues found.

## Review Notes
The post correctly distinguishes binary compatibility from source and application compatibility. The Open Struct API examples correctly use `*int32`, a nil presence check, and `proto.Int32(0)`. The old-reader round-trip matrix and the `08 00` wire fixture agree with protobuf's documented explicit-versus-implicit presence behavior. The Opaque API is the newer Go API, while proto3 files still use the Open Struct API by default unless the API level is overridden.
