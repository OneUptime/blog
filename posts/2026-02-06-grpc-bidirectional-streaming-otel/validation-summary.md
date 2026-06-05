# Validation Summary: How to Instrument gRPC Bidirectional Streaming with OpenTelemetry for

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry RPC semantic conventions
- gRPC bidirectional streaming
- Go
- Protocol Buffers

## Sources Consulted
- OpenTelemetry Semantic Conventions for gRPC: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry RPC attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/rpc/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- gRPC Go basics tutorial: https://grpc.io/docs/languages/go/basics/
- gRPC Go generated-code reference: https://grpc.io/docs/languages/go/generated-code/
- OpenTelemetry Go trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace

## Issues Found
- The proto snippet did not include a `package` or `go_package` option even though the Go snippets import generated code from `example.com/chat/proto`. Added both so the proto aligns with Go code generation.
- The server-side Go snippet imported `context` and `log` without using them, which would fail Go compilation. Removed the unused imports.
- The OpenTelemetry RPC attributes used older or non-current names such as `rpc.system`, `rpc.service`, and `rpc.grpc.message.*`. Updated RPC span attributes to current semantic conventions (`rpc.system.name` and fully qualified `rpc.method`) and used custom `stream.*` attributes for per-message and aggregate stream details that do not have current standard RPC replacements.
- The client parent span lacked RPC semantic attributes. Added `rpc.system.name` and `rpc.method` to match the server-side span.

## Review Notes
The general guidance is technically sound: gRPC bidirectional streams allow both sides to read and write independently, and OpenTelemetry spans can be nested so a stream-level span can have child spans for per-message work. The per-message `stream.*` attributes are custom attributes rather than standard semantic convention attributes.
