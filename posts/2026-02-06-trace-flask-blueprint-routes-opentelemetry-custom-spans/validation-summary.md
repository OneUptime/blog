# Validation Summary: How to Trace Flask Blueprint Routes with OpenTelemetry Custom Spans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Flask
- Flask Blueprints
- OpenTelemetry Python API and SDK
- OpenTelemetry Flask instrumentation
- OTLP trace exporter

## Sources Consulted
- OpenTelemetry Flask Instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python context API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Flask Blueprints documentation: https://flask.palletsprojects.com/blueprints/
- Flask request context documentation: https://flask.palletsprojects.com/en/stable/reqcontext/
- Flask JSON response documentation: https://flask.palletsprojects.com/en/stable/patterns/javascript/#return-json-from-views

## Issues Found
- The complete application example used `Blueprint` but imported only `Flask` and `jsonify` from `flask`. I updated the import to `from flask import Flask, Blueprint, jsonify` so the example runs as written.
- The blueprint-specific hook example started `admin.request` with `tracer.start_span()`, which creates a span without making it current. That meant route spans created with `start_as_current_span()` would not be children of `admin.request`. I updated the example to attach the span to the OpenTelemetry context in `before_request` and detach it in `after_request`, matching the OpenTelemetry context API.

## Review Notes
- All Python code blocks parse successfully with `python3`.
- The local environment does not have OpenTelemetry Python packages installed, so runtime execution of OpenTelemetry examples was not performed locally.
- `after_request` handlers are appropriate for the shown successful route examples, but Flask teardown hooks are a better fit for cleanup that must run even when an unhandled exception occurs.
