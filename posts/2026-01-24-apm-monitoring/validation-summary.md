# Validation Summary: How to Implement APM Monitoring

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- Application Performance Monitoring (APM)
- OpenTelemetry
- Python
- FastAPI
- Node.js
- Express
- Prometheus / PromQL alert rules
- Distributed tracing
- Metrics and dashboards

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry FastAPI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry JavaScript Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript 2.x upgrade notes: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript semantic conventions README: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry deployment environment semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- GitHub profile URL: https://github.com/nawazdhandala
- OneUptime website and blog URLs: https://oneuptime.com and https://oneuptime.com/blog

## Issues Found
- The Python resource attributes used `deployment.environment`, which has been superseded by the current semantic convention `deployment.environment.name`. Updated the resource attribute key.
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`, which is not valid for current OpenTelemetry JS 2.x. Updated it to `resourceFromAttributes(...)`.
- The Node.js example used the deprecated `SemanticResourceAttributes` namespace. Updated it to current `ATTR_*` semantic convention constants.
- The Node.js custom span used `startSpan(...)`, which creates a span but does not make it active for nested auto-instrumented work. Updated it to `startActiveSpan(...)`.
- The Node.js error status used the numeric code `2`. Updated it to `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- The custom metrics Python snippet used `trace.get_tracer(...)` without importing `trace`. Added the missing import.
- The custom metrics middleware labeled metrics with the raw URL path, which can create high-cardinality time series for parameterized routes. Updated it to use the FastAPI route template when available.
- The active connections metric was described as a gauge while implemented as an UpDownCounter. Updated the comment to match the OpenTelemetry instrument type.
- The distributed tracing Python snippet used `trace.Status` and `trace.StatusCode`; the documented imports are from `opentelemetry.trace`. Added explicit `Status` and `StatusCode` imports and updated the call.
- Several PromQL `histogram_quantile(...)` examples aggregated classic histogram buckets without preserving the `le` label. Updated alert and dashboard queries to use `sum by (le)` or `sum by (endpoint, le)` as appropriate.
- The Apdex alert expression applied `/ 2` only to the tolerating bucket term due to operator precedence. Updated it to divide the combined cumulative buckets by 2 before dividing by the total count.

## Review Notes
The examples are illustrative and still assume placeholder application functions such as `fetch_order_from_db`, `getUserFromDatabase`, `send_to_slack`, and `send_to_oneuptime` exist. The OpenTelemetry JavaScript package ecosystem continues to evolve, so future reviews should re-check resource and semantic-convention APIs against the current major version.
