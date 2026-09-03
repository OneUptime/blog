# Validation Summary: How to Standardize Service, Environment, Cluster, and Deployment Labels Across Telemetry Signals

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenTelemetry semantic conventions and Resources
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector Kubernetes Attributes Processor
- Kubernetes metadata, labels, annotations, names, and UIDs
- Prometheus and OpenMetrics resource mapping
- Loki label mapping

## Sources Consulted

- [OpenTelemetry Service Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [OpenTelemetry Deployment Attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/)
- [OpenTelemetry Kubernetes Resource Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/k8s/)
- [OpenTelemetry: Specify Resource Attributes Using Kubernetes Annotations](https://opentelemetry.io/docs/specs/semconv/non-normative/k8s-attributes/)
- [OpenTelemetry Prometheus and OpenMetrics Compatibility](https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/)
- [OpenTelemetry Resource SDK](https://opentelemetry.io/docs/specs/otel/resource/sdk/)
- [OpenTelemetry OTLP Specification](https://opentelemetry.io/docs/specs/otlp/)
- [OpenTelemetry Collector Kubernetes Attributes Processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md)
- [Kubernetes Recommended Labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)
- [Kubernetes Object Names and IDs](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)

## Issues Found

- The cluster row used the human-readable value `eu-west-primary` as its only example even though the row also covered `k8s.cluster.uid`. Clarified that the name is paired with a UUID when the UID attribute is used, because the convention defines `k8s.cluster.uid` as the UID of the `kube-system` namespace.
- The SDK fallback was described only as `unknown_service`. Corrected it to `unknown_service:<process executable name>` when the executable name is available and `unknown_service` otherwise, matching the service semantic conventions.
- The conformance check rejected only the exact value `unknown_service`. Extended it to reject `unknown_service:*` as well so it catches the standard executable-qualified fallback.

## Review Notes

- `deployment.id`, `deployment.name`, and the Prometheus/OpenMetrics resource-conversion sections are currently marked Development in the OpenTelemetry specifications. The post appropriately advises pinning semantic-convention versions for deployment attributes and testing backend mappings.
- The Kubernetes resource-annotation guidance is non-normative, as the post states. Collector enrichment behavior remains dependent on explicit pod-association configuration and pipeline ordering.
