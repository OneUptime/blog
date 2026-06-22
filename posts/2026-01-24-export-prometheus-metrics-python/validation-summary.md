# Validation Summary: How to Export Prometheus Metrics in Python

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Python
- Prometheus
- prometheus_client
- FastAPI
- Gunicorn
- Uvicorn workers
- Celery
- Prometheus Pushgateway

## Sources Consulted
- Prometheus Python client instrumentation docs: https://prometheus.github.io/client_python/instrumenting/
- Prometheus Python client Summary docs: https://prometheus.github.io/client_python/instrumenting/summary/
- Prometheus Python client multiprocess mode docs: https://prometheus.github.io/client_python/multiprocess/
- Prometheus Python client exporting docs: https://prometheus.github.io/client_python/exporting/http/
- Prometheus metric naming best practices: https://prometheus.io/docs/practices/naming/
- Prometheus Pushgateway best practices: https://prometheus.io/docs/practices/pushing/
- FastAPI middleware docs: https://fastapi.tiangolo.com/tutorial/middleware/
- FastAPI custom response docs: https://fastapi.tiangolo.com/advanced/custom-response/
- Celery signal docs: https://docs.celeryq.dev/en/stable/userguide/signals.html

## Issues Found
- The post described Python `Summary` metrics as exposing pre-calculated quantiles. The official Prometheus Python client does not support quantiles for `Summary`, so the table and example comments were corrected to describe count and sum behavior.
- Multiprocess examples used `prometheus_multiproc_dir`. Current Prometheus Python client documentation uses `PROMETHEUS_MULTIPROC_DIR`, so the environment variable checks and comments were updated.
- Multiprocess collection examples created a plain `CollectorRegistry()`. The official examples use `CollectorRegistry(support_collectors_without_names=True)`, so the FastAPI and helper examples were updated.
- The Gunicorn example set the multiprocess directory inside the Python config file. The official docs require the environment variable to be set from the startup shell before the application starts, so the example was corrected.
- The Celery Pushgateway example referenced `REGISTRY` without importing it. The import was added and unused imports were removed.
- The Celery signal handlers counted every `task_postrun` as a success and also decremented in-progress tasks in both failure and postrun handlers. The handlers were adjusted to count success only for `SUCCESS`, count failures in `task_failure`, and decrement in-progress tasks once in `task_postrun`.
- The naming conventions snippet used `Counter` and `Histogram` without importing them. The missing imports were added.

## Review Notes
The article is technically relevant and useful after the fixes. The Pushgateway guidance is acceptable for background or batch-style work, but future revisions could mention that long-running services are usually scraped directly and Pushgateway is primarily intended for service-level batch jobs.
