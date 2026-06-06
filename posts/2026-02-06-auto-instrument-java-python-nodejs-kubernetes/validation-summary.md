# Validation Summary: How to Auto-Instrument Java, Python, and Node.js Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Operator
- OpenTelemetry Collector
- OpenTelemetry auto-instrumentation
- Kubernetes
- Helm
- cert-manager
- Java
- Python
- Node.js

## Sources Consulted
- OpenTelemetry Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator GitHub README and examples: https://github.com/open-telemetry/opentelemetry-operator
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Kubernetes resource attribute semantic conventions: https://opentelemetry.io/docs/specs/semconv/non-normative/k8s-attributes/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/

## Issues Found
- The introduction said to add a "label" and implied no redeployment was needed. The operator uses pod template annotations for injection, and changing pod template metadata requires new pods, though it does not require rebuilding the application image. Changed the wording to "annotation" and "No rebuilding of your application images."
- The explanation and Mermaid diagram said the init container downloads the agent. The operator injects an init container that provides/copies auto-instrumentation from the instrumentation image into a shared volume. Updated the wording to "copies."
- The prerequisite listed Kubernetes 1.21+ and cert-manager v1.14.4. cert-manager 1.14 is end-of-life, and current cert-manager support depends on release compatibility. Replaced the fixed Kubernetes version with compatibility-based wording and updated the manifest URL to v1.20.2.
- The shared `Instrumentation` resource sent all languages to OTLP gRPC port 4317. Current Java 2.x and Python auto-instrumentation use OTLP/HTTP by default, and OpenTelemetry's OTLP HTTP endpoint convention uses port 4318. Changed the endpoint to port 4318 and added `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`.
- The verification section expected `OTEL_SERVICE_NAME`. The operator commonly injects service identity through resource attributes, so the check is more accurately framed around `OTEL_RESOURCE_ATTRIBUTES`.
- The resource annotation example used `resource.opentelemetry.io/service-name`, which is not the semantic-convention annotation for `service.name`. Changed it to `resource.opentelemetry.io/service.name`.
- The resource annotation example used `deployment.environment`. Current semantic conventions use `deployment.environment.name`. Updated the annotation accordingly.
- The sequence diagram said traces, metrics, and logs were exported, but the collector example only configured traces and metrics pipelines and the tutorial does not configure log export. Changed the diagram to "Traces and metrics exported."

## Review Notes
- The examples still use `latest` for auto-instrumentation images, but the production considerations section correctly tells readers to pin versions before production rollout.
- The collector exporter endpoint remains a placeholder and must be replaced with a backend-specific endpoint and TLS settings.
