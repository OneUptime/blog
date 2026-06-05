# Validation Summary: How to Set Up OpenTelemetry TracerProvider and OTLP Exporter in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- OpenTelemetry Go API and SDK
- OpenTelemetry TracerProvider
- OpenTelemetry span processors and samplers
- OTLP trace exporters over gRPC and HTTP
- OpenTelemetry resource semantic conventions

## Sources Consulted
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Go resources documentation: https://opentelemetry.io/docs/languages/go/resources/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Go package documentation for `go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc`: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- Go package documentation for `go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp`: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- Go package documentation for `go.opentelemetry.io/otel/sdk/resource`: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/resource
- Go package documentation for `go.opentelemetry.io/otel/sdk/trace`: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- Go package documentation for `go.opentelemetry.io/otel/semconv/v1.17.0`: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.17.0

## Issues Found
- Added the missing `go get` command for `go.opentelemetry.io/otel/exporters/stdout/stdouttrace`, because the tutorial uses the stdout trace exporter in development examples.
- Removed unused imports from the production gRPC exporter snippet so the example compiles as shown.
- Removed unused imports from the HTTP exporter snippet so the example compiles as shown.
- Corrected the production setup description by replacing the unsupported "connection pooling" claim with exporter timeout configuration.
- Fixed the custom sampler snippet by adding required imports for `context`, `resource`, and `semconv`, and removing unused imports.
- Corrected the custom sampler explanation to clarify that head-based samplers can only use attributes available at span creation; latency or errors recorded later require tail sampling, commonly in the OpenTelemetry Collector.
- Fixed the multiple span processors snippet by adding required imports for `codes`, `resource`, and `semconv`, removing unused imports, and correcting the processor comment.
- Updated the environment-based gRPC configuration to use `WithEndpointURL` with `OTEL_EXPORTER_OTLP_ENDPOINT`, because the official OTLP endpoint environment variable uses a URL with a scheme, while `WithEndpoint` expects only `host:port`.

## Review Notes
The examples were statically reviewed against official OpenTelemetry documentation and Go package documentation. Local `go test` or snippet compilation could not be run because the Go toolchain is not installed in this workspace.
