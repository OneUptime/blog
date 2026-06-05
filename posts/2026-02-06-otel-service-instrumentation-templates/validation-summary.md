# Validation Summary: How to Create Service-Specific Instrumentation Templates That Teams Can Adopt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK and Node.js auto-instrumentation
- OpenTelemetry Python SDK and contrib instrumentations
- OTLP/gRPC trace and metric exporters
- OpenTelemetry resource semantic conventions
- Kubernetes Downward API environment variables
- Helm values snippets
- Cookiecutter and npm/PyPI-style internal package distribution
- Jaeger trace query smoke testing

## Sources Consulted
- OpenTelemetry JavaScript NodeSDK API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry JavaScript resources API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript OTLP gRPC trace exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry JavaScript HTTP instrumentation docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-http.html
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python Flask instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python requests instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry Python SQLAlchemy instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry OTLP exporter configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- Kubernetes Downward API docs: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/

## Issues Found
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript docs show resources should be created with `resourceFromAttributes(...)`, so the import and resource creation were updated.
- The Node.js example used `metricReader` in `NodeSDK`. Current NodeSDK API examples use `metricReaders` for the list of metric readers, so the configuration was updated to an array.
- The Node.js HTTP instrumentation config used `ignoreIncomingPaths`, which is not a current documented option. Replaced it with `ignoreIncomingRequestHook` and path matching logic for `/health`, `/ready`, and `/metrics`.
- The Python example used the deprecated `deployment.environment` resource attribute. Updated it to the current stable `deployment.environment.name` semantic convention.
- The Python OTLP/gRPC exporter example set the local `http://localhost:4317` endpoint without `insecure=True`. Official Python OTLP gRPC examples pass `insecure=True` for that endpoint, so the template now derives `insecure` from an `http://` endpoint and passes it to trace and metric exporters.

## Review Notes
The remaining SDK initialization flow, Flask, requests, and SQLAlchemy instrumentation calls align with current OpenTelemetry documentation. The Kubernetes `fieldRef` example uses Downward API-supported fields, including `metadata.labels['app.kubernetes.io/name']` and `metadata.namespace`. The smoke test assumes the local Docker Compose file defines `otel-collector` and `jaeger` services and that tests emit at least one trace for `OTEL_SERVICE_NAME`; this is reasonable as a template-specific validation step but depends on each generated service's Compose file and test workload.
