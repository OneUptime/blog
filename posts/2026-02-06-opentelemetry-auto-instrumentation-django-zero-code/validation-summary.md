# Validation Summary: How to Set Up OpenTelemetry Auto-Instrumentation in Django

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python zero-code instrumentation
- OpenTelemetry Django instrumentation
- Django
- Python
- OTLP exporter configuration
- Docker and docker-compose
- Gunicorn and uWSGI
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry Django instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/django/django.html
- OpenTelemetry Django instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/django.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python logging instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OneUptime OpenTelemetry telemetry docs: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- The post claimed Django auto-instrumentation captures traces, metrics, and logs directly. Updated this to clarify that Django instrumentation captures request traces and HTTP server metrics, while database, cache, outbound HTTP, and logging telemetry require the matching instrumentation packages and configuration.
- The post claimed Django instrumentation creates spans for template rendering and middleware execution timing. Removed those claims because the official Django instrumentation creates request spans, records HTTP server metrics, supports request/response hooks and header/request attributes, and inserts OpenTelemetry middleware, but does not document built-in template spans or per-middleware timing spans.
- The post listed database and cache spans as Django instrumentation features. Updated the wording to say those spans come from database-specific and cache-client instrumentation packages when installed.
- The OneUptime OTLP header used `x-oneuptime-service-token`. Updated it to the documented `x-oneuptime-token`.
- The control snippet used unsupported "enable only these libraries" variables, including `OTEL_PYTHON_PSYCOPG2_INSTRUMENT=True`. Replaced it with the documented Django disable variable behavior and kept `OTEL_PYTHON_DISABLED_INSTRUMENTATIONS`.
- The Django excluded URLs example used shell-style globs. Updated it to regex patterns, as OpenTelemetry expects comma-delimited regular expressions.
- The trace flow diagram showed template rendering spans. Replaced that portion with cache/outbound client spans to match supported auto-instrumentation behavior.
- The verification section included a template span example and overly definite initialization log wording. Removed the template span and softened the log claim to debug output.
- The performance section claimed typical overhead below 1 ms per request without an official source. Replaced it with a benchmark-in-your-environment recommendation.
- The SQL privacy guidance used an unsupported `OTEL_PYTHON_DJANGO_INSTRUMENT_SQL_QUERY_PARAMS` variable. Replaced it with general guidance to review and sanitize database instrumentation query text.
- The troubleshooting section used `OTEL_LOG_LEVEL=debug`. Updated it to the documented Python logging instrumentation variable `OTEL_PYTHON_LOG_LEVEL=debug`.
- The Django settings snippet implied manual OpenTelemetry middleware should be added. Updated it to state that auto-instrumentation inserts OpenTelemetry middleware and that `OTEL_PYTHON_LOG_CORRELATION=true` is needed for trace context injection into log records.

## Review Notes
The core install commands, `opentelemetry-bootstrap -a install`, `opentelemetry-instrument`, OTLP exporter variables, sampling variables, and Docker command structure are consistent with current documentation. The post remains version-general; future updates may want to mention exact OpenTelemetry Python package versions if the blog wants reproducible setup steps.
