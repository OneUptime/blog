# Validation Summary: How to Fix Go HTTP Client Spans Showing 'context canceled' Due to otelhttptrace

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Go `net/http`
- Go `context`
- OpenTelemetry Go `otelhttp`
- OpenTelemetry Go `otelhttptrace`
- HTTP client timeout handling

## Sources Consulted
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `http.Client.Do` documentation: https://pkg.go.dev/net/http#Client.Do
- Go `http.NewRequestWithContext` documentation: https://pkg.go.dev/net/http#NewRequestWithContext
- OpenTelemetry Go `otelhttp` package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- OpenTelemetry Go `otelhttptrace` package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/httptrace/otelhttptrace
- OpenTelemetry Go `otelhttp` transport source: https://github.com/open-telemetry/opentelemetry-go-contrib/blob/main/instrumentation/net/http/otelhttp/transport.go
- OpenTelemetry Go `otelhttptrace` client trace source: https://github.com/open-telemetry/opentelemetry-go-contrib/blob/main/instrumentation/net/http/httptrace/otelhttptrace/clienttrace.go

## Issues Found
- The post attributed the error directly to `otelhttptrace` listening for context cancellation. Updated the explanation to match current OpenTelemetry behavior: `otelhttp` records response body read errors on the client span, while `otelhttptrace` adds HTTP phase sub-spans or events.
- The post claimed the response body could be fully read successfully while the span was marked `context canceled`. Updated this to describe the real timeout window: response headers may be present, but the body read is interrupted by context cancellation or deadline expiry.
- The request-level timeout section implied that request contexts avoid the cancellation race. Added the official caveat that outgoing request contexts cover the full request and response lifetime, including response body reads.
- The custom `RoundTripper` wrapper example attempted to clear context cancellation errors when both response and error were non-nil. Replaced it because Go's `Client.Do` documentation says a non-nil response with a non-nil error is not the normal timeout shape, and OpenTelemetry may already have recorded the error.
- The validation test closed the body without reading it, so it did not validate the body-read timeout behavior discussed in the post. Updated the test to read the response body before checking span status.
- The first code example used `context`, `httptrace`, and `time` without importing them. Added the missing imports.

## Review Notes
Transport-level timeouts are accurate for dial, TLS handshake, and response-header limits, but they are not a complete replacement for a whole-response deadline. If a whole-response deadline is required, a body read timeout should be treated as a real request failure rather than filtered out as a false positive.
