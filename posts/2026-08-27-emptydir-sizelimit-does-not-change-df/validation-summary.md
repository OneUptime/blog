# Validation Summary: Why emptyDir sizeLimit Does Not Change df -h - and How Kubernetes Enforces It

## Status

validated

## Post Type

Technical guide and troubleshooting reference

## Technologies Covered

- Kubernetes Pods and `emptyDir` volumes
- Local ephemeral-storage requests, limits, accounting, and eviction
- Kubelet configuration and volume statistics
- Filesystem project-quota monitoring on XFS and ext4
- Linux tmpfs and memory-backed `emptyDir` volumes
- Generic ephemeral volumes and PersistentVolumeClaims
- `kubectl`, JSONPath, the kubelet Summary API, and `jq`
- BusyBox `df`, `du`, and `dd`

## Sources Consulted

- [Kubernetes volumes and `emptyDir` semantics](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes local ephemeral-storage configuration, accounting, and measurement](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes resource management and memory-backed `emptyDir` considerations](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#considerations-for-memory-backed-emptydir-volumes)
- [Kubernetes generic ephemeral volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#generic-ephemeral-volumes)
- [Kubernetes Pod API: `EmptyDirVolumeSource`](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#EmptyDirVolumeSource)
- [Kubernetes kubelet configuration API](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- [Kubernetes kubelet command reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)
- [Kubernetes feature gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/#LocalStorageCapacityIsolationFSQuotaMonitoring)
- [Kubernetes kubelet `emptyDir` implementation](https://github.com/kubernetes/kubernetes/blob/master/pkg/volume/emptydir/empty_dir.go)
- [Kubernetes kubelet eviction manager implementation](https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/eviction/eviction_manager.go)
- [Kubernetes filesystem resource analyzer implementation](https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/server/stats/fs_resource_analyzer.go)
- [Kubernetes project-quota monitoring KEP](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/1029-ephemeral-storage-quotas/README.md)
- [Kubernetes node metrics and Summary API access](https://kubernetes.io/docs/reference/instrumentation/node-metrics/)
- [Kubernetes Summary API types](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/kubelet/pkg/apis/stats/v1alpha1/types.go)
- [Kubernetes kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes kubectl JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes field selector reference](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes registry tags for the BusyBox test image](https://registry.k8s.io/v2/e2e-test-images/busybox/tags/list)
- [GNU Coreutils `df` documentation](https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html)
- [GNU Coreutils `du` documentation](https://www.gnu.org/software/coreutils/manual/html_node/du-invocation.html)

## Issues Found

- The manifest referenced `registry.k8s.io/busybox:1.36.1`, but that repository has no `1.36.1` manifest. Changed it to the published multi-platform image `registry.k8s.io/e2e-test-images/busybox:1.36.1-1`. The replacement manifest was resolved from the Kubernetes registry and the image was run to verify that its `df -h`, `du -sh`, and `dd bs=1M` commands work as shown.
- The enforcement explanation omitted that kubelet volume statistics collection can be disabled independently of local storage capacity isolation. Added volume statistics collection as a condition in the introduction and conclusion because a non-positive `volumeStatsAggPeriod` disables the measurements used by the `emptyDir` limit check.
- The shared-storage explanation implied that logs, images, and writable overlays always share one backing filesystem. Current Kubernetes supports multiple node storage layouts. Changed the wording to refer to other consumers of the same backing filesystem, with logs and image overlays as conditional examples.
- The project-quota requirements were too abbreviated. Named the disabled-by-default `LocalStorageCapacityIsolationFSQuotaMonitoring` gate and clarified that it must be enabled, project quotas must be enabled on the backing filesystem, and Pods must actually run in a user namespace, normally using `spec.hostUsers: false`.
- The generic ephemeral volume paragraph used the invalid field path `volumeClaimTemplate.resources.requests.storage`, which omitted the PVC template's `spec`. Corrected it to `volumeClaimTemplate.spec.resources.requests.storage` and clarified that the template causes Kubernetes to create the PVC-backed volume.

## Review Notes

- The corrected Pod manifest was accepted by `kubectl create --dry-run=client`, and all field names and resource quantities are valid for the stable `v1` Pod API.
- Project-quota monitoring remains beta and disabled by default in the current Kubernetes documentation. It improves accounting accuracy but does not enforce a hard filesystem quota.
- The Summary API JSON uses `.pods[].podRef.name` and `.pods[].volume`, so the `jq` filter matches the current kubelet statistics schema.
- The `nodes/proxy` warning is important and correct: Kubernetes documents that even `get` access to this subresource can expose privileged kubelet operations and is not read-only in effect.
- The existing Pod API link redirects to the current canonical page and remains functional.
