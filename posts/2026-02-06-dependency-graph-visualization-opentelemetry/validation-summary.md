# Validation Summary: How to Use OpenTelemetry Data for Dependency Graph Visualization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry traces
- OpenTelemetry semantic conventions
- OpenTelemetry Python metrics API
- Python
- Mermaid diagrams
- Service dependency graphs / service maps

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry RPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Mermaid flowchart syntax documentation: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- The introduction claimed every trace contains all information needed and that generated graphs always reflect reality. This was too absolute because tracing depends on instrumentation, context propagation, and sampling. Updated the language to describe observed production behavior from sampled traces.
- The dependency explanation said each span has a parent span and that parent-child processing builds a complete map. Root spans do not have parents, and messaging traces may use span links instead of direct parent-child relationships. Updated the explanation to say non-root spans have parents and added a caveat for asynchronous messaging links.
- The Python extractor used `datetime.utcnow()`, which is deprecated in Python 3.12+. Replaced it with `datetime.now(timezone.utc)` and imported `timezone`.
- The protocol detection checked legacy semantic convention attributes such as `http.method`, `rpc.system`, and `db.system` but not the current stable names `http.request.method`, `rpc.system.name`, and `db.system.name`. Updated the code to check current names first and retain legacy fallbacks.
- The error counter only recognized a string status code of `ERROR`. Updated the code to also recognize `STATUS_CODE_ERROR` and the stable `otel.status_code` attribute when present.
- The OpenTelemetry Python metrics snippet used `metrics.Observation(...)`. Official examples import `Observation` from `opentelemetry.metrics`, so the snippet now imports and uses `Observation` directly.
- The metrics snippet referenced `current_graph` without defining it. Added a minimal `current_graph = DependencyGraph()` placeholder so the example has a defined value to observe.
- The practical uses section said dependency graph generation requires no additional instrumentation effort. Updated this to apply to already instrumented service calls.

## Review Notes
The examples are illustrative and still assume a backend-specific `trace_client.query_traces()` shape, because OpenTelemetry itself standardizes telemetry data and APIs but not a universal query API for stored traces. The Python code blocks were checked for syntax after the edits.
