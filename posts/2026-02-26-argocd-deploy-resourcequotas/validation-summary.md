# Validation Summary: How to Deploy ResourceQuotas with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes PriorityClass quota scopes
- Kubernetes StorageClass-specific quotas
- Kustomize
- kube-state-metrics
- Prometheus / Prometheus Operator

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics ResourceQuota metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- Prometheus vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Argo CD self-heal explanation said quota drift would be reverted "immediately." Argo CD performs self-healing during automated reconciliation after its self-heal timeout, so the wording was changed to "during automated reconciliation."
- The PriorityClass quota example was labeled as a best-effort pod quota. BestEffort is a separate ResourceQuota scope and does not match the `PriorityClass` scopeSelector shown. The example name and comment were changed to low-priority pods.
- The sync-wave Deployment example was not a valid `apps/v1` Deployment because it omitted the required `spec.selector` and `spec.template`. A minimal valid Deployment spec with resource requests and limits was added.
- The Prometheus alert divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without ignoring the differing `type` label. This would not match the two vectors. The expression now uses `ignoring(type)`.
- The ResourceQuota and LimitRange section claimed all ResourceQuotas require all pods to define both requests and limits. Kubernetes only enforces the corresponding CPU or memory request/limit values when those resources are included in the quota. The wording was narrowed to CPU and memory request or limit quotas.

## Review Notes
No additional technical issues found. The ResourceQuota API version, quota resource names, storage-class-specific quota syntax, Argo CD sync-wave annotation, `kubectl get/describe resourcequota` commands, kube-state-metrics metric name, and PrometheusRule structure are consistent with the consulted documentation.
