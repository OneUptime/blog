# Validation Summary: How to Instrument a Go Echo Application with otelecho Middleware

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Echo web framework
- OpenTelemetry Go SDK
- OpenTelemetry otelecho middleware
- OTLP gRPC trace exporter
- OpenTelemetry HTTP client instrumentation
- OpenTelemetry trace propagation

## Sources Consulted
- Echo package documentation: https://pkg.go.dev/github.com/labstack/echo/v4
- otelecho package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/github.com/labstack/echo/otelecho
- OpenTelemetry OTLP gRPC trace exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry global API documentation: https://pkg.go.dev/go.opentelemetry.io/otel
- OpenTelemetry semconv v1.40.0 documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.40.0
- OpenTelemetry otelhttp documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- OpenTelemetry tracetest documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace/tracetest

## Issues Found
- Updated semantic convention imports from `go.opentelemetry.io/otel/semconv/v1.17.0` to `v1.40.0` and replaced older key-based resource attributes with current helper functions.
- Added `otel.SetTextMapPropagator` with W3C Trace Context and Baggage propagation so the distributed tracing claims match the code.
- Fixed missing imports in several Go examples, including `context`, `log`, `time`, `net/http`, `echo`, `otelecho`, and `trace`.
- Corrected the custom middleware example return type from nonexistent `*echo.Engine` to `*echo.Echo`.
- Corrected a middleware comment that said it customized a propagator while using `WithTracerProvider`, then added a real `WithPropagators` example.
- Removed an inaccurate comment claiming the `otelecho.Middleware` server name must match the resource service name.
- Removed a comment saying a grouped health route was skipped by a skipper even though that snippet did not configure a skipper.
- Replaced unused imports in the external HTTP client example and added the imports required by the shown code.
- Changed the testing description from "in-memory exporter" to "in-memory span recorder" to match `tracetest.NewSpanRecorder`.

## Review Notes
Go was not installed in the local environment, so I could not compile the snippets. The examples were reviewed against current official package documentation and corrected for API names, imports, and propagation setup.
