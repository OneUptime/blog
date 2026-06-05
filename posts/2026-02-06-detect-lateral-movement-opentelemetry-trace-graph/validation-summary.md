# Validation Summary: How to Detect Lateral Movement Between Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- OpenTelemetry semantic conventions
- Go
- Python
- Microservice security and trace graph analysis

## Sources Consulted
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- OpenTelemetry general service peer attributes: https://opentelemetry.io/docs/specs/semconv/general/attributes/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Go trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html

## Issues Found
- The Go span example used older/non-current HTTP attribute names (`peer.service`, `http.path`, and `http.method`). Updated them to current semantic convention names (`service.peer.name`, `server.address`, `url.path`, and `http.request.method`) and updated the Python analyzer to read the same keys.
- The Go example started a client span but returned only the context, leaving no way for the caller to end the span after the request completed. Updated the function to return the span and added a short comment that the caller should end it after the request completes.
- `isKnownCallPath` accepted a destination parameter but ignored it, so it did not actually compare against a service-to-service dependency graph. Updated the example map to key allowed paths by source and destination service.
- The Python analyzer indexed `spans[0]` without checking for empty trace results. Added guards in baseline building and trace analysis.
- The section titled "Emitting Detection Results as OTel Events" emitted a metric counter, not span events. Renamed the section and wording to describe OpenTelemetry metrics accurately.
- The metric example imported `trace` but did not use it. Removed the unused import.

## Review Notes
The Python snippets were parsed successfully with Python AST checks. The local environment did not have `go` or `gofmt` installed, so the Go snippet could not be compiled locally; its OpenTelemetry APIs and semantic convention usage were checked against official documentation.
