# Validation Summary: How to Set Up Structured Logging in Go with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go
- OpenTelemetry Go SDK and OTLP trace exporter
- slog
- zerolog
- zap
- otelzap
- Structured logging and trace correlation

## Sources Consulted
- Go slog package documentation: https://pkg.go.dev/log/slog
- Go slog announcement: https://go.dev/blog/slog
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry OTLP gRPC trace exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry trace context in non-OTLP log formats: https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/
- zerolog package documentation: https://pkg.go.dev/github.com/rs/zerolog
- zap package documentation: https://pkg.go.dev/go.uber.org/zap
- otelzap package documentation: https://pkg.go.dev/github.com/uptrace/opentelemetry-go-extra/otelzap

## Issues Found
- Removed unused imports from several Go snippets (`log`, `time`, `os`, `github.com/rs/zerolog/log`, and `errors` where applicable) so the examples are syntactically valid Go.
- Replaced deprecated `zerolog.Dict()` usage with `Event.CreateDict()`, matching the current zerolog documentation.
- Corrected the zerolog OpenTelemetry section, which described a hook-based approach while the code used explicit context-aware helpers. The revised text explains that hooks can read contexts attached with `Event.Ctx` or `Context.Ctx`, while the example uses helper functions.
- Corrected the otelzap example by removing `otelzap.WithTraceIDField(true)`, which is mentioned in prose in the package documentation but is not present in the current exported API index. The text now explains that otelzap records context-aware log calls on the active span and that explicit JSON `trace_id`/`span_id` fields should use the manual zap helper shown later.
- Fixed the `LogError` helper so it no longer panics when `errors.Unwrap(err)` returns nil. It now adds a `cause` field only when an unwrap target exists and uses `logger.LogAttrs` to log `slog.Attr` values directly.
- Adjusted trace-correlation wording to use `trace_id` and `span_id`, consistent with OpenTelemetry guidance for non-OTLP log formats, and avoided overclaiming that every logger configuration automatically injects both IDs into every JSON log entry.

## Review Notes
Go is not installed in the local environment, so I could not run `go test`, `go vet`, or `gofmt` against extracted snippets. The review was performed against current official package documentation and API indexes.
