# Validation Summary: How to Use pytest-opentelemetry for Python Test Observability

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- pytest-opentelemetry
- OpenTelemetry Python API and SDK
- OTLP/gRPC trace exporting
- pytest
- GitHub Actions
- Python

## Sources Consulted
- pytest-opentelemetry PyPI project documentation: https://pypi.org/project/pytest-opentelemetry/
- pytest-opentelemetry 1.1.0 package source from the published wheel, including `plugin.py`, `instrumentation.py`, `resource.py`, and package metadata.
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python API documentation for tracing: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python SDK environment variables documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/environment_variables.html
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- pytest output and traceback documentation: https://docs.pytest.org/en/stable/how-to/output.html
- GitHub Actions workflow syntax for service containers and environment variables: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The post said installing the plugin and setting environment variables was enough for every run to export spans. The current pytest-opentelemetry documentation and package source require `--export-traces` for OTLP export, so the run commands and explanatory text were updated.
- The post described exporting to any OpenTelemetry-compatible backend and installing an exporter of choice. pytest-opentelemetry 1.1.0 currently documents OTLP over gRPC export support, so the wording was narrowed to OTLP/gRPC-compatible backends or Collectors.
- The span hierarchy described module spans. The published package source creates a session span, test case spans, setup/call/teardown spans, and fixture setup/teardown spans, not module spans. The hierarchy diagram and explanation were corrected.
- The `traced_db` fixture kept the `db.connect` span open across the fixture yield, which would make the connection span cover the whole test rather than only connection setup. The `yield` was moved after the connection span block.
- The GitHub Actions example used a bare OpenTelemetry Collector service without a collector configuration. Since the official Collector Docker documentation requires a configuration file for the Collector to start and route telemetry, the example was changed to export directly to a configured OTLP endpoint stored in a GitHub Actions secret.
- The sampling example set a tracer provider in `conftest.py`, which can conflict with plugin and SDK startup configuration. It was replaced with standard OpenTelemetry sampler environment variables.
- The final setup summary omitted `--export-traces`. It now explicitly says to run pytest with that option.

## Review Notes
The examples still use placeholder application functions and exceptions such as `create_test_connection`, `create_user`, and `ValidationError`; that is acceptable for illustrative snippets but a future revision could note that they represent application-specific code.
