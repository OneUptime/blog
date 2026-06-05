# Validation Summary: How to Trace Python subprocess Calls with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python subprocess module
- OpenTelemetry Python API and SDK
- OTLP gRPC exporter
- W3C trace context propagation
- Python ThreadPoolExecutor and contextvars

## Sources Consulted
- Python subprocess documentation: https://docs.python.org/3/library/subprocess.html
- Python contextvars documentation: https://docs.python.org/3/library/contextvars.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry CLI/process semantic conventions: https://opentelemetry.io/docs/specs/semconv/cli/cli-spans/

## Issues Found
- The child process context propagation example called `extract(carrier)` without importing `extract` inside the child script. Added `from opentelemetry.propagate import extract`.
- The child process example started a span without configuring an OpenTelemetry SDK/exporter in the child process, so the example would create a no-op span unless the child was separately instrumented. Added child-process SDK and OTLP exporter setup matching the parent example.
- The long-running process helper called `process.kill()` in the generic exception handler even if `subprocess.Popen()` failed before `process` was assigned, which would mask the original startup error. Initialized `process = None` and guarded cleanup.
- The long-running process timeout path killed the process without calling `communicate()` afterward. Added `process.communicate()` after `kill()` to follow Python's documented timeout cleanup pattern.
- The parallel command example submitted work to `ThreadPoolExecutor` without carrying the active OpenTelemetry context into worker threads, so worker spans could be disconnected from the parent trace. Added `contextvars.copy_context()` and submitted `ctx.run`.
- Removed the unused `TraceContextTextMapPropagator` import from the context propagation example.

## Review Notes
The post uses custom `subprocess.*` span attributes for readability. Future revisions could align more closely with OpenTelemetry semantic conventions such as `process.command_args`, `process.exit.code`, and `process.pid` where applicable.
