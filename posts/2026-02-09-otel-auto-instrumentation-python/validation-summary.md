# Validation Summary: How to use OpenTelemetry auto-instrumentation with Python applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python zero-code auto-instrumentation
- OpenTelemetry Python distro, bootstrap, and instrument CLI
- OTLP exporter configuration
- Flask
- Django
- FastAPI
- SQLAlchemy
- Celery
- Docker and Docker Compose

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Flask instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Django instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/django/django.html
- OpenTelemetry FastAPI instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/fastapi.html
- OpenTelemetry HTTPX instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/httpx/httpx.html
- OpenTelemetry SQLAlchemy instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry Celery instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/celery/celery.html

## Issues Found
- The Flask and Django sections overstated framework instrumentation by saying template rendering and database queries were handled directly by those framework instrumentations. Updated the wording to say the framework instrumentation covers HTTP request handling, while supported database and HTTP client libraries create spans when their own instrumentation packages are installed.
- The Django code example used `json.loads()` without importing `json`. Added the missing import.
- The FastAPI section claimed auto-instrumentation creates spans for dependencies. Updated the claim to routes and background tasks, which aligns with the documented FastAPI/Starlette instrumentation behavior.
- The SQLAlchemy example imported `declarative_base` from the legacy `sqlalchemy.ext.declarative` path. Updated it to `sqlalchemy.orm.declarative_base`.
- The Celery section omitted the documented requirement to initialize tracing and instrumentation after each Celery worker process starts. Added the `worker_process_init` signal setup with `CeleryInstrumentor().instrument()` and clarified the run instructions.
- The environment-variable example used non-standard `OTEL_SERVICE_VERSION` and `OTEL_DEPLOYMENT_ENVIRONMENT` variables. Replaced them with `service.version` and `deployment.environment.name` in `OTEL_RESOURCE_ATTRIBUTES`.
- The Docker Compose example used a custom `environment=dev` resource attribute where the semantic convention should be `deployment.environment.name`. Updated the attribute.
- The verification section showed exact expected debug log lines and instrumentation version values that are not documented as stable output. Replaced them with a general instruction to look for loaded instrumentation and exporter configuration messages.

## Review Notes
The CLI examples using `opentelemetry-bootstrap -a install` and `opentelemetry-instrument` flags match the official OpenTelemetry Python zero-code instrumentation documentation. The Python snippets were parsed with Python 3.12 and are syntactically valid after the fixes.
