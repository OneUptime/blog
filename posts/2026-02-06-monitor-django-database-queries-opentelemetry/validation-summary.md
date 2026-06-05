# Validation Summary: How to Monitor Django Database Queries with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Django
- OpenTelemetry Python
- OpenTelemetry Django instrumentation
- OpenTelemetry database instrumentation for psycopg2, mysqlclient, and sqlite3
- Python
- SQL query tracing and metrics

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python Django instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/django/django.html
- OpenTelemetry Python Psycopg2 instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/psycopg2/psycopg2.html
- OpenTelemetry Python mysqlclient instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/mysqlclient/mysqlclient.html
- OpenTelemetry Python metrics instrumentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- Django database instrumentation: https://docs.djangoproject.com/en/4.2/topics/db/instrumentation/
- Django database query optimization: https://docs.djangoproject.com/en/6.0/topics/db/optimization/
- Django database/query logging FAQ: https://docs.djangoproject.com/en/6.0/faq/models/
- Django QuerySet API reference: https://docs.djangoproject.com/en/6.0/ref/models/querysets/
- Django managers documentation: https://docs.djangoproject.com/en/3.2/topics/db/managers/

## Issues Found
- The auto-instrumentation install commands omitted `opentelemetry-distro` and `opentelemetry-exporter-otlp`, which provide the zero-code CLI tooling and OTLP exporter commonly needed by the later commands. Added both packages.
- The mysqlclient instrumentation package was listed as `opentelemetry-instrumentation-mysql`, which applies to MySQL Connector/Python rather than mysqlclient. Changed it to `opentelemetry-instrumentation-mysqlclient`.
- The automatic instrumentation claims overstated guaranteed row and parameter capture. Reworded them to reflect that statement detail and row counts depend on instrumentation settings, driver support, and semantic convention availability.
- The manual instrumentation example subclassed Django's `CursorWrapper` but did not show a supported way to install it. Replaced it with Django's documented `connection.execute_wrapper()` hook.
- The custom queryset example used `models.Manager` without importing `models`. Added the missing import.
- The N+1 detection wording implied the custom queryset `_fetch_all()` override would directly catch lazy foreign-key lookups. Reworded it to describe queryset-level context and correlation with repeated query spans/duplicate query metrics.
- The query analysis middleware mutated `settings.DEBUG` during a request. Replaced that with a development-only guard because `connection.queries` is only populated when Django `DEBUG` is enabled.
- The transaction example referenced `trace.SpanKind.CLIENT`; changed it to import and use `SpanKind` directly from `opentelemetry.trace`.
- The connection pool monitor used synchronous up-down counters for absolute pool state, which would accumulate values incorrectly. Replaced those instruments with observable gauges and callbacks returning `Observation` values.
- The optimized queryset example used `only()` with `select_related()` without including the connector foreign-key fields. Added `author_id` and `category_id`.
- The query analysis section described a management command as a view. Corrected the wording.
- The Mermaid diagram still referenced the old cursor wrapper and N+1 wording. Updated it to match the corrected examples.

## Review Notes
The examples are still illustrative and assume the shown models, fields, and backend pool APIs exist in the target project. The middleware and `connection.queries` examples are appropriate for development/debug analysis; production monitoring should rely primarily on OpenTelemetry instrumentation and exported telemetry rather than enabling Django debug query logging.
