# Validation Summary: How to Collect Kubernetes Cluster Metrics with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Kubernetes
- Kubernetes RBAC
- kubelet_stats receiver
- k8s_cluster receiver
- k8s_objects receiver
- k8sattributes processor
- OTLP exporter

## Sources Consulted
- OpenTelemetry Collector Contrib kubeletstats receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/README.md
- OpenTelemetry Collector Contrib kubeletstats receiver metric metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/metadata.yaml
- OpenTelemetry Collector Contrib k8scluster receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sclusterreceiver/README.md
- OpenTelemetry Collector Contrib k8scluster receiver metric metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sclusterreceiver/metadata.yaml
- OpenTelemetry Collector Contrib k8sobjects receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sobjectsreceiver/README.md
- OpenTelemetry Collector Contrib k8sattributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post used deprecated component IDs `kubeletstats` and `k8sobjects` in Collector pipeline examples. Updated the examples and surrounding text to current component IDs `kubelet_stats` and `k8s_objects`.
- The kubelet_stats RBAC example included `nodes/proxy`, but the current receiver documentation requires `nodes/stats`, plus `nodes/pods` when using `extra_metadata_labels` or request/limit utilization metrics. Replaced `nodes/proxy` with `nodes/pods`.
- The k8s_objects events example omitted the `events.k8s.io` API group. Added `group: events.k8s.io` to the receiver configuration and added matching RBAC for `events.k8s.io/events`.
- The kubelet_stats metric list used non-current metric names such as `k8s.node.cpu.utilization`, `k8s.pod.cpu.utilization`, `k8s.container.cpu.utilization`, and `k8s.container.memory.usage`. Updated them to current documented metrics: `k8s.node.cpu.usage`, `k8s.pod.cpu.usage`, `container.cpu.usage`, and `container.memory.usage`.
- The kubelet_stats configuration discussed volume metrics but did not include the `volume` metric group or current volume metric names. Added the `volume` metric group and used current metrics such as `k8s.volume.available`, `k8s.volume.capacity`, and `k8s.pod.volume.usage`.
- The limit-utilization metrics were described as percentages, but the receiver reports them as ratios with unit `1`. Updated the descriptions and alert guidance to use ratio terminology.
- The k8s_cluster configuration used `storage` in `allocatable_types_to_report`, which is not a documented allocatable type. Updated it to `ephemeral-storage`.
- The k8s_cluster metric list and alert example referenced generic `k8s.node.condition`, but `node_conditions_to_report` emits condition-specific metrics such as `k8s.node.condition_ready` and `k8s.node.condition_memory_pressure`. Updated the metric list and node-health alert example accordingly.

## Review Notes
- The post is technically relevant and contains implementation-level Collector configuration, RBAC, and metric guidance.
- The examples still use `insecure_skip_verify: true` for kubelet TLS. This is documented and commonly used in examples, but production deployments should prefer a valid kubelet serving CA when possible.
- The post assumes a manually managed Collector configuration. The OpenTelemetry Collector Helm chart can also enable similar Kubernetes presets, but adding Helm-specific deployment details was outside the requested scope.
