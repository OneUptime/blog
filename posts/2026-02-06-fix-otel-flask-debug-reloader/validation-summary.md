# Validation Summary: How to Fix OpenTelemetry Auto-Instrumentation Breaking Flask Apps When Debug

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Python
- OpenTelemetry Flask instrumentation
- Flask
- Werkzeug development server reloader
- Python
- Gunicorn

## Sources Consulted
- Flask Debugging Application Errors: https://flask.palletsprojects.com/en/stable/debugging/
- Flask Command Line Interface: https://flask.palletsprojects.com/en/stable/cli/
- Werkzeug Serving WSGI Applications: https://werkzeug.palletsprojects.com/en/stable/serving/
- OpenTelemetry Flask Instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python manual instrumentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python trace module source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/trace.html

## Issues Found
- The post described the Werkzeug reloader as forking a child process. Werkzeug documents the reloader server as running in a subprocess, so the wording was changed to "starts a subprocess" and "subprocess" throughout the affected explanation.
- The `WERKZEUG_RUN_MAIN` guard example checked `app.debug` before calling `app.run(debug=True)`. At that point `app.debug` may still be false, causing the parent process to initialize telemetry despite the intended guard. The sample now uses an explicit `debug = True` variable for both the guard and `app.run`.
- The `opentelemetry-instrument` explanation said the reloader subprocess may not pick up instrumentation. The documented zero-code agent wraps the command and configures instrumentation at runtime, while the more accurate risk with a reloader is repeated setup in the subprocess. The wording was corrected.
- The production "direct Python" command used `python wsgi.py`, but the earlier `wsgi.py` example only creates the WSGI app and does not start a server. The command was changed to refer to a Python entrypoint that starts the server (`app.py`) instead.
- The duplicate-provider check used `trace.ProxyTracerProvider`, which is not documented as a public OpenTelemetry Python API class. The snippet now checks for the SDK `TracerProvider` used by the post's examples.

## Review Notes
The remaining examples use documented Flask CLI flags (`--debug`, `--no-reload`) and documented OpenTelemetry Python APIs (`TracerProvider`, `BatchSpanProcessor`, `ConsoleSpanExporter`, `FlaskInstrumentor().instrument_app(app)`, and `opentelemetry-instrument --service_name`). The global `_otel_initialized` flag only protects a single Python process, so it is useful for accidental repeated calls in one process but does not coordinate across Flask reloader subprocesses.
