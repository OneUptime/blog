# Validation Summary: How to Create Paved-Path Observability Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry FastAPI instrumentation
- OpenTelemetry JavaScript Node SDK
- OpenTelemetry Collector
- OpenTelemetry semantic conventions
- Kubernetes Deployments
- Kustomize patches

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry FastAPI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry database metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases
- Kubernetes strategic merge patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kustomize deprecation discussion for patchesStrategicMerge: https://github.com/kubernetes-sigs/kustomize/issues/5149

## Issues Found
- The Python setup snippet called `_register_standard_metrics()` without importing it. Added a relative import from `.standard_metrics`.
- The Python prose claimed the snippet initialized logging, but the code only initialized tracing and metrics. Updated the wording to match the code.
- The Python docstring called `OTEL_SERVICE_NAME` required while the code provides a fallback. Changed the docstring to "recommended".
- The HTTP request duration metric used the current semantic-convention name with the old millisecond unit. Changed the unit to seconds.
- The database duration metric used a nonstandard name and millisecond unit. Changed it to `db.client.operation.duration` with seconds.
- The Node.js template used `new Resource(...)`, which is no longer the current OpenTelemetry JS 2.x documentation pattern. Replaced it with `resourceFromAttributes(...)`.
- The Collector OTLP exporter pointed at a plaintext internal endpoint without TLS settings. Added `tls.insecure: true` for the internal gRPC hop.
- The Collector image tag was old. Updated the Kubernetes sidecar image to `otel/opentelemetry-collector-contrib:0.153.0`, the current official Collector release line checked during validation.
- The Kustomize example used deprecated `patchesStrategicMerge`. Replaced it with `patches` and a local patch path.

## Review Notes
The templates are now technically consistent with current OpenTelemetry SDK, semantic convention, Collector, and Kustomize guidance. In a production template, teams should still pin exact package versions and decide whether internal Collector-to-gateway traffic should use TLS with a CA instead of `tls.insecure: true`.
