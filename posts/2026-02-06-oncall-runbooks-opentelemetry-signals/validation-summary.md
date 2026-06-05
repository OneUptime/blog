# Validation Summary: How to Implement On-Call Runbooks Powered by OpenTelemetry Signals

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry signals and semantic conventions
- Python dataclasses and type hints
- Incident response runbooks
- Alerting integrations
- Kubernetes kubectl remediation commands

## Sources Consulted
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry service resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/concepts/semantic-conventions/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- The post used `http.server.errors` as though it were a standard OpenTelemetry HTTP metric. OpenTelemetry's current HTTP server semantic conventions define `http.server.request.duration` and associated attributes such as `http.response.status_code`, `error.type`, and `http.route`. Updated the example queries to use `http.server.request.duration` with a backend-specific count/rate aggregation over 5xx responses.
- The post used `labels` in the OpenTelemetry query examples. OpenTelemetry semantic conventions describe attributes, not labels. Updated the query examples to use `attributes`.
- The trace query filtered on `otel.status_code`, which is not a standard OpenTelemetry semantic attribute. Updated the illustrative query to filter by span status separately with `status: "ERROR"` while keeping `service.name` as an attribute.
- The Python examples used `datetime.utcnow()`, which is deprecated in Python 3.12 and later because it returns a naive UTC datetime. Updated the code to use `datetime.now(timezone.utc)` and imported `timezone`.
- Added a short clarification that OpenTelemetry standardizes signals and semantic names, while the query dictionary shape depends on the user's observability backend or adapter.

## Review Notes
The Python code blocks are syntactically valid after the changes. The telemetry clients, query dictionaries, and helper functions such as `analyze_error_origins` remain illustrative abstractions rather than a complete SDK implementation, which is appropriate for this guide as long as readers adapt them to their backend.
