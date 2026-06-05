# Validation Summary: How to Monitor RBAC Authorization Decisions Across Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Flask route decorators
- RBAC authorization instrumentation
- Prometheus alert rules and histogram queries
- SQL-style observability backend queries

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- Flask view decorator documentation: https://flask.palletsprojects.com/en/stable/patterns/viewdecorators/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Flask route-handler snippet used routes such as `/api/v1/orders/<order_id>`, but the decorator only looked for `resource_id` or `id` in `kwargs`. That meant the example would pass `None` as the resource identifier for the order routes. Updated the decorator to also check `kwargs.get(f"{resource_type}_id")`, so `order_id` is correctly used for `resource_type="order"`.

## Review Notes
- The OpenTelemetry tracing calls, span attributes, span events, counter creation, counter `.add()`, histogram creation, and histogram `.record()` usage match the current OpenTelemetry Python APIs.
- The Flask decorator ordering and `functools.wraps` usage match Flask's documented view decorator pattern.
- The Prometheus alert expressions are plausible for a Prometheus-style backend, but exact metric names can vary depending on the OpenTelemetry exporter and backend normalization rules.
- The metrics include high-cardinality attributes such as user identity in the denial counter. That can be useful for security investigation but should be controlled carefully in production metric pipelines.
