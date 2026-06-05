# Validation Summary: How to Build a K8s Cluster Overview Dashboard from OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- Kubernetes
- Kubernetes Cluster Receiver
- Kubelet Stats Receiver
- Kubernetes Attributes Processor
- Prometheus Remote Write Exporter
- PromQL
- Grafana
- Kubernetes RBAC

## Sources Consulted
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Contrib Kubernetes Cluster Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sclusterreceiver/README.md
- OpenTelemetry Collector Contrib Kubernetes Cluster Receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sclusterreceiver/documentation.md
- OpenTelemetry Collector Contrib Kubelet Stats Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/README.md
- OpenTelemetry Collector Contrib Kubelet Stats Receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/documentation.md
- OpenTelemetry Collector Contrib Kubernetes Attributes Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector Contrib Prometheus Remote Write Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Contrib Prometheus translator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/translator/prometheus/README.md

## Issues Found
- The architecture diagram showed the receivers flowing into an `OTLP Exporter`, while the examples used Prometheus remote write. Changed that node to a generic metrics pipeline so the diagram does not imply an exporter that is not configured.
- The cluster receiver config used `k8scluster`. Updated it to the current documented component ID `k8s_cluster`.
- The Prometheus remote write exporter config used the deprecated alias `prometheusremotewrite`. Updated it to `prometheus_remote_write` in exporter definitions and pipeline references.
- The PromQL examples grouped by Kubernetes resource attributes, but the Prometheus Remote Write Exporter does not expose resource attributes as labels by default. Enabled `resource_to_telemetry_conversion` in both exporter snippets so labels such as `k8s_namespace_name` and `k8s_pod_name` are available to the shown queries.
- The Kubelet Stats Receiver example omitted the kubelet endpoint configuration used by the documented Kubernetes service-account pattern. Added `endpoint: "https://${env:K8S_NODE_NAME}:10250"`, `insecure_skip_verify: true`, and a note that `K8S_NODE_NAME` should come from the pod spec downward API.
- The K8s Cluster Receiver RBAC was incomplete for current default receiver coverage. Added missing API resources such as status subresources, resource quotas, services, batch workloads, and HPAs.
- The Kubelet Stats Receiver RBAC included `nodes/proxy`, which is not required for the direct kubelet stats endpoint shown. Replaced it with `nodes/stats` and added the Kubernetes Attributes Processor permissions needed for pod and namespace enrichment.
- The Pod Phase Distribution query used `count by (phase) (k8s_pod_phase)`, but `k8s.pod.phase` is emitted as a numeric gauge value rather than a `phase` label. Changed it to `count_values("phase", k8s_pod_phase)`.
- The CPU Usage vs Allocatable query used non-existent `k8s_node_cpu_utilization`. Changed it to `k8s_node_cpu_usage`, which is the Prometheus-normalized form of the Kubelet Stats Receiver's `k8s.node.cpu.usage` metric.
- The Memory Working Set query omitted the Prometheus unit suffix for byte metrics. Changed `k8s_pod_memory_working_set` to `k8s_pod_memory_working_set_bytes`.
- The Top 10 Pods by CPU query used non-existent `k8s_container_cpu_utilization`. Changed it to aggregate `container_cpu_usage` by namespace and pod name.

## Review Notes
The Prometheus remote write endpoint must point to a remote-write-compatible backend. When using a stock Prometheus server as that backend, its remote write receiver must be enabled separately. The post now validates technically for the Collector configuration and PromQL shown, assuming that backend-side remote write ingestion is configured.
