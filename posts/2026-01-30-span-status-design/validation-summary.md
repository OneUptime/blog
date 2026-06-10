# Validation Summary: How to Create Span Status Design

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry (specification, semantic conventions)
- OpenTelemetry Python SDK (`opentelemetry-api`, `opentelemetry-sdk`)
- OpenTelemetry JavaScript / Node.js SDK (`@opentelemetry/api`)
- OpenTelemetry Go SDK (`go.opentelemetry.io/otel`)
- Distributed tracing concepts (parent/child spans, status propagation)
- Mermaid diagrams (flowchart, sequenceDiagram)

## Sources Consulted
- OpenTelemetry Trace API specification – Set Status: https://opentelemetry.io/docs/specs/otel/trace/api/#set-status
- OpenTelemetry status code definitions: https://opentelemetry.io/docs/specs/otel/trace/api/#status
- OpenTelemetry Python API – `Status` and `StatusCode`: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.status.html
- OpenTelemetry Python source for `Status` (description-with-OK behavior): https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-api/src/opentelemetry/trace/status.py
- OpenTelemetry JavaScript API – `SpanStatusCode`, `Span#setStatus`, `Span#recordException`, `Tracer#startActiveSpan`: https://open-telemetry.github.io/opentelemetry-js/
- OpenTelemetry Go API – `tracer.Start`, `Span.SetStatus`, `Span.RecordError`, `Span.SetAttributes`, `codes` package: https://pkg.go.dev/go.opentelemetry.io/otel and https://pkg.go.dev/go.opentelemetry.io/otel/codes
- OpenTelemetry Go `attribute` package: https://pkg.go.dev/go.opentelemetry.io/otel/attribute

## Issues Found
1. **Go example – missing/unused imports (compile errors).** The Go snippet under "Status Propagation in Distributed Systems" used `attribute.String("order.id", orderID)` but did not import `go.opentelemetry.io/otel/attribute`. It also imported `"errors"` and `"go.opentelemetry.io/otel/trace"` but never referenced them; in Go, unused imports are compile errors. Fixed the import block: removed `"errors"` and the unused `trace` import, and added `"go.opentelemetry.io/otel/attribute"`.
2. **Python OK-status example – passed a description with `StatusCode.OK`.** The retry example called `Status(StatusCode.OK, "Succeeded after retry")`. The OpenTelemetry specification states that the description MUST be ignored for any status code other than `Error`, and the Python SDK actively logs a warning ("description should only be set when status_code is set to StatusCode.ERROR") if a description is supplied with `OK`. Updated the example to use `Status(StatusCode.OK)` and added a short comment explaining why the description is omitted.

## Review Notes
- The three-status model (UNSET / OK / ERROR), the recommendation to leave successful spans as UNSET, and the guidance that `OK` is primarily used by application developers (not library authors) to explicitly mark success / override an `Error` set earlier all align with the OpenTelemetry spec.
- The Python and JavaScript examples (`set_status`/`setStatus`, `record_exception`/`recordException`, `start_as_current_span`/`startActiveSpan`) match the current public APIs. Note that `tracer.startActiveSpan` in JS does **not** auto-end the span, so the example's explicit `span.end()` in the `finally` block is correct.
- Status transition semantics are spec-evolving: most SDKs treat `OK` as final once set, while `Error` can be overridden by subsequent `Error` or `OK`. The post's framing of `OK` as an "override escape hatch" is a reasonable simplification but readers implementing strict spec behavior should consult the current Trace API spec linked above.
- The `error.type` / `error.message` attributes shown in the JS example are now standardized under the OpenTelemetry semantic conventions for exceptions (`exception.type`, `exception.message`, `exception.stacktrace`). Using `error.*` as custom attributes is still valid for filtering, but teams may want to align with the `exception.*` conventions used by `recordException`.
- The Go snippet references undefined helpers (`processPayment`, `fulfillOrder`) — acceptable for an illustrative example; no change needed.
