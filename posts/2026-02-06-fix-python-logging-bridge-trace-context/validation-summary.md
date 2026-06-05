# Validation Summary: How to Fix OpenTelemetry Python Logging Bridge Not Correlating Logs

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Python
- Python logging
- OpenTelemetry logs bridge and log-trace correlation
- OTLP trace and log exporters
- OpenTelemetry Python zero-code instrumentation
- Flask instrumentation

## Sources Consulted
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python logs auto-instrumentation example: https://opentelemetry.io/docs/zero-code/python/logs-example/
- OpenTelemetry Python SDK log internals showing SDK LoggingHandler deprecation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/_logs/_internal.html
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html

## Issues Found
- The post used `opentelemetry.sdk._logs.LoggingHandler` as the primary setup path. Current OpenTelemetry Python emits a deprecation warning for that SDK handler and directs users to the handler from `opentelemetry-instrumentation-logging`, so the examples now use `LoggingInstrumentor().instrument(...)`.
- The setup only configured the handler level, but Python's root logger defaults to `WARNING`, so the post's `INFO` examples could be filtered before OpenTelemetry received them. The examples now set the root logger level to `INFO` where needed.
- The example trace and span IDs were too short and not valid OpenTelemetry ID lengths. They were replaced with a 32-character trace ID and a 16-character span ID.
- The custom formatter checked `span.is_recording()`, which can hide a valid non-recording span context. It now checks `ctx.is_valid` before formatting trace and span IDs.
- The auto-instrumentation section said `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true` is required. Current OpenTelemetry Python documentation says this was only required before 1.40.0 when `opentelemetry-instrumentation-logging` is installed, so the command and explanation were updated.
- The Flask example referred to a Flask request span without showing Flask instrumentation and used an undefined `db` object. It now instruments the Flask app and returns a simple response object so the example is coherent.

## Review Notes
The post is technically relevant and salvageable. The OpenTelemetry Python logs API and SDK area continues to evolve, so future reviews should re-check the logging instrumentation package behavior and log exporter import paths against the current OpenTelemetry Python documentation.
