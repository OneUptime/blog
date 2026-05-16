# Validation Summary: How to Manage Namespace Lifecycle on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (Namespaces, ResourceQuota, NetworkPolicy, LimitRange)
- kubectl
- Pod Security Admission (PSA)
- Prometheus / kube-state-metrics (PromQL, PrometheusRule CRD)
- jq
- Bash scripting

## Sources Consulted
- Kubernetes Namespace docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Pod Security Admission labels: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- kubectl reference (custom-columns, patch, wait, field-selector): https://kubernetes.io/docs/reference/kubectl/
- JSON Patch RFC 6902 and JSON Pointer RFC 6901
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/operator/api/
- kube-state-metrics docs (kube_resourcequota, kube_pod_status_phase): https://github.com/kubernetes/kube-state-metrics/tree/main/docs
- PromQL vector matching docs: https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching
- GNU coreutils `date` man page (Linux date syntax)
- jq manual: https://jqlang.github.io/jq/manual/

## Issues Found
1. **`date -v+1y` is BSD/macOS syntax, not Linux.** The `create-namespace.sh` script used `date -v+1y +%Y-%m-%d` to compute an expiry date one year out. This flag does not exist in GNU coreutils `date` (which is what runs on Talos Linux and any Linux distro). Replaced with the GNU-compatible form `date -d '+1 year' +%Y-%m-%d`.

2. **PromQL `NamespaceQuotaHigh` alert had unmatched label sets.** The expression divided `kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}`. Because both sides differ only in the `type` label, default one-to-one vector matching fails and the expression returns an empty vector. Added `ignoring(type)` so the matcher pairs the `used` and `hard` samples on the remaining labels (`namespace`, `resource`, `resourcequota`).

3. **PromQL `NamespaceInactive` alert used `count` instead of `sum`.** `kube_pod_status_phase{phase="Running"}` emits one series per pod with a value of 0 or 1. `count by (namespace) (...)` counts series (i.e., total pods regardless of phase), so the comparison `== 0` would never fire for a namespace that has any pods, running or not. Changed to `sum by (namespace) (kube_pod_status_phase{phase="Running"}) == 0` so the alert actually measures the number of pods currently in the Running phase.

## Review Notes
- The post uses `kubectl wait --for=delete pod --all` with a 120s timeout during decommission. This is correct kubectl syntax and works for waiting on pod deletion after a scale-down. Note that scaling deployments/statefulsets to 0 followed by `wait --for=delete` is appropriate, but readers should be aware that pods controlled by Jobs, DaemonSets, or with finalizers/long termination grace periods may not be cleaned up by this step alone.
- The `NamespaceInactive` alert with `sum by (namespace) (...) == 0` only matches namespaces that have at least one pod (in any phase). A namespace with zero pods produces no series at all, so the metric is absent and the alert will not fire. Detecting truly empty namespaces requires combining with `kube_namespace_created` and `absent()`. This is a known kube-state-metrics design limitation and not a code error; left as-is since the alert's primary intent (catch namespaces whose workloads have all stopped running) is correct.
- The JSON Patch in the quota-adjustment script writes to `/spec/hard/${RESOURCE}`. For resource names containing dots (e.g., `requests.cpu`), this is valid per RFC 6901 (only `/` and `~` require escaping). No change needed.
- `kubectl get pvc` is used to enumerate PVCs in the decommission script — note that deleting a namespace deletes PVCs, but the underlying PVs may persist with `Released` status depending on their reclaim policy. The post correctly warns about backing up data first.
- Pod Security Admission label `pod-security.kubernetes.io/enforce: restricted` is current (stable since Kubernetes 1.25) and appropriate for new namespaces on a modern Talos cluster.
