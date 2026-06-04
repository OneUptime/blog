# Validation Summary: How to Configure Default Resource Quotas and Limit Ranges per Namespace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes namespaces
- Kubernetes Python client
- kube-state-metrics
- Prometheus / PromQL
- Prometheus Operator PrometheusRule

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes LimitRange API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Official Kubernetes Python client README: https://github.com/kubernetes-client/python
- kube-state-metrics ResourceQuota metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- Prometheus vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The StorageClass-specific ResourceQuota keys used the wrong key order. Changed `requests.storage.storageclass.storage.k8s.io/fast-ssd` and `requests.storage.storageclass.storage.k8s.io/standard` to `fast-ssd.storageclass.storage.k8s.io/requests.storage` and `standard.storageclass.storage.k8s.io/requests.storage`, matching Kubernetes ResourceQuota syntax.
- The PriorityClass-scoped ResourceQuota included `requests.nvidia.com/gpu`, but Kubernetes only allows a limited resource set for PriorityClass-scoped quotas. Moved the GPU quota into a separate unscoped ResourceQuota.
- Several object-count quota keys used unsupported shorthand for non-core resources. Changed Deployments, StatefulSets, DaemonSets, Jobs, CronJobs, and Ingresses to the supported `count/<resource>.<group>` syntax.
- The Python automation snippet imported `config` but did not load Kubernetes client configuration before constructing `CoreV1Api`. Added `config.load_kube_config()` to match the official Python client usage pattern.
- The PromQL quota utilization expressions divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without vector matching. Added `ignoring(type)` so Prometheus can match series that differ by the `type` label.

## Review Notes
The examples are generally version-neutral for current Kubernetes releases. The Python snippet now works as a kubeconfig-based example; in-cluster automation would typically use `config.load_incluster_config()` instead.
