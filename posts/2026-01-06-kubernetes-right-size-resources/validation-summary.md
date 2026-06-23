# Validation Summary: How to Right-Size Kubernetes Resource Requests and Limits

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Kubernetes (resource requests/limits, QoS classes, LimitRange, ResourceQuota)
- kubectl (top, describe, get events, jsonpath, krew)
- Metrics Server
- Prometheus / PromQL (cAdvisor and kube-state-metrics metrics)
- Vertical Pod Autoscaler (VPA)
- Goldilocks (Fairwinds)
- Kubecost
- kube-capacity / resource-capacity krew plugin
- Prometheus Operator (PrometheusRule)
- Helm
- Python (pandas), Bash

## Sources Consulted
- Kubernetes docs — Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes docs — Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes docs — LimitRange: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes docs — Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Vertical Pod Autoscaler: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- Goldilocks (Fairwinds) docs & Helm chart: https://goldilocks.docs.fairwinds.com/installation/ and https://artifacthub.io/packages/helm/fairwinds-stable/goldilocks
- kube-capacity (robscott) / resource-capacity krew plugin: https://github.com/robscott/kube-capacity and https://github.com/kubernetes-sigs/krew-index/blob/master/plugins/resource-capacity.yaml
- Kubecost cost-analyzer Helm chart: https://kubecost.github.io/cost-analyzer/
- Prometheus Operator PrometheusRule: https://prometheus-operator.dev/
- cAdvisor container metrics (container_cpu_usage_seconds_total, container_memory_working_set_bytes, container_cpu_cfs_throttled_seconds_total/periods_total)

## Issues Found
1. **Incorrect company name** — The tools section heading read "Goldilocks (by Fairwind)". The company is **Fairwinds** (with a trailing "s"), consistent with the Helm repo (`fairwinds-stable`) and label (`goldilocks.fairwinds.com/enabled`) used elsewhere in the same section. Changed to "Goldilocks (by Fairwinds)".
2. **Incorrect plugin name in heading** — The heading "kubectl-resource-recommender Plugin" does not name any real plugin. The commands underneath (`kubectl krew install resource-capacity`, `kubectl resource-capacity`) install and invoke the **kube-capacity** tool (by Rob Scott), which the krew index publishes as `resource-capacity`. Changed the heading to "kube-capacity (resource-capacity) Plugin" so it matches the actual commands. The commands themselves were already correct and were left unchanged.

## Review Notes
- The VPA example (`apiVersion: autoscaling.k8s.io/v1`, `kind: VerticalPodAutoscaler`, `updateMode: "Off"`) is correct for recommendation-only mode. The sample `kubectl describe vpa` output (Lower Bound / Target / Upper Bound, memory in `k`/`Gi` units) matches real VPA output.
- All PromQL metric names are valid cAdvisor/kube-state-metrics series, and the `quantile_over_time(...[24h])` and CFS throttle-ratio queries are syntactically and semantically correct.
- QoS class rules are accurate: Guaranteed requires requests == limits for both CPU and memory on every container; Burstable has at least one request/limit set; BestEffort has none.
- LimitRange and ResourceQuota field names/structure are correct.
- The OOM-detection command `kubectl get events --field-selector reason=OOMKilled` is commonly cited but may return nothing on many clusters/versions, since OOM kills are most reliably surfaced in the container's `.status.containerStatuses[].lastState.terminated.reason`. The post already includes that jsonpath command as the reliable fallback, so no change was made; readers should rely on the lastState query if events show nothing.
- Heuristics in "The Golden Rules" (CPU request = P95, memory request = P99 + buffer, limits 2–5x requests) are reasonable opinions/guidance rather than hard facts; left as authored.
- Minor formatting (not technical): line "Resource Quota and LimitRange" is plain text rather than a Markdown heading. Left as-is per the instruction to avoid stylistic-only changes.
