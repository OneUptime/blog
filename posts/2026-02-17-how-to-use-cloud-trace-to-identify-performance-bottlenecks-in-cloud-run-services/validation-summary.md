# Validation Summary: How to Use Cloud Trace to Identify Performance Bottlenecks in Cloud Run Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Trace
- Google Cloud Monitoring
- Google Cloud CLI
- OpenTelemetry Python
- Flask
- Python `concurrent.futures`
- PostgreSQL / pg8000

## Sources Consulted
- Google Cloud Run distributed tracing documentation: https://docs.cloud.google.com/run/docs/trace
- Google Cloud Run minimum instances documentation: https://docs.cloud.google.com/run/docs/configuring/min-instances
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring request-response SLI metrics documentation: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Google Cloud OpenTelemetry Cloud Trace exporter documentation: https://google-cloud-opentelemetry.readthedocs.io/en/stable/cloud_trace/cloud_trace.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry requests instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- Python `contextvars` documentation: https://docs.python.org/3/library/contextvars.html

## Issues Found
- Cloud Run tracing was described as if every request always produces a visible trace. Updated the wording to say Cloud Run creates sampled trace spans, matching Cloud Run's documented sampling behavior.
- The cold start example recorded `cloud_run.init_duration_ms` on every request handled by a new instance. Updated the code to mark only the first request per instance and added a lock so the example remains correct when concurrent requests arrive.
- The database tracing example used older OpenTelemetry database semantic attributes (`db.system`, `db.statement`). Updated them to current names (`db.system.name`, `db.query.text`).
- The database example called `cursor.execute(query, params)` even when `params` was `None`. Updated it to call `cursor.execute(query)` when no parameters are provided.
- The downstream service example used `trace.StatusCode.ERROR`, which is not the documented OpenTelemetry Python status API. Updated it to import and use `Status` and `StatusCode` from `opentelemetry.trace`.
- The parallel `ThreadPoolExecutor` example did not propagate Python context variables into worker threads, which can detach child spans from the active request trace. Updated the example to submit each task with a copied context.
- The `gcloud monitoring policies create` example used non-current `--condition-threshold-*` flags. Replaced them with the current documented flags: `--aggregation`, `--duration`, and `--if`.

## Review Notes
The post is now technically valid. Future improvements could mention that custom instrumentation can incur Cloud Trace billing and that SQL text in spans should be sanitized or parameterized to avoid exposing sensitive data.
