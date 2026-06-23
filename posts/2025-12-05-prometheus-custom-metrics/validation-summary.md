# Validation Summary: How to Implement Custom Metrics in Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus custom metrics (Counter, Gauge, Histogram, Summary)
- Go (`github.com/prometheus/client_golang`: `prometheus`, `promauto`, `promhttp`)
- Python (`prometheus_client`, Flask, FastAPI / Starlette)
- Node.js (`prom-client`, Express)
- Prometheus metric naming conventions and label cardinality best practices

## Sources Consulted
- client_golang docs (promauto / prometheus / promhttp): https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- client_python Counter docs: https://prometheus.github.io/client_python/instrumenting/counter/
- client_python Labels docs: https://prometheus.github.io/client_python/instrumenting/labels/
- client_python `_total` suffix behavior (Issue #677): https://github.com/prometheus/client_python/issues/677
- prom-client (siimon) README/API: https://github.com/siimon/prom-client
- Prometheus metric/label naming conventions: https://prometheus.io/docs/practices/naming/

## Issues Found
No technical issues found.

Key checks that passed:
- **Go**: `promauto.NewCounterVec/NewGauge/NewHistogramVec/NewSummaryVec` signatures are correct; `prometheus.NewTimer(vec.WithLabelValues(...)).ObserveDuration()` is valid (the `*Vec.WithLabelValues` result satisfies `prometheus.Observer`); `promhttp.Handler()` and Summary `Objectives` usage are current and correct.
- **Python**: `Counter`, `Gauge`, `Histogram`, `Summary` constructor signatures (positional `name`, `documentation`, `labelnames`; keyword `buckets`) are correct. The potential gotcha of naming a counter `http_requests_total` was verified — `prometheus_client` strips the trailing `_total` internally and re-adds it at exposition, so the metric is exposed correctly as `http_requests_total` (no `_total_total`, no exception). Flask (`make_wsgi_app`, `DispatcherMiddleware`) and FastAPI (`generate_latest`, `CONTENT_TYPE_LATEST`, `BaseHTTPMiddleware`) integrations are accurate.
- **Node.js**: `prom-client` `Registry`, `collectDefaultMetrics`, metric constructors, `startTimer`, and `.labels({...}).inc()/.observe()` (object form of `.labels()` is supported) are correct; `register.metrics()` returns a Promise and is correctly `await`ed; `register.contentType` is valid.
- Metric type semantics in the overview diagram and the naming/unit-suffix tables align with Prometheus conventions.

## Review Notes
- Minor (not an error): The Python client strips a trailing `_total` on counter names (see Issue #677). Naming the counter `http_requests_total` works as written, but authors who want the exposed name to differ should be aware of this normalization. No change needed.
- Minor (not an error): Using `endpoint` set from a raw request path (`r.URL.Path`, `req.path`, `request.url.path`) as a label can introduce high cardinality on APIs with path parameters (e.g. `/users/123`). The post already calls out cardinality in its best-practices section, so this is consistent guidance.
- All version-agnostic APIs used are current as of the review date; no deprecated calls were found.
