# Validation Summary: How to Troubleshoot OpenTelemetry Python SDK Not Exporting Metrics with

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Python SDK metrics
- OpenTelemetry Python SDK tracing
- OpenTelemetry Python automatic instrumentation
- Gunicorn pre-fork worker model and server hooks
- Python Flask
- OTLP HTTP exporters

## Sources Consulted
- OpenTelemetry Python fork process model example, https://opentelemetry-python.readthedocs.io/en/stable/examples/fork-process-model/README.html
- OpenTelemetry Python automatic instrumentation troubleshooting: pre-fork server issues, https://opentelemetry.io/docs/zero-code/python/troubleshooting/#pre-fork-server-issues
- OpenTelemetry Python manual instrumentation documentation, https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics export API documentation, https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry resources documentation, https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry semantic convention registry for process identity, https://opentelemetry.io/docs/specs/semconv/registry/entities/process/
- Gunicorn settings and server hooks documentation, https://docs.gunicorn.org/en/stable/settings.html

## Issues Found
- The `post_fork` example used a custom `worker.pid` resource attribute, while the rest of the post recommends `process.pid`. I changed it to `process.pid` to match OpenTelemetry process identity conventions and the post's aggregation guidance.
- The `post_worker_init` example used `Resource` and `SERVICE_NAME` without importing them. I added the missing import so the snippet works.
- The Flask test snippet used `@app.route` without defining `app`. I added the minimal Flask import and application initialization.
- The final resource example used `os.getpid()` without importing `os`. I added the missing import.

## Review Notes
The core guidance is technically valid: OpenTelemetry Python documents that multi-worker pre-fork servers can break metrics because `PeriodicExportingMetricReader` uses a background thread, and Gunicorn provides `post_fork`, `post_worker_init`, and `worker_exit` hooks with the signatures shown. The `opentelemetry-instrument` workaround is accurate for WSGI Gunicorn deployments; for ASGI apps, OpenTelemetry's current troubleshooting documentation also recommends Gunicorn with `uvicorn.workers.UvicornWorker` as an alternative.
