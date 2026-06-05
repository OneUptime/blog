# Validation Summary: How to Trace Go Template Rendering with OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- `html/template`
- `text/template`
- OpenTelemetry Go SDK
- OTLP trace gRPC exporter
- OpenTelemetry spans, span status, and error recording

## Sources Consulted
- Go `html/template` package documentation: https://pkg.go.dev/html/template
- Go `text/template` package documentation, including `FuncMap` behavior: https://pkg.go.dev/text/template
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Go `trace` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Go OTLP trace gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0

## Issues Found
- The code started spans with `ctx, span :=` in functions where the returned context was never used, which would cause unused-variable compilation errors in Go. Changed those cases to ignore the returned context where it was not needed.
- The OpenTelemetry error handling used only custom `error.message` attributes. Updated error paths to call `span.RecordError(err)` and `span.SetStatus(codes.Error, err.Error())`, matching OpenTelemetry Go guidance that recording an error does not automatically mark the span status as error.
- The semantic conventions import used `go.opentelemetry.io/otel/semconv/v1.21.0`. Updated it to the current `v1.37.0` package referenced by the OpenTelemetry Go documentation.
- The template function wrapper started function spans from `context.Background()`, so those spans would not be children of the request/template trace. Added a helper that accepts a `context.Context` as the first template function argument and updated the example templates/handler to pass the active request context through the template data.
- The `calculateTotal` example expected `[]interface{}`, but the sample data passed `[]map[string]interface{}`. Updated `calculateTotal` and its wrapper dispatch so the product-list template works with the shown data.
- The range-loop explanation claimed `{{range}}` loops create many child spans. The sample does not instrument range actions directly, so the text now says loops can create many template function spans when instrumented functions are called per item.

## Review Notes
- The code was statically reviewed against official documentation, but it was not compiled locally because the `go` binary is not installed in this environment.
