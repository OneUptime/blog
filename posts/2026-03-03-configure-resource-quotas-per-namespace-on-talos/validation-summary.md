# Validation Summary: How to Configure Resource Quotas per Namespace on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes ResourceQuota API (v1)
- kubectl
- Kubernetes storage classes / PersistentVolumeClaims
- Kubernetes QoS classes (BestEffort, Burstable, Guaranteed)
- Kubernetes PriorityClass and scope selectors
- Prometheus / Prometheus Operator (PrometheusRule CRD, monitoring.coreos.com/v1)
- kube-state-metrics (`kube_resourcequota` metric)
- jq, awk

## Sources Consulted
- Kubernetes official documentation — Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes API reference for ResourceQuota
- Kubernetes QoS classes documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- kube-state-metrics documentation for `kube_resourcequota` metric
- Prometheus Operator PrometheusRule CRD documentation

## Issues Found
1. **Incorrect characterization of `NotBestEffort` scope.** The original text described the second scoped quota example as targeting "guaranteed pods (requests equal limits)" and named the ResourceQuota `guaranteed-quota`. This is inaccurate: there is no `Guaranteed` scope in Kubernetes, and the `NotBestEffort` scope matches *any* pod that sets at least one CPU or memory request or limit (i.e., both Burstable and Guaranteed QoS pods), not just Guaranteed-QoS pods.
   - **Fix applied:** Reworded the explanatory sentence to describe "non-best-effort pods (any pod that sets at least one CPU or memory request or limit)" and renamed the example ResourceQuota from `guaranteed-quota` to `not-besteffort-quota` so the YAML matches the scope it uses.

## Review Notes
- All ResourceQuota field names, including the `count/<resource>.<group>` syntax, per-StorageClass quota syntax (`<storage-class>.storageclass.storage.k8s.io/...`), and `scopeSelector` with `PriorityClass` were verified against the upstream Kubernetes documentation and are correct.
- `replicationcontrollers` (without the `count/` prefix) is a first-class quota field and is correct, though ReplicationController is a legacy resource — most workloads today use Deployments/StatefulSets/ReplicaSets, which the post also includes via the `count/` prefix.
- The statement that "every container in the namespace must specify resource requests and limits" when compute quotas are set is slightly simplified. Strictly, the enforcement is per-resource: setting `requests.cpu` forces every pod to declare `requests.cpu` (or `limits.cpu`); the same applies independently to memory. A `LimitRange` in the namespace can also satisfy this requirement automatically. The current wording is acceptable as a high-level summary.
- The `awk '{cpu+=$2; mem+=$3}'` snippet over `kubectl top pods` output produces only a rough approximation because the underlying values carry mixed units (e.g., `m` for CPU, `Mi`/`Gi` for memory). The post presents it as a quick heuristic, which is reasonable.
- The `kube_resourcequota` Prometheus metric and `type="hard"` / `type="used"` label values are correct as exposed by kube-state-metrics.
- The post is generally framework-agnostic on the Talos side — the ResourceQuota mechanics are all upstream Kubernetes behavior, and the Talos-specific framing (local storage, multi-tenant clusters) is accurate.
