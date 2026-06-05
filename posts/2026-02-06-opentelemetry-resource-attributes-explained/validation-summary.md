# Validation Summary: How to Understand OpenTelemetry Resource Attributes and Why They Matter

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry resources and semantic conventions
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry environment variable configuration
- Kubernetes environment variable injection
- Prometheus/OpenTelemetry metrics translation

## Sources Consulted
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry resource semantic conventions 1.41.1: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry service resource conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment resource conventions: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
- OpenTelemetry cloud, Kubernetes, and process resource conventions: https://opentelemetry.io/docs/specs/semconv/resource/cloud/, https://opentelemetry.io/docs/specs/semconv/resource/k8s/, https://opentelemetry.io/docs/specs/semconv/resource/process/
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry JavaScript resources API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript semantic conventions package docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry Python resources API: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Go resources documentation: https://opentelemetry.io/docs/languages/go/resources/
- OpenTelemetry Go resource package: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/resource
- Prometheus guide for OpenTelemetry resource attributes: https://prometheus.io/docs/guides/opentelemetry/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/

## Issues Found
- JavaScript resource examples used the deprecated `SemanticResourceAttributes` namespace and `new Resource(...)`. Updated them to use `resourceFromAttributes(...)` and literal semantic attribute keys consistent with current OpenTelemetry JavaScript docs.
- Several examples used the older `deployment.environment` key. Updated them to the current stable `deployment.environment.name` semantic convention.
- The Prometheus metrics explanation implied all resource attributes are directly available as metric labels. Clarified that OpenTelemetry-aware backends often support aggregation by resource attributes, while Prometheus may require resource attribute promotion or joining with `target_info`.
- The Mermaid diagram used `instance.id`, which is not the OpenTelemetry service instance resource attribute. Updated it to `service.instance.id`.
- The Go cost attribution example imported `otel` without using it and called `attribute.String(...)` without importing the `attribute` package. Fixed the imports and updated the service attributes to the current Go semconv key pattern shown in the official docs.
- The Kubernetes example used `OTEL_SERVICE_VERSION`, which is not a standard OpenTelemetry SDK environment variable. Moved `service.version` into `OTEL_RESOURCE_ATTRIBUTES`.
- The service namespace examples used `production` as a namespace, which conflated namespace with deployment environment. Changed examples to logical namespaces such as `payments` and `checkout`.
- The JavaScript process/runtime example used deprecated semantic convention exports and older process executable attributes. Updated it to current literal process, runtime, and OS resource attribute keys.

## Review Notes
The Python `ResourceAttributes` constants still expose some older names in current packages, so examples that need the latest semantic convention names use literal keys where appropriate. Custom organizational attributes such as `team`, `cost.center`, and `business_unit` are intentionally non-standard and should be documented by each organization.
