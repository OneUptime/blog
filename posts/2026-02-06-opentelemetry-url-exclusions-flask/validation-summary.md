# Validation Summary: How to Configure OpenTelemetry URL Exclusions in Flask Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python
- OpenTelemetry Flask instrumentation
- Flask
- Python regular expressions
- Python unittest

## Sources Consulted
- OpenTelemetry Python Contrib Flask instrumentation documentation/source: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/flask.html
- OpenTelemetry Python SDK InMemorySpanExporter source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-python/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- Flask 3.1 changes documentation: https://flask.palletsprojects.com/en/stable/changes/

## Issues Found
- The post used hard-coded telemetry reduction percentages that were not supported by official documentation. Changed those claims to qualitative statements about reducing telemetry volume and overhead.
- The `/static/.*` explanation implied the regex matches URLs starting with `/static/`, but OpenTelemetry Flask matches excluded URL regexes against the full request URL. Changed the wording to describe matching URLs whose path contains `/static/`.
- Several request-hook examples described dynamic "exclusion" even though OpenTelemetry Flask request hooks run after a span is created. Updated the examples and comments to say hooks mark spans for downstream filtering.
- The HTTP-method example claimed GET and HEAD requests were excluded from tracing, but the code only sets span attributes. Renamed and reworded the section to describe method-based marking instead.
- The environment example used `FLASK_ENV`, which Flask removed in version 2.3. Replaced it with an application-specific `APP_ENV` variable.
- The unit test expected the span name `HTTP GET /api/data`, but OpenTelemetry Flask names route spans as `GET /api/data`. Updated the expected value.

## Review Notes
OpenTelemetry dependencies are not installed in this workspace, so runtime execution of the examples was not possible locally. All Python code blocks were syntax-checked with `python3 compile`, and API behavior was verified against official OpenTelemetry and Flask documentation/source.
