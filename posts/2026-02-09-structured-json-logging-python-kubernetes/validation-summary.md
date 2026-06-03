# Validation Summary: How to Use Structured JSON Logging for Python Applications Running in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python logging
- python-json-logger
- structlog
- Kubernetes Deployments and Downward API
- Flask
- FastAPI / Starlette
- SQLAlchemy event listeners
- Celery task signals
- OpenTelemetry Python tracing

## Sources Consulted
- Python logging documentation: https://docs.python.org/3/library/logging.html
- Python JSON Logger documentation: https://nhairs.github.io/python-json-logger/latest/quickstart/
- structlog 23.2.0 API reference: https://www.structlog.org/en/23.2.0/api.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Flask logging documentation: https://flask.palletsprojects.com/en/stable/logging/
- Starlette request documentation: https://starlette.dev/requests/
- SQLAlchemy Core events documentation: https://docs.sqlalchemy.org/en/21/core/events.html
- Celery signals documentation: https://docs.celeryq.dev/en/latest/userguide/signals.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- Uvicorn logging documentation: https://uvicorn.dev/concepts/logging/

## Issues Found
- The python-json-logger examples used `%(timestamp)s` and `%(level)s` in formatter strings while renaming the native `asctime` and `levelname` fields. This can raise a logging `KeyError` with python-json-logger 2.0.7. Updated the formatter strings to use native `logging.LogRecord` fields and rename them to the intended JSON keys.
- The first `LoggerAdapter` example discarded per-call `extra` fields such as `version` and `port` on Python versions where `LoggerAdapter` does not merge extras. Added a small adapter subclass that merges Kubernetes metadata with per-call extra fields.
- The Kubernetes Deployment snippet omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added `selector.matchLabels` and `template.metadata.labels`.
- The Celery signal handlers did not bind the task `args` and `kwargs` provided by Celery signals correctly. Updated the handler signatures to accept Celery's documented keyword arguments and retain `**signal_kwargs` for forward compatibility.
- The OpenTelemetry helper checked `if span`, which still succeeds for an invalid non-recording span. Updated it to check `span_context.is_valid` before adding trace IDs.
- The production logging configuration sent error logs to both stdout and stderr because the stdout handler accepted every level at or above `DEBUG`. Added a max-level filter so errors are emitted only by the stderr handler.

## Review Notes
The article pins older but still usable versions such as python-json-logger 2.0.7, structlog 23.2.0, Flask 3.0.0, FastAPI 0.109.0, and Uvicorn 0.27.0. Future updates could refresh those pins, but the APIs used in the post remain technically valid after the fixes above.
