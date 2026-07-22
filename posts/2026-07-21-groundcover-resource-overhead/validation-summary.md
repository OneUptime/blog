# Validation Summary: How Much CPU and Memory Does Groundcover Add to a Kubernetes Cluster?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Groundcover
- Kubernetes
- eBPF
- Helm
- Metrics Server and `kubectl top`
- ClickHouse
- VictoriaMetrics
- OpenTelemetry Collector
- Vector
- kube-state-metrics

## Sources Consulted

- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover tuning resources](https://docs.groundcover.com/customization/customize-usage/tuning-resources)
- [Groundcover sensor deployment coverage](https://docs.groundcover.com/customization/customize-deployment/configuring-sensor-deployment-coverage)
- [Groundcover Kubernetes installation](https://docs.groundcover.com/getting-started/installation-and-updating/connect-kubernetes-cluster)
- [Groundcover Helm chart repository index](https://helm.groundcover.com/index.yaml) and the published [`groundcover` 1.12.135 chart archive](https://github.com/groundcover-com/helm-charts/releases/download/groundcover-1.12.135/groundcover-1.12.135.tgz) linked from it
- [Groundcover eBPF sampling controls](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [Groundcover Kubernetes entity filtering](https://docs.groundcover.com/customization/customize-usage/filtering-kubernetes-entities)
- [Kubernetes resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes resource monitoring tools](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/)
- [Kubernetes DaemonSet documentation](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes Pod-to-node assignment and node affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes `kubectl top pod` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/)
- [Kubernetes `kubectl top node` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

- The sensor-total formula multiplied node count by an unspecified per-pod measurement. It now specifies the average measured usage per sensor pod, which makes the aggregate calculation valid when sensor usage differs between nodes.
- The post stated categorically that Groundcover's default affinity rules exclude Fargate and control-plane nodes. Groundcover's installation documentation describes that coverage policy, but scheduling configuration can differ by chart version and overrides; the current published chart values and the separate coverage page do not present identical defaults. The text now attributes the policy to the installation documentation and tells readers to verify the rendered scheduling rules and actual scheduled sensor pods.
- The limits explanation treated CPU and memory limits as equivalent enforcement boundaries. It now states that CPU limits throttle CPU time while memory limits are enforced reactively and can lead to OOM kills.
- The capacity-budget equations referred to per-node sensor requests without multiplying them by eligible node count. Both CPU and memory equations now include that multiplication and identify the other terms as totals across their component replicas.

## Review Notes

The post does not pin a Groundcover chart or application version. Groundcover's component set, defaults, and scheduling rules can change, so readers should record the installed version and inspect rendered manifests when repeating the study. The commands were checked against current `kubectl` documentation; `pods` and `nodes` are supported aliases for the documented singular resource names.
