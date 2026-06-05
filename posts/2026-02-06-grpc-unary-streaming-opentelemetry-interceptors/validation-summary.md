# Validation Summary: How to Instrument gRPC Unary and Streaming Calls with OpenTelemetry Interceptors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- gRPC
- Go
- Java
- Python
- Distributed tracing

## Sources Consulted
- OpenTelemetry Go `otelgrpc` package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- OpenTelemetry Java instrumentation repository and supported libraries: https://github.com/open-telemetry/opentelemetry-java-instrumentation
- Maven artifact listing for `io.opentelemetry.instrumentation:opentelemetry-grpc-1.6`: https://mvnrepository.com/artifact/io.opentelemetry.instrumentation/opentelemetry-grpc-1.6
- OpenTelemetry Python gRPC instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/grpc/grpc.html
- OpenTelemetry gRPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry RPC attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/rpc/

## Issues Found
- The Go section described current `otelgrpc.NewServerHandler()` and `otelgrpc.NewClientHandler()` usage as interceptors. Current official Go documentation uses gRPC stats handlers for this package, and older interceptor-related APIs are deprecated. Updated the text to say telemetry handlers for Go and instrumentation hooks more generally.
- The Go client snippet used deprecated `grpc.Dial`. Updated it to `grpc.NewClient` and added missing imports and basic error handling.
- The Java dependency version `2.2.0-alpha` was outdated. Updated it to `2.28.1-alpha`, the current Maven Central release available during review.
- The Java snippet referenced `openTelemetry` without defining it and omitted core gRPC/OpenTelemetry imports. Added `GlobalOpenTelemetry.get()` and required imports.
- The Python snippets omitted the generated protobuf module imports and left the client channel open. Added the generated module imports and used a channel context manager.
- The post said request metadata is captured automatically. Updated this to clarify that metadata capture is opt-in/configurable.
- The post listed deprecated semantic-convention attributes (`rpc.system`, `rpc.service`, `rpc.grpc.status_code`) as current. Updated them to the current RPC semantic conventions (`rpc.system.name`, fully qualified `rpc.method`, and `rpc.response.status_code`).
- The post said streaming calls automatically get message-level events with deprecated `rpc.message.*` attributes. Updated this to note that message-level events are implementation-specific and, for Go, require `otelgrpc.WithMessageEvents(...)`.

## Review Notes
The examples still use placeholder generated protobuf packages and service implementations, which is normal for a blog snippet. A production example would also show tracer provider/exporter setup and service shutdown handling.
