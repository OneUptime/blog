# Validation Summary: How to Monitor emptyDir Usage per Pod with Kubelet and Prometheus Metrics

## Status

validated

## Post Type

Technical guide / tutorial

## Technologies Covered

- Kubernetes
- Kubelet Summary API (`/stats/summary`) and stats `v1alpha1` schema
- `emptyDir` volumes and local ephemeral-storage accounting
- PersistentVolumeClaims and generic ephemeral volumes
- `kubectl` and `jq`
- Prometheus exposition format and PromQL
- Kubernetes RBAC, API server node proxying, and kubelet authorization

## Sources Consulted

- [Kubernetes node metrics data and Summary API](https://kubernetes.io/docs/reference/instrumentation/node-metrics/)
- [Kubernetes kubelet metrics reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Kubernetes kubelet stats API types](https://github.com/kubernetes/kubernetes/blob/v1.37.0/staging/src/k8s.io/kubelet/pkg/apis/stats/v1alpha1/types.go)
- [Kubernetes volume metrics contract](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/volume/volume.go)
- [Kubernetes kubelet volume stats collector](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/kubelet/metrics/collectors/volume_stats.go)
- [Kubernetes emptyDir eviction logic](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/kubelet/eviction/eviction_manager.go)
- [Kubernetes emptyDir volume implementation](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/volume/emptydir/empty_dir.go)
- [Kubernetes emptyDir volume documentation](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes local ephemeral-storage accounting](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/#ephemeral-storage-consumption-management)
- [Kubernetes generic ephemeral volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#generic-ephemeral-volumes)
- [Kubernetes resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
- [Kubernetes `kubectl top` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubernetes RBAC good practices for `nodes/proxy`](https://kubernetes.io/docs/concepts/security/rbac-good-practices/#access-to-proxy-subresource-of-nodes)
- [Prometheus PromQL operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)
- [jq manual](https://jqlang.org/manual/)

## Issues Found

- The post described an explicit `emptyDir.sizeLimit: 0` as a zero-byte limit. Kubernetes accepts zero, but kubelet applies the per-volume eviction check and memory-backed sizing only to a positive `sizeLimit`; zero does not create an effective per-volume limit. Emitting a zero-valued limit metric would also make the shown PromQL ratio divide by zero. The post now says to compare usage only with a positive configured limit and to emit `platform_emptydir_size_limit_bytes` only for positive values, without substituting zero for an absent or zero field.

## Review Notes

- The Summary API command, field names, and both `jq` filters are syntactically correct. The filters were also exercised against representative JSON, including absent optional filesystem fields.
- The `kubelet_volume_stats_*` series remain alpha and use only `namespace` and `persistentvolumeclaim` labels. The upstream collector skips entries with a nil `PVCRef`, so the post correctly excludes `emptyDir` and routes generic ephemeral PVCs through the PVC metric path.
- Summary API filesystem fields are optional. A production collector should also match `podRef.uid` when joining stats to live Pods to avoid a Pod delete/recreate race.
- The example assumes the Pod is already scheduled; otherwise `.spec.nodeName` is empty and there is no kubelet node to query.
- Project-quota monitoring remains beta and disabled by default in Kubernetes v1.37. It requires local-storage capacity isolation, project quotas on a supported backing filesystem, and a Pod running in a user namespace; it monitors usage rather than enforcing a hard quota.
- `get` access to `nodes/proxy` is not read-only and can reach privileged kubelet APIs, so the post's security warning is correct.
