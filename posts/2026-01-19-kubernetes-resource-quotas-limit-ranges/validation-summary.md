# Validation Summary: How to Set Up Kubernetes Resource Quotas and Limit Ranges

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- kubectl
- kube-state-metrics
- Prometheus / PromQL
- Grafana dashboard queries
- jq
- YAML

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ResourceQuota API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes LimitRange API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Kubernetes storage quota task documentation: https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/
- Kubernetes memory and CPU quota task documentation: https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/
- kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- kube-state-metrics ResourceQuota metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The jq command for calculating quota usage percentages did not match the ResourceQuota JSON shape. It iterated over `.status` entries, which produces `hard` and `used` maps rather than resource entries, and attempted to read `.value.used` / `.value.hard`. Updated it to iterate through `.status.hard` and look up matching values from `.status.used`.
- The same jq command attempted to parse Kubernetes quantities with `tonumber`, which fails for values such as `20Gi` and CPU millicores such as `500m`. Added a small quantity conversion helper for common Kubernetes CPU, binary storage, and decimal SI suffixes.
- The Prometheus alert expressions divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without ignoring the `type` label. PromQL binary matching would not match those series because their `type` label values differ. Added `ignoring(type)` to the alert ratios.
- The Grafana trend query used `increase()` on `kube_resourcequota`, which kube-state-metrics exposes as a gauge. Replaced it with `max_over_time()` for a valid over-time gauge query.
- The troubleshooting note said all pods must specify requests whenever quota exists. Narrowed this to CPU or memory request quotas, because ResourceQuota requirements depend on the resources being quota-enforced.

## Review Notes
kubectl is not installed in the local environment, so CLI validation was performed against official generated Kubernetes command reference pages instead of local `kubectl --help` output. The Kubernetes manifests use current `apiVersion: v1` ResourceQuota and LimitRange APIs and current quota resource names.
