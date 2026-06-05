# Validation Summary: How to Troubleshoot Python OpenTelemetry Producing Duplicate Spans

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Python
- OpenTelemetry Python API and SDK
- OpenTelemetry Python Flask instrumentation
- OpenTelemetry Python auto-instrumentation CLI
- Flask and Werkzeug development reloader
- Gunicorn

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python auto-instrumentation example: https://opentelemetry.io/docs/zero-code/python/example/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python Contrib BaseInstrumentor source: https://github.com/open-telemetry/opentelemetry-python-contrib/blob/main/opentelemetry-instrumentation/src/opentelemetry/instrumentation/instrumentor.py
- OpenTelemetry Python trace API source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-api/src/opentelemetry/trace/__init__.py
- Flask debugging documentation: https://flask.palletsprojects.com/en/stable/debugging/
- Flask command-line/debug mode documentation: https://flask.palletsprojects.com/en/stable/cli/
- Gunicorn settings documentation: https://gunicorn.org/reference/settings/

## Issues Found
- The original double-initialization example showed `FlaskInstrumentor().instrument()` being called twice and stated that it instruments again. Current OpenTelemetry `BaseInstrumentor` tracks `is_instrumented_by_opentelemetry` and returns early with a warning when the same instrumentor is already instrumented. I changed the example to focus on duplicate exporter/provider setup, which can produce duplicated exports when setup code runs more than once.
- The Flask reloader fix used `os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug` before `app.run(debug=True)`. That is brittle because `app.debug` may not yet reflect the `debug=True` argument at that point. I replaced it with the documented OpenTelemetry/Flask approach of disabling the reloader with `use_reloader=False` while debugging instrumentation setup.

## Review Notes
The diagnostics section inspects private OpenTelemetry SDK attributes such as `_active_span_processor` and `_span_processors`. This is acceptable as a debugging-only technique, but it should not be used as production control flow because those internals are not part of the public API.
