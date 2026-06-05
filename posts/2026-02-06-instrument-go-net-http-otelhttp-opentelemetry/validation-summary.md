# Validation Summary: How to Instrument Go net/http Handlers with otelhttp for OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- net/http
- OpenTelemetry Go API and SDK
- otelhttp instrumentation
- W3C Trace Context propagation

## Sources Consulted
- OpenTelemetry Go Getting Started documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- otelhttp package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- OpenTelemetry Go propagation package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Go otel package documentation: https://pkg.go.dev/go.opentelemetry.io/otel
- OpenTelemetry Go tracetest package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace/tracetest
- OpenTelemetry context propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/

## Issues Found
- The tracer initialization example claimed incoming and outgoing trace context propagation, but it did not configure a text-map propagator. Added `otel.SetTextMapPropagator` with W3C Trace Context and Baggage propagators, matching the OpenTelemetry Go setup guidance.
- The tracer initialization example imported `context`, `log`, and `time` without using them. Removed those imports so the snippet is syntactically correct.
- The basic handler example used `context` and `log` but did not import them. Added the missing imports.
- The custom span example assigned the result of `fetchOrderFromDB` to `order` without using it. Changed the assignment to `_ = fetchOrderFromDB(orderID)` so the example compiles while preserving the illustrated database span.
- The outbound HTTP client example imported `context` without using the package. Removed the unused import.
- The advanced configuration example was missing required imports for `context`, `fmt`, `net/http/httptrace`, `time`, and `trace`, and included unused `metric` and `propagation` imports. Corrected the import list to match the APIs used.

## Review Notes
The otelhttp APIs used in the article are current in the official package documentation. `WithMetricAttributesFn` is deprecated in current otelhttp, but the post does not use it. The local environment did not have the Go toolchain installed, so validation was based on official documentation and static review rather than running `go test`.
