# Validation Summary: How to Debug Flaky Tests Using OpenTelemetry Traces Captured During CI Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- pytest
- OpenTelemetry Python SDK
- OpenTelemetry OTLP gRPC exporter
- OpenTelemetry HTTPX instrumentation
- OpenTelemetry Collector
- GitLab CI/CD

## Sources Consulted
- pytest API reference for runtest hooks and reports: https://docs.pytest.org/en/stable/reference/reference.html
- pytest hookwrapper example for `pytest_runtest_makereport`: https://docs.pytest.org/en/7.1.x/example/simple.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python exporter guide: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry HTTPX instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/httpx/httpx.html
- OpenTelemetry Collector Docker documentation: https://opentelemetry.io/docs/collector/install/docker/
- GitLab CI services documentation: https://docs.gitlab.com/ci/services/

## Issues Found
- The pytest plugin used `os.environ` without importing `os`. Added the missing import.
- The pytest plugin opened and closed the `test.execute` span inside `pytest_runtest_protocol` before pytest's normal setup/call/teardown phases ran, so `pytest_runtest_makereport` would not update that span as described. Reworked the example to start the span in `pytest_runtest_setup`, keep it in the active context, update it from a `pytest_runtest_makereport` hookwrapper, and end it after the teardown report.
- The OTLP gRPC exporter example used a plaintext HTTP endpoint without explicitly setting `insecure=True`. Added `insecure=True`, matching the OpenTelemetry Python gRPC exporter examples for non-TLS collector endpoints.
- The HTTPX instrumentation snippet imported and called `HTTPXClientInstrumentation`, but the documented class is `HTTPXClientInstrumentor`. Updated the import and call.
- The HTTPX test snippet referenced `tracer` without defining it and imported `httpx` without using it directly. Added `trace.get_tracer("test-runner")` and changed the example to use an `httpx.Client`, so the HTTPX instrumentation applies to the demonstrated request.

## Review Notes
- The analysis code is illustrative and assumes traces have already been normalized into dictionaries with numeric `startTime` and `endTime` values. Real OTLP JSON exports often use `startTimeUnixNano` and `endTimeUnixNano` string fields, so production analysis code should adapt to the export format used by the trace backend.
- The GitLab CI service syntax is valid, but a real pipeline should export traces to a persistent backend or configure the collector explicitly if the default collector image behavior is not sufficient for later analysis.
