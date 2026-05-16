# Validation Summary: How to Set Resource Requests and Limits on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, kubelet configuration)
- Kubernetes resource requests and limits
- Kubernetes QoS classes (Guaranteed, Burstable, BestEffort)
- Kubernetes LimitRange and ResourceQuota
- Vertical Pod Autoscaler (VPA)
- Prometheus / PromQL (subqueries, recording rules, alerting rules)
- kube-state-metrics
- cAdvisor metrics (`container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`)
- Linux CFS bandwidth control (CPU throttling) and OOM killer

## Sources Consulted
- Talos v1alpha1 config reference: https://www.talos.dev/v1.12/reference/configuration/v1alpha1/config/
- Kubernetes "Reserve Compute Resources for System Daemons": https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes VPA documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- kubernetes/autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- kube-state-metrics pod-metrics docs: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics v2.0 release notes: https://kubernetes.io/blog/2021/04/13/kube-state-metrics-v-2-0/
- Prometheus query functions and subqueries: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
No technical issues found. All code samples, configuration snippets, PromQL queries, API versions, metric names, and conceptual explanations are correct.

Verified specifically:
- `extraArgs` is a valid field on `machine.kubelet` in current Talos machine config, and the kubelet flags (`system-reserved`, `kube-reserved`, `eviction-hard`, `enforce-node-allocatable`) and their value syntax are accepted.
- `apiVersion: autoscaling.k8s.io/v1` is the current stable VPA API version.
- `kube_pod_container_resource_requests{resource="cpu"}` is the correct unified metric in kube-state-metrics v2+.
- The allocatable formula (`Capacity - System Reserved - Kube Reserved - Eviction Threshold`) matches the official Kubernetes node-allocatable design.
- The memory arithmetic (`16384Mi - 512Mi - 512Mi - 750Mi = 14610Mi`) checks out.
- PromQL subquery syntax `quantile_over_time(0.99, rate(...)[5m])[7d:5m]` is valid (introduced in Prometheus 2.7).
- LimitRange and ResourceQuota schemas, including `type: Container` / `type: Pod` and quota field names like `requests.cpu`, are correct.

## Review Notes
- The `extraArgs`-based kubelet configuration for `system-reserved` / `kube-reserved` / `eviction-hard` / `enforce-node-allocatable` works, but those kubelet command-line flags are deprecated in upstream Kubernetes in favor of `KubeletConfiguration`. In Talos, the more idiomatic modern form is `machine.kubelet.extraConfig` with structured keys (`systemReserved:`, `kubeReserved:`, `evictionHard:`, `enforceNodeAllocatable:`). The post is not wrong, but a future revision could mention or prefer the `extraConfig` form.
- The kube-state-metrics selector could optionally include `unit="core"` / `unit="byte"` for extra precision, but the current selector returns the correct series.
- The 7d/5m subquery in the example is correct PromQL but is computationally expensive at scale; recording rules (which the post does demonstrate later) are the production-recommended pattern. Worth a brief callout in a future revision.
- The post's example deployment uses `image: my-service:latest`, which is intentional placeholder text — not a recommended production practice, but acceptable in illustrative YAML.
