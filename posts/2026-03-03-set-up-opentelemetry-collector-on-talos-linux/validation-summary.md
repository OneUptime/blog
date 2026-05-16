# Validation Summary: How to Set Up OpenTelemetry Collector on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- OpenTelemetry Collector
- OpenTelemetry Operator
- cert-manager
- Prometheus / ServiceMonitor
- Jaeger / OTLP

## Sources Consulted
- OpenTelemetry Operator for Kubernetes: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator API reference: https://github.com/open-telemetry/opentelemetry-operator/blob/main/docs/api/opentelemetrycollectors.md
- OpenTelemetry Kubernetes Collector components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Helm chart Kubernetes component requirements: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry kubeletstats receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/README.md
- OpenTelemetry hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry k8sattributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- Talos Linux FAQ: https://docs.siderolabs.com/talos/v1.11/troubleshooting/faqs
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The cert-manager install command used v1.14.0. Updated it to v1.20.2 to match the current cert-manager kubectl installation documentation, and added the missing cainjector readiness wait.
- The OpenTelemetry Operator manifest defaults to a Collector image that may not include Kubernetes-specific components such as kubeletstats and k8sattributes. Added the Kubernetes Collector image to both Collector custom resources.
- The DaemonSet Collector used kubeletstats with `${env:K8S_NODE_NAME}` but did not define that environment variable. Added a downward API environment variable for `spec.nodeName`.
- The RBAC service account was defined but not attached to the Collector custom resource. Added `serviceAccount: otel-collector` and updated the apply sequence so RBAC is applied before the Collector.
- The hostmetrics receiver was described as collecting host metrics but did not mount the host filesystem or set `root_path`. Added the host filesystem volume, mount, and receiver `root_path`.
- The Prometheus exporter was exposed on port 8889, but the Operator service port was not explicitly declared. Added an explicit named `prometheus` port and corrected the port-forward command to use the Collector service.
- The centralized gateway used the older filter processor shape. Updated it to the current `trace_conditions` syntax with `span.attributes[...]` and `error_mode: ignore`.
- The application Deployment snippet omitted the required selector and matching pod template labels. Added `spec.selector.matchLabels` and `spec.template.metadata.labels`.
- The text said applications were using node IP access while the example used the Operator-created Kubernetes Service. Updated the text and comment to match the Service-based endpoint.
- The monitoring snippet manually created a ServiceMonitor with a port that did not match the Prometheus exporter correction. Replaced it with the Operator-supported `observability.metrics.enableMetrics` configuration for internal Collector metrics.
- The DaemonSet description implied container log collection was included. Clarified that container logs require adding a filelog receiver.

## Review Notes
- The post remains a high-level guide. Production deployments should still pin tested Operator and Collector versions together, review backend-specific TLS/authentication settings, and decide whether traffic should go to a node-local Collector or a load-balanced Collector Service.
