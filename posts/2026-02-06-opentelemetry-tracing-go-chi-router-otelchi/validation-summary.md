# Validation Summary: How to Add OpenTelemetry Tracing to a Go Chi Router with otelchi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Chi router
- OpenTelemetry Go SDK
- otelchi middleware
- OTLP trace exporter

## Sources Consulted
- Go package documentation for Chi: https://pkg.go.dev/github.com/go-chi/chi/v5
- Go package documentation for otelchi: https://pkg.go.dev/github.com/riandyrn/otelchi
- OpenTelemetry Go contrib package directory: https://pkg.go.dev/go.opentelemetry.io/contrib
- OpenTelemetry Go SDK trace test helpers: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace/tracetest
- OpenTelemetry semantic conventions package: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry OTLP gRPC trace exporter package: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go exporter documentation: https://opentelemetry.io/docs/languages/go/exporters/

## Issues Found
- The post used the non-existent contrib import path `go.opentelemetry.io/contrib/instrumentation/github.com/go-chi/chi/v5/otelchi`. Changed install and import snippets to the maintained `github.com/riandyrn/otelchi` package, whose documentation provides `Middleware`, `WithChiRoutes`, and `WithFilter`.
- Several Go snippets were missing imports needed by the shown code. Added the missing standard-library imports and removed an unused `go.opentelemetry.io/otel/trace` import from the advanced configuration example.
- The resource example used older semantic conventions. Updated the import to `go.opentelemetry.io/otel/semconv/v1.37.0` and changed `DeploymentEnvironment` to `DeploymentEnvironmentName`.
- The text and diagram described the middleware span as a root span. Changed this to server span because incoming remote context can make the span part of an existing trace rather than always a root.
- The instrumentation visibility wording implied all middleware execution was captured even though middleware registered before otelchi is outside the otelchi span. Changed this to downstream middleware execution time.
- The test expected `GET /test` but did not enable otelchi's request-method span name option. Added `WithChiRoutes(r)` and `WithRequestMethodInSpanName(true)` to match the expected span name.
- The test used `assert` without listing a dependency. Replaced it with standard `testing` assertions.

## Review Notes
The local environment did not have the Go toolchain installed, so I could not run `go test`. The examples were checked against current package documentation and otelchi source behavior instead.
