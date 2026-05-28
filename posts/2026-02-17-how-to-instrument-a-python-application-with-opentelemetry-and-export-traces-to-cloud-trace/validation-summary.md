# Validation Summary: How to Instrument a Python Application with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- OpenTelemetry Python API and SDK
- Google Cloud Trace
- Google Cloud OpenTelemetry Cloud Trace exporter
- Google Cloud resource detector for OpenTelemetry
- Flask
- FastAPI
- requests
- httpx
- SQLAlchemy
- Docker
- Cloud Run
- gcloud CLI
- Google Cloud IAM

## Sources Consulted
- OpenTelemetry Cloud Trace Exporter documentation: https://google-cloud-opentelemetry.readthedocs.io/en/stable/cloud_trace/cloud_trace.html
- Google Cloud OpenTelemetry resource detector example: https://google-cloud-opentelemetry.readthedocs.io/en/latest/examples/cloud_resource_detector/README.html
- Google Cloud OpenTelemetry API reference: https://google-cloud-opentelemetry.readthedocs.io/en/latest/apireference.html
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python instrumentation libraries documentation: https://opentelemetry.io/docs/languages/python/libraries/
- OpenTelemetry FastAPI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- Google Cloud Trace setup documentation: https://docs.cloud.google.com/trace/docs/setup
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy

## Issues Found
- The FastAPI example used `httpx` for outbound async HTTP calls but imported and initialized `RequestsInstrumentor`, which only instruments the `requests` library. Changed the example to use `HTTPXClientInstrumentor` and added a note to install `opentelemetry-instrumentation-httpx` when using `httpx`.
- The payment example used `trace.StatusCode.ERROR` directly in `set_status`. Updated the snippet to import `Status` and `StatusCode` from `opentelemetry.trace` and call `set_status(Status(StatusCode.ERROR, ...))`, matching the documented OpenTelemetry Python API.
- The Flask example was described as complete but referenced `fetch_orders_from_db(page)` without defining it. Added a small placeholder function so the example is internally runnable while preserving the author's intent that readers replace it with their real database query.
- The Cloud Run Dockerfile said Cloud Run sets `PORT` automatically but hardcoded Gunicorn to `8080`. Updated the command to bind to `${PORT:-8080}`, matching the Cloud Run container runtime contract while keeping a local fallback.

## Review Notes
- The Cloud Trace exporter, GCP resource detector import path, SQLAlchemy instrumentation pattern, Cloud Trace IAM role, and `gcloud run deploy --source` usage match current official documentation.
- The local environment did not have `gcloud` or OpenTelemetry packages installed, so CLI and library API verification was performed against official documentation. Python code fences were parsed with `ast` and passed syntax validation.
