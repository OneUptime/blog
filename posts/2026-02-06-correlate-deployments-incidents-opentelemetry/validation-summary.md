# Validation Summary: How to Use OpenTelemetry to Correlate Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry resource semantic conventions
- OpenTelemetry Python SDK
- OpenTelemetry OTLP gRPC exporter
- OpenTelemetry Collector
- OpenTelemetry Collector transform processor
- Prometheus / PromQL
- Kubernetes rollback command examples
- Mermaid Gantt diagrams

## Sources Consulted
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry deployment semantic attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry service semantic attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- OpenTelemetry HTTP metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Prometheus querying basics and functions: https://prometheus.io/docs/prometheus/latest/querying/basics/ and https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The resource example used the deprecated `deployment.environment` semantic attribute through `ResourceAttributes.DEPLOYMENT_ENVIRONMENT`. Updated the snippet to use current string attribute names, including `deployment.environment.name`, `service.name`, and `service.version`.
- The CI/CD deployment span used non-standard service/deployment attribute names and `deployment.status="completed"`, while the deployment semantic convention defines `deployment.status` values such as `succeeded` and `failed`. Updated the example to use `service.name`, `service.version`, `deployment.environment.name`, and `deployment.status="succeeded"`.
- The CI/CD example used a `BatchSpanProcessor` in a short-lived script without flushing or shutting down the provider. Added `provider.shutdown()` after recording the deployment so the span is exported before the job exits.
- The Collector section said the Collector stores deployment events and marks recently deployed services, but the shown configuration only forwards telemetry and cannot compute recency. Updated the wording and transform attribute to mark telemetry that carries deployment context instead of claiming a recent-deployment correlation inside the Collector.
- The OTLP Collector exporter pointed at an internal gRPC endpoint without TLS settings. Added `tls.insecure: true` for the plaintext example endpoint.
- The PromQL example used older/non-standard HTTP request count metric and status label names. Updated it to use the Prometheus-normalized OpenTelemetry HTTP server duration count series and `http_response_status_code`.
- The introductory outage percentage claim was too specific without a source in the article. Reworded it to a broader incident-review statement while preserving the article's point.

## Review Notes
- The correlation engine is illustrative pseudocode and depends on application-specific implementations of `deployment_store`, `incident`, and `get_service_dependencies`.
- The PromQL query assumes the OpenTelemetry metrics backend exposes resource attributes such as `service.name` as Prometheus labels normalized to names like `service_name`.
- Python snippets were checked with `ast.parse`, and the Collector YAML block was parsed with PyYAML in the local environment.
