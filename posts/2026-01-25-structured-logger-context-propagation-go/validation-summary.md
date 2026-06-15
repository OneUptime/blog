# Validation Summary: How to Build a Structured Logger with Context Propagation in Go

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go
- `context.Context`
- `net/http` middleware
- Structured JSON logging
- OpenTelemetry trace context
- `github.com/google/uuid`

## Sources Consulted
- Go `context` package documentation: https://pkg.go.dev/context
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `encoding/json` package documentation: https://pkg.go.dev/encoding/json
- Go `runtime.Caller` documentation: https://pkg.go.dev/runtime#Caller
- Go `time` package documentation: https://pkg.go.dev/time
- OpenTelemetry Go `trace` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- Google UUID Go package documentation: https://pkg.go.dev/github.com/google/uuid

## Issues Found
- The opening comparison used `log.FromContext(ctx)` even though the package shown throughout the article is `logger`. Changed it to `logger.FromContext(ctx)` so the snippet is internally consistent.
- The opening comparison passed an undefined `order` variable to `s.repo.Save` while the function parameter is `orderID`. Changed both examples to pass `orderID`.
- The `statusWriter` middleware wrapper overwrote the captured status on every `WriteHeader` call. Since Go's `net/http` uses the first final `WriteHeader` call for the response, updated the wrapper to record only the first status.
- The sample log output omitted fields that the logger would actually carry from the base and request loggers. Clarified that the sample output omits some request fields for brevity.

## Review Notes
The examples are technically valid as tutorial snippets. In production, the custom logger could also handle `json.Marshal` and `io.Writer` errors, and a response writer wrapper may need to preserve optional interfaces such as `http.Flusher` depending on the handlers it wraps.
