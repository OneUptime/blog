# Validation Summary: How to Run OpenTelemetry Instrumentation Validation Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry semantic conventions
- Python
- pytest
- GitHub Actions
- PostgreSQL and RabbitMQ service containers
- dorny/test-reporter
- actions/github-script

## Sources Consulted
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python InMemorySpanExporter source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-python/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout documentation: https://github.com/actions/checkout
- actions/setup-python documentation: https://github.com/actions/setup-python
- actions/github-script documentation: https://github.com/actions/github-script
- dorny/test-reporter documentation: https://github.com/dorny/test-reporter
- pytest output and JUnit XML documentation: https://docs.pytest.org/en/stable/how-to/output.html

## Issues Found
- The OpenTelemetry Python in-memory exporter import used `opentelemetry.sdk.trace.export.in_memory`, which is not the current module path. Changed it to `opentelemetry.sdk.trace.export.in_memory_span_exporter`, matching the OpenTelemetry Python source.
- The HTTP span attribute assertions used deprecated semantic convention names `http.method` and `http.status_code`. Updated them to the stable names `http.request.method` and `http.response.status_code`.
- The GitHub Actions workflow used older action major versions. Updated `actions/checkout` to `v5`, `actions/setup-python` to `v6`, `dorny/test-reporter` to `v3`, and `actions/github-script` to `v9`.
- The test reporter was configured with `reporter: java-junit` even though the workflow generates pytest JUnit XML. Changed it to `reporter: python-xunit`, which is the reporter documented by dorny/test-reporter for pytest output.
- The workflow omitted explicit `GITHUB_TOKEN` permissions needed to read actions, create check runs, and comment on pull requests. Added `contents: read`, `actions: read`, `checks: write`, and `pull-requests: write`.

## Review Notes
The Python code blocks were syntax-checked successfully with `ast.parse`. The local workspace does not have `opentelemetry` or `pytest` installed, so runtime execution of the examples was not possible here. The GitHub Actions test reporter and PR comment steps can still be restricted on pull requests from forks because GitHub gives those runs a read-only token by default; a production public-repository setup may need the two-workflow artifact/reporting pattern documented by dorny/test-reporter.
