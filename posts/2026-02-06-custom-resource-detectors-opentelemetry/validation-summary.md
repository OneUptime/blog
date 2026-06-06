# Validation Summary: How to Implement Custom Resource Detectors for OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Resources and resource detectors
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry semantic conventions
- Python `requests`, `unittest`, and `concurrent.futures`
- Go `context`, `net/http`, and JSON decoding

## Sources Consulted
- OpenTelemetry Python SDK resources documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Go resources documentation: https://opentelemetry.io/docs/languages/go/resources/
- OpenTelemetry Go `sdk/resource` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/resource
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry deployment semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry resource semantic conventions documentation: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/

## Issues Found
- The post used the deprecated `deployment.environment` resource attribute. Updated examples and guidance to use the current stable `deployment.environment.name` attribute.
- The minimal Python detector used non-standard deployment-scoped attributes for version and region. Updated `deployment.version` to `service.version` and `deployment.region` to `cloud.region` to align with semantic conventions where applicable.
- The Go example imported `semconv/v1.24.0` and used `semconv.DeploymentEnvironment`, which reflects the old deployment environment attribute. Updated the import to `semconv/v1.37.0` and the helper to `semconv.DeploymentEnvironmentName`.
- The parallel detection example used `as_completed(..., timeout=...)`, which can raise `TimeoutError` before returning the partial results described by the surrounding text. Reworked the example to use `concurrent.futures.wait`, merge completed detector results, warn for pending detectors, and shut down without waiting for unfinished tasks.
- The parallel detection example referenced `logger` without defining it in the snippet. Added `logging` import and logger initialization.
- The failure-path test used the built-in `ConnectionError`, but the detector catches `requests.RequestException`. Updated the test to raise `requests.ConnectionError` so the example exercises the intended failure path.
- The opening paragraph implied that all SDKs ship cloud and Kubernetes detectors directly. Adjusted the wording to include OpenTelemetry contrib packages, which is more accurate across languages.

## Review Notes
- Python code snippets were parsed with Python 3.12 and are syntactically valid.
- Go is not installed in the local review environment, so the Go snippet was checked against official package documentation rather than compiled locally.
- The post intentionally uses internal custom attributes such as `internal.team`; this is acceptable because they are namespaced outside OpenTelemetry semantic convention namespaces.
