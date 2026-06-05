# Validation Summary: How to Use opentelemetry-instrument CLI for Zero-Code Python Instrumentation

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Python zero-code instrumentation
- `opentelemetry-instrument` CLI
- `opentelemetry-bootstrap` CLI
- OTLP exporter configuration
- Flask
- FastAPI and Uvicorn
- SQLAlchemy
- Celery
- Docker
- Kubernetes

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry resource concepts and semantic resource attributes: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry SQLAlchemy instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry FastAPI instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- SQLAlchemy declarative mapping migration docs: https://docs.sqlalchemy.org/21/changelog/migration_20.html
- Local `opentelemetry-instrument --help` output from `opentelemetry-instrumentation` 0.63b1
- Local `opentelemetry-bootstrap --help` output from `opentelemetry-instrumentation` 0.63b1
- PyPI package index output for `opentelemetry-distro` and `opentelemetry-exporter-otlp`

## Issues Found
- The post used unsupported resource environment variables `OTEL_SERVICE_VERSION` and `OTEL_DEPLOYMENT_ENVIRONMENT`. Replaced them with `service.version` and `deployment.environment.name` in `OTEL_RESOURCE_ATTRIBUTES`.
- The Kubernetes example used the older `deployment.environment` resource attribute. Updated it to `deployment.environment.name`.
- The SQLAlchemy example imported `declarative_base` from `sqlalchemy.ext.declarative`, which is legacy in SQLAlchemy 2.x. Updated it to import from `sqlalchemy.orm`.
- The post claimed plain Python code inside handlers is directly traced. Clarified that the elapsed time is included in the HTTP server span unless custom spans are added.
- The Flask section claimed database queries were traced in an app that had no database code. Narrowed the statement to supported HTTP server requests and external calls.
- The SQLAlchemy span attribute description over-promised table names and unconditional query text. Reworded it to describe query-related attributes as dependent on semantic convention and configuration.
- The FastAPI/Uvicorn command said it instruments both FastAPI and Uvicorn. Reworded it to describe running Uvicorn with FastAPI instrumentation enabled.
- Removed unsupported `OTEL_PYTHON_SQLALCHEMY_CAPTURE_STATEMENT_PARAMS`; the current SQLAlchemy instrumentation docs do not define that env var.
- Replaced outdated `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED` with the current `OTEL_PYTHON_LOG_AUTO_INSTRUMENTATION` logging configuration variable.
- Replaced invalid `opentelemetry-instrument --list`, `--instrumentors`, and `--exclude-instrumentors` examples with `opentelemetry-bootstrap`, explicit package installation, and `OTEL_PYTHON_DISABLED_INSTRUMENTATIONS`.
- Replaced the misleading sample debug output with generic module-level debug output, since the exact "Instrumented flask" lines are not guaranteed.
- Replaced `curl http://localhost:4317`, which is not a valid check for the default OTLP/gRPC endpoint, with a TCP connectivity check using `nc -vz localhost 4317`.
- Updated version-pinning examples from outdated 2024-era OpenTelemetry versions to current package versions available on 2026-06-05.
- Tightened overbroad claims that auto-instrumentation works with any Python application or always provides full distributed tracing.

## Review Notes
The post is technically valid after edits. Auto-instrumentation still depends on installed instrumentation packages and supported library versions, so future maintenance should refresh package versions and CLI help output when OpenTelemetry Python releases change.
