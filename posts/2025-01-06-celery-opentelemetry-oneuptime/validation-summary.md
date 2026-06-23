# Validation Summary: How to Monitor Celery Workers with OpenTelemetry and OneUptime

## Status
validated

## Post Type
Tutorial / Guide — a hands-on walkthrough for instrumenting Celery workers with OpenTelemetry traces and metrics, exporting to OneUptime via OTLP/HTTP.

## Technologies Covered
- Python
- Celery (task queue, signals, control inspection, beat)
- Redis (broker / result backend)
- OpenTelemetry (API + SDK, OTLP/HTTP exporter, Celery instrumentation)
- Flask (health check endpoint)
- FastAPI (producer example)
- Prometheus client
- Docker Compose
- Kubernetes
- OneUptime (OTLP ingestion)

## Sources Consulted
- OpenTelemetry Python SDK docs — TracerProvider, MeterProvider, BatchSpanProcessor, PeriodicExportingMetricReader: https://opentelemetry-python.readthedocs.io/
- OpenTelemetry OTLP HTTP exporter (proto-http) — endpoint paths `/v1/traces`, `/v1/metrics`: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- opentelemetry-instrumentation-celery (CeleryInstrumentor, automatic context propagation between producer and worker): https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/celery/celery.html
- OpenTelemetry metrics API — create_counter, create_histogram, create_observable_gauge, Observation, CallbackOptions: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- Celery signals reference (task_prerun, task_postrun, task_failure, task_retry, worker_ready, worker_shutdown) and signal argument lists: https://docs.celeryq.dev/en/stable/userguide/signals.html
- Celery configuration reference (task_acks_late, worker_prefetch_multiplier, task_serializer, accept_content, enable_utc): https://docs.celeryq.dev/en/stable/userguide/configuration.html
- Celery worker inspection / control (`celery inspect ping`, `app.control.inspect()`): https://docs.celeryq.dev/en/stable/userguide/monitoring.html
- OneUptime OpenTelemetry ingestion docs (OTLP endpoint and `x-oneuptime-token` header): https://oneuptime.com/docs

## Issues Found
1. **Missing `import os` in `metrics.py`** — The `metrics.py` snippet's `get_queue_depth` callback calls `os.getenv('CELERY_BROKER_URL')`, but the module only imported `from opentelemetry import metrics`. `import redis` was placed inside the function, but `os` was never imported, so the callback would raise `NameError: name 'os' is not defined` at metric-collection time. Added `import os` at the top of the snippet. (All other modules in the post — `telemetry.py`, `celery_app.py`, `worker_health.py`, `queue_monitor.py` — already import `os` correctly.)

## Review Notes
- All OpenTelemetry API usage is current and correct: `TracerProvider`/`MeterProvider` setup, `BatchSpanProcessor`, `PeriodicExportingMetricReader` with `export_interval_millis`, and OTLP/HTTP exporter endpoints (`/v1/traces`, `/v1/metrics`) match the proto-http exporter contract. Using a generator (`yield metrics.Observation(...)`) as an observable-gauge callback is valid — callbacks just need to return an iterable of `Observation`.
- Celery signal handler signatures are correct. `task_retry` provides a `request` (Context) object; accessing `request.task`, `request.id`, and `request.retries` is valid. Because Celery dispatches signals with keyword arguments, the handlers' `**kw` catch-alls are appropriate.
- Celery config choices are sound: `task_acks_late=True` with `worker_prefetch_multiplier=1` is the recommended combination for reliable, fairly-distributed task processing; JSON serialization avoids pickle deserialization risks.
- The `/metrics` Flask endpoint uses `prometheus_client.generate_latest()`, which exposes the Prometheus default registry — it will be empty unless tasks also register Prometheus metrics, since the post's custom metrics use the OpenTelemetry SDK (exported via OTLP, not Prometheus). This is not incorrect, but the endpoint is somewhat decorative given the OTLP-based metric flow; future revisions could either wire an OTel Prometheus reader or drop the endpoint to avoid confusion.
- Bare `except:` clauses in the health checks (`check_broker`, `check_worker_responding`, `observe_active_workers`) work but would be better as `except Exception:`. Stylistic only — left as-is to preserve the author's code.
- Endpoint/header conventions (`https://otlp.oneuptime.com`, `x-oneuptime-token`) match OneUptime's documented OTLP ingestion setup.
