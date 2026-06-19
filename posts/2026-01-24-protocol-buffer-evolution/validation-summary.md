# Validation Summary: How to Handle Protocol Buffer Evolution

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Protocol Buffers / protobuf
- proto3 schema evolution
- ProtoJSON
- gRPC
- Go protobuf and gRPC generated code

## Sources Consulted
- Protocol Buffers proto3 Language Guide: https://protobuf.dev/programming-guides/proto3/
- Protocol Buffers ProtoJSON Format Guide: https://protobuf.dev/programming-guides/json/
- Protocol Buffers Go Generated Code Guide: https://protobuf.dev/reference/go/go-generated/
- gRPC Introduction: https://grpc.io/docs/what-is-grpc/introduction/
- gRPC Go API documentation: https://grpc.io/docs/languages/go/api

## Issues Found
- The post described adding fields as "always safe." I changed this to "safe for the binary wire format" because ProtoJSON has weaker schema-evolution guarantees and unknown JSON fields can fail parsing.
- The "Safe Type Widening" example changed both `int32` to `int64` and `float` to `double`. Protobuf documents `int32` to `int64` as wire-compatible but conditionally safe, while `float` and `double` do not share a binary wire type. I removed the `float` to `double` example and added a rollout caveat for `int32` to `int64`.
- The dangerous `int32` to `sint32` example described the issue as a different wire format. I changed this to different integer encoding, because both use varint wire type but `sint32` uses zigzag encoding and is not compatible with `int32`.
- The proto3 optional section said all fields are optional by default. I tightened this to distinguish non-required singular fields from implicit scalar presence, where default values cannot be distinguished from unset values.
- The `ProcessConfig` Go snippet assigned `actualValue` without using it, which would not compile as shown. I added blank identifier assignments to keep the illustrative snippet syntactically valid.
- The enum handling Go snippet used `fmt.Sprintf` without importing `fmt`. I added the missing import.
- The runtime deprecation warning Go snippet used `context.Context` without importing `context`. I added the missing import.
- The oneof section described adding a new oneof option as safe without caveats. I added the documented mixed-version caveat: older readers cannot distinguish an unset oneof from a oneof set to an unknown newer option.

## Review Notes
The remaining examples are illustrative and omit surrounding generated types, service constructors, listeners, and repository definitions. That is acceptable for a guide, but a future revision could call out that snippets are partial examples rather than standalone programs.
