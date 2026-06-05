# Validation Summary: How to Monitor Asyncio Event Loop Performance with OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- asyncio
- OpenTelemetry Metrics API and SDK for Python
- OTLP metrics exporter
- Event loop performance monitoring

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python SDK metrics documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python metric export documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry Python resource documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Python asyncio event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html
- Python asyncio tasks documentation: https://docs.python.org/3/library/asyncio-task.html

## Issues Found
- The setup example created the OpenTelemetry resource with `Resource(attributes=...)`. The OpenTelemetry Python SDK documentation says resources should be created with `Resource.create(...)` in application code, so the example was updated to use `Resource.create(...)`.
- The callback queue monitor attempted to call `asyncio.get_running_loop()` from inside an OpenTelemetry observable callback. With `PeriodicExportingMetricReader`, observable callbacks can run from the metric reader thread, where there is no running asyncio loop. The example was updated to capture the loop during async application startup with `set_loop(asyncio.get_running_loop())` and have the observable callback use that stored loop.
- The callback queue example imported `sys` even though it was unused and omitted imports for `asyncio` and `Optional` in that snippet. The imports were corrected.

## Review Notes
- The callback queue depth approach uses the private `_ready` attribute of CPython's default event loop implementation. The post already notes that this is implementation-specific and may not work on all Python versions or event loop implementations.
- The complete example keeps the monitor task running indefinitely, which is appropriate for a long-running service but would need cancellation or shutdown handling in a short script or test.
