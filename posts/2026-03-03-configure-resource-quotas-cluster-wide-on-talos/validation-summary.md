# Validation Summary: How to Configure Resource Quotas Cluster-Wide on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ResourceQuota (v1)
- Kubernetes LimitRange (v1)
- Kubernetes PriorityClass (scheduling.k8s.io/v1)
- Kyverno (kyverno.io/v1 ClusterPolicy, generate rules)
- Prometheus / kube-state-metrics (PrometheusRule from monitoring.coreos.com/v1)
- kubectl (custom-columns output, dry-run, label, apply)
- Talos Linux (operating context)

## Sources Consulted
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes PriorityClass documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Quota Scopes (PriorityClass scope): https://kubernetes.io/docs/concepts/policy/resource-quotas/#resource-quota-per-priorityclass
- Kyverno Generate Rules: https://main.kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno Selecting Resources (match/exclude): https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kyverno Add Quota policy example: https://kyverno.io/policies/other/add-quota/add-quota/
- kube-state-metrics ResourceQuota metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
No technical issues found.

All YAML manifests use correct apiVersions and field names. The ResourceQuota object count quotas (`pods`, `services`, `secrets`, `configmaps`, `persistentvolumeclaims`, `replicationcontrollers`) are valid. The compute resource quota fields (`requests.cpu`, `requests.memory`, `limits.cpu`, `limits.memory`, `requests.storage`) are correct. The LimitRange structure (Container/Pod/PersistentVolumeClaim types with `default`, `defaultRequest`, `max`, `min`) is accurate. The PriorityClass scoped quota using `scopeSelector.matchExpressions` with `scopeName: PriorityClass` and `operator: In` is the correct API. The kube-state-metrics PromQL expression uses the right metric name (`kube_resourcequota`) and labels (`type` with values "used"/"hard", plus `resource`, `namespace`, `resourcequota`). The kubectl commands, including the `--dry-run=client | kubectl label --local | kubectl apply` chaining pattern and the custom-columns escaping of dots in JSONPath (`requests\\.cpu`), are syntactically valid.

## Review Notes
- The Kyverno ClusterPolicy uses `background: false` and omits `synchronize: true` in the `generate` blocks. The policy will work correctly for new namespace creations (which is the demonstrated use case), but users who want existing labeled namespaces to receive quotas, or want the generated quotas to be reconciled if deleted/modified, should set `background: true` and add `synchronize: true` inside each `generate` block. These are common best practices for Kyverno generate policies but the post's example is not strictly wrong as written.
- `replicationcontrollers` is a valid object count quota field, though ReplicationController itself is largely superseded by Deployment in modern clusters. The quota field remains in active use for parity.
- `kubectl top nodes` requires metrics-server to be installed in the cluster; the post does not call this out, but it is standard Kubernetes knowledge.
- The PromQL expression `kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}` relies on Prometheus auto-matching the remaining labels (`namespace`, `resourcequota`, `resource`); this works correctly because both sides share the same label set apart from `type`.
