# Validation Summary: How to Configure the Kubelet Stats Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Kubelet Stats Receiver
- Kubernetes Kubelet `/stats/summary`
- Kubernetes DaemonSet deployment
- Kubernetes RBAC
- OpenTelemetry Collector processors and exporters
- Kubernetes Attributes Processor

## Sources Consulted
- OpenTelemetry Collector Contrib kubeletstats receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/README.md
- OpenTelemetry Collector Contrib kubeletstats receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/metadata.yaml
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry kubeletstats CPU metrics migration post: https://opentelemetry.io/blog/2025/kubeletstats-receiver-metrics-deprecation/
- OpenTelemetry Collector Kubernetes Attributes Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector logging exporter replacement issue: https://github.com/open-telemetry/opentelemetry-collector/issues/11337

## Issues Found
- The post used the deprecated `kubeletstats` component type. Updated configuration examples to use the current `kubelet_stats` type consistently.
- The basic example used the deprecated `logging` exporter and `loglevel` option. Replaced it with the `debug` exporter and `verbosity: detailed`.
- The post used `K8S_NODE_IP` throughout and gave an incorrect kubeconfig endpoint. Updated examples to use `K8S_NODE_NAME` via `${env:K8S_NODE_NAME}` and documented that `kubeConfig` uses the node name through the API server proxy.
- CPU metric examples referenced deprecated or incorrect `.cpu.utilization` metrics and described `cpu.usage` as cumulative. Updated examples to use current `.cpu.usage` gauges and `.cpu.time` cumulative counters, and clarified that request/limit utilization metrics are optional.
- Container restart and CPU throttling metrics were listed as kubeletstats metrics, but they are not emitted by this receiver. Removed those examples and adjusted alerting guidance.
- Resource attribute guidance claimed container image attributes were automatically added by the receiver. Updated it to list receiver-provided attributes and show `extra_metadata_labels` for `container.id`.
- RBAC examples were incomplete for current k8sattributes usage and optional kubelet metadata. Added `namespaces`, watch verbs for relevant resources, and `nodes/pods` for extra metadata or request/limit utilization.
- The DaemonSet used an old Collector image version and claimed `hostNetwork: true` was needed for `localhost:10250` while the endpoint used a node address. Updated the image and removed the incorrect host network explanation.
- Filter processor examples used the older `exclude.resource_attributes` style. Updated them to OTTL datapoint filters.
- The production configuration put `memory_limiter` late in the processor list and used the ignored `service.telemetry.metrics.address` setting. Moved `memory_limiter` first and removed the ignored address field.

## Review Notes
All YAML blocks in the post were parsed successfully after the edits. Some examples remain illustrative fragments rather than full Kubernetes manifests, which is appropriate for the post structure.
