# Validation Summary: How to Apply RPC Semantic Conventions for gRPC and Thrift Services

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry tracing
- gRPC
- Apache Thrift
- Go
- Python
- OTLP trace export
- SQL-style telemetry queries

## Sources Consulted
- OpenTelemetry RPC span semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/
- OpenTelemetry gRPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry semantic convention releases and migration notes: https://github.com/open-telemetry/semantic-conventions/releases
- OpenTelemetry Go gRPC instrumentation package: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- gRPC Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- OpenTelemetry Python gRPC instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/grpc/grpc.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- gRPC official status code guide: https://grpc.io/docs/guides/status-codes/
- Apache Thrift Python tutorial: https://thrift.apache.org/tutorial/py.html

## Issues Found
- The post used older OpenTelemetry RPC attributes: `rpc.system`, `rpc.service`, and `rpc.grpc.status_code`. Updated examples and explanations to use current RPC semantic convention attributes: `rpc.system.name`, fully qualified `rpc.method`, and `rpc.response.status_code`.
- The post described gRPC status codes as numeric values in semantic convention examples. Updated status examples and queries to use the current string values such as `OK`.
- The gRPC span status mapping was inaccurate for current semantic conventions. Updated the mapping so client spans treat any non-OK response as an error, while server spans only treat the documented gRPC server error codes as errors.
- The Go client example used deprecated `grpc.Dial`. Updated it to `grpc.NewClient` and adjusted the surrounding comment.
- The Go server example used `ctx` without defining it and omitted imports needed by the snippet. Added `context`, `net`, and placeholder generated-protobuf imports, and updated the semantic convention import version.
- The Python OTLP gRPC exporter example omitted the scheme and insecure setting for a plaintext collector endpoint. Updated it to `endpoint="http://otel-collector:4317", insecure=True`.
- The Thrift examples used `rpc.thrift.*` custom attributes under the OpenTelemetry semantic convention namespace. Updated them to `app.thrift.*` custom attributes and clarified that Thrift currently needs a documented custom `rpc.system.name` value.
- The SQL examples referenced dotted attribute names without quoting them. Updated the examples to quote the attribute names.

## Review Notes
Some OpenTelemetry instrumentation libraries may continue emitting older experimental RPC attributes by default until users opt in to stable RPC conventions with `OTEL_SEMCONV_STABILITY_OPT_IN=rpc` or `rpc/dup`. The post now calls out this migration caveat so readers do not accidentally break existing dashboards.
