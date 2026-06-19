# Validation Summary: How to Implement Observability in Microservices

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Python API and SDK
- OTLP HTTP exporters
- FastAPI and Starlette middleware
- Python structured logging
- Distributed tracing and context propagation
- Prometheus / PromQL dashboards and alerting
- SLO and error budget calculations

## Sources Consulted
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API docs: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python trace API docs: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Python resource SDK docs: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/resources.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry database attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/
- OpenTelemetry messaging attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/telemetry/open-telemetry
- FastAPI middleware docs: https://fastapi.tiangolo.com/tutorial/middleware/
- Starlette middleware docs: https://starlette.dev/middleware/
- Python datetime docs: https://docs.python.org/3/library/datetime.html

## Issues Found
- Removed an unused `FastAPIInstrumentor` import from the setup example because the snippet did not configure a FastAPI app for instrumentation.
- Updated RED metric attributes from deprecated OpenTelemetry HTTP semantic names to stable custom labels that match the PromQL queries in the post (`method`, `route`, `scheme`, `status`).
- Replaced deprecated `datetime.utcnow()` usage with `datetime.now(timezone.utc)` and UTC ISO formatting.
- Added a missing `asyncio` import to the custom tracing decorator example.
- Added missing `Status` and `StatusCode` imports to the traced HTTP client example and removed the unused `extract` import.
- Updated manual HTTP span attributes from deprecated `http.method`, `http.url`, and `http.status_code` to current `http.request.method`, `url.full`, and `http.response.status_code`.
- Corrected the metrics correlation example to avoid using `trace_id` as a metric attribute, which would create high-cardinality time series.
- Updated semantic convention examples for database and messaging attributes to current names such as `db.system.name`, `db.namespace`, `db.operation.name`, `db.query.text`, `messaging.destination.name`, and `messaging.operation.type`.

## Review Notes
The examples remain illustrative and still assume application-specific functions such as `process_order`, `validate_order`, and `metrics_client` exist. The PromQL snippets may need adaptation for the exact backend/exporter label normalization rules used in production.
