# Validation Summary: How to Build a Fan-In Architecture That Aggregates Telemetry from Hundreds of

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- OTLP receiver and exporter
- Host Metrics receiver
- Resource Detection processor
- Kubernetes Attributes processor
- Probabilistic Sampling processor
- Kubernetes DaemonSet, Deployment, Service, ServiceAccount, ClusterRole, and ClusterRoleBinding

## Sources Consulted
- OpenTelemetry Collector overview: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector gRPC configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector exporter helper queue and retry documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector Host Metrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Resource Detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Kubernetes Attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector Probabilistic Sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector Tail Sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Load Balancing exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Kubernetes workload resources documentation: https://kubernetes.io/docs/concepts/workloads/

## Issues Found
- The agent configuration used `resourcedetection`, which is a deprecated alias for the current `resource_detection` processor type. Updated the processor name and pipeline references.
- The agent claimed to collect host metrics from the node, but a containerized Host Metrics receiver needs the host filesystem mounted and `root_path` configured. Added `root_path: /hostfs` and the corresponding DaemonSet `hostPath` volume mount.
- The agent claimed to add node-level resource attributes, but the manifest did not provide the Kubernetes node name to the Collector. Added `K8S_NODE_NAME` from the Downward API and `OTEL_RESOURCE_ATTRIBUTES` with `k8s.node.name`.
- The gateway configuration used tail sampling behind a generic multi-replica gateway service. Tail sampling needs all spans for a trace to reach the same Collector instance, which the shown manifests did not guarantee. Replaced the example with stateless `probabilistic_sampler` and added a note that tail sampling requires trace-ID-aware routing such as the Collector load-balancing exporter.
- The gateway's `k8sattributes` processor used service account authentication, but the Kubernetes manifest did not create or assign a service account with API permissions. Added a ServiceAccount, ClusterRole, ClusterRoleBinding, and `serviceAccountName`.
- The gateway Deployment passed `--config=/etc/otel/config.yaml` but did not mount the ConfigMap containing that file. Added the `otel-gateway-config` volume and volume mount.
- The gateway `k8sattributes` configuration relied on default connection-IP pod association, which can match the agent pod rather than the original workload in an agent-to-gateway topology. Added resource-attribute pod association rules for `k8s.pod.ip` and `k8s.pod.uid` before the connection fallback.

## Review Notes
Validated the corrected agent and gateway Collector configs with `otel/opentelemetry-collector-contrib:latest`, which resolved to version 0.153.0 on 2026-06-05. The agent validation requires the documented `/hostfs` mount. The Kubernetes manifests were reviewed for API shape and required Collector runtime wiring, but were not applied to a live cluster.
