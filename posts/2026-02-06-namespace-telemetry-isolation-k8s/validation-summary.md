# Validation Summary: How to Set Up Namespace-Based Telemetry Isolation in K8s for Multi-Tenant

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry Collector
- Kubernetes DaemonSets
- Kubernetes NetworkPolicies
- Kubernetes Downward API
- Helm
- Python Kubernetes client
- ClickHouse views and functions

## Sources Consulted
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector Helm chart documentation and values: https://github.com/open-telemetry/opentelemetry-helm-charts
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/
- ClickHouse CREATE VIEW documentation: https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse currentUser function documentation: https://clickhouse.com/docs/sql-reference/functions/other-functions#currentuser

## Issues Found
- The NetworkPolicy allowed OTLP HTTP on port 4318, but the Collector deployment and receiver configuration only exposed OTLP gRPC on port 4317. Added the OTLP HTTP container port and receiver endpoint so the policy and Collector configuration match.
- The tenant egress NetworkPolicy selected all pods in the namespace, including the Collector, but did not allow the Collector to forward telemetry to the central gateway in the observability namespace. Added an explicit egress rule for the observability gateway on port 4317.
- The attributes processor comment implied it stripped all pre-existing tenant attributes. The attributes processor operates on span/log/metric attributes, while the resource processor upserts resource attributes. Updated the comment to make that distinction clear.
- The conclusion claimed applications could not spoof tenant identity in absolute terms. Updated it to specify that spoofing is prevented for applications that must use their namespace Collector, which depends on the network and backend controls being enforced.

## Review Notes
- The Collector image tag in the post is older than the latest OpenTelemetry Collector release as of 2026-06-05, but the referenced processors and OTLP configuration remain valid. Production deployments should pin and regularly upgrade to a currently tested Collector version.
- The network policy examples depend on namespace labels and gateway pod labels matching the sample selectors. Clusters using different labels should adjust selectors accordingly.
