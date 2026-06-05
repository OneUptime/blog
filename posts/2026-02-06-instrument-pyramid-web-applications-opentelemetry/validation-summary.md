# Validation Summary: How to Instrument Pyramid Web Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Pyramid
- OpenTelemetry Python API and SDK
- OpenTelemetry Pyramid instrumentation
- OpenTelemetry SQLAlchemy instrumentation
- OpenTelemetry OTLP exporters
- SQLAlchemy
- Waitress

## Sources Consulted
- OpenTelemetry Python Contrib Pyramid instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/pyramid/pyramid.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Contrib SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- Pyramid 2.0 deprecations and security policy migration notes: https://docs.pylonsproject.org/projects/pyramid/en/main/whatsnew-2.0.html
- Pyramid security API documentation: https://docs.pylonsproject.org/projects/pyramid/en/latest/api/security.html
- Pyramid view and exception view API documentation: https://docs.pylonsproject.org/projects/pyramid/en/latest/api/view.html
- SQLAlchemy 2.0 declarative mapping documentation: https://docs.sqlalchemy.org/20/orm/declarative_tables.html

## Issues Found
- The post used `PyramidInstrumentor().instrument_app(app)`, but the current Pyramid instrumentor exposes configurator-based instrumentation (`instrument()` or `instrument_config(config)`) and no `instrument_app` method. Updated the basic and production examples to call `PyramidInstrumentor().instrument_config(config)` before `make_wsgi_app()`.
- The introduction overstated automatic Pyramid instrumentation as capturing view execution and template rendering. Updated the wording to distinguish automatic HTTP request spans from custom spans for view and template-related work.
- The SQLAlchemy example used the legacy `sqlalchemy.ext.declarative.declarative_base` import and `session.query(...)` style. Updated it to SQLAlchemy 2.x-style `DeclarativeBase`, `select()`, and `session.scalars(...)`.
- The SQLAlchemy instrumentation claim said query spans include parameters. Updated it to avoid promising parameter capture and describe SQL statement information and timing instead.
- The template section had an unused renderer import and implied automatic template-specific tracing. Removed the unused import and clarified that the request span covers response rendering while the custom span traces data preparation.
- The authentication example imported deprecated or unavailable Pyramid APIs (`authenticated_userid` from `pyramid.security`, plus unused legacy auth policy classes). Updated the example to use `request.authenticated_userid`, removed unused deprecated imports, and extended `request.response.headerlist` with the headers returned by `remember()`.
- The metrics example passed an `OTLPSpanExporter` to `PeriodicExportingMetricReader`, which fails because metric readers require a metric exporter. Added `OTLPMetricExporter` and configured the metric reader with it.

## Review Notes
The examples are illustrative snippets and do not include a complete Pyramid security policy, route table, or template configuration. The Python code blocks were parsed with `ast.parse`, and current package APIs were inspected in an isolated temporary `pip --target` install.
