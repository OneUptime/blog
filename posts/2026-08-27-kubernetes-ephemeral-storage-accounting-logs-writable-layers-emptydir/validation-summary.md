# Validation Summary: How Kubernetes Accounts for Ephemeral Storage Across Logs, Writable Layers, and emptyDir

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- Kubernetes local ephemeral storage
- Kubernetes Pods and resource requests and limits
- Kubelet storage measurement and eviction
- Disk-backed and memory-backed `emptyDir` volumes
- Container writable layers and node-level container logs
- Linux filesystem project quotas and user namespaces
- Kubernetes scheduler resource accounting
- `nodefs`, `imagefs`, and `containerfs` filesystem layouts
- Node-pressure eviction and `DiskPressure`
- Generic ephemeral volumes and PersistentVolumeClaims
- Kubelet Summary API, `kubectl`, and `jq`

## Sources Consulted

- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes resource monitoring for local ephemeral storage](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#resource-monitoring-for-local-ephemeral-storage)
- [Kubernetes `emptyDir` volumes](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes ephemeral and generic ephemeral volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#generic-ephemeral-volumes)
- [Kubernetes storage ResourceQuota](https://kubernetes.io/docs/concepts/policy/resource-quotas/#storage-resource-quota)
- [Kubernetes init-container resource calculation](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/#resource-sharing-within-containers)
- [Kubernetes logging architecture and log rotation](https://kubernetes.io/docs/concepts/cluster-administration/logging/#log-rotation)
- [Kubernetes node-pressure eviction filesystem signals](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/#filesystem-signals)
- [Kubernetes node metrics and Summary API access](https://kubernetes.io/docs/reference/instrumentation/node-metrics/)
- [Kubernetes Pod v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes project-quota KEP](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/1029-ephemeral-storage-quotas/README.md)
- [Upstream kubelet Pod storage aggregation](https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/stats/helper.go#L434-L478)
- [Upstream kubelet local-storage eviction logic](https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/eviction/eviction_manager.go#L516-L634)
- [Upstream kubelet Summary API types](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/kubelet/pkg/apis/stats/v1alpha1/types.go)

## Issues Found

- Project-quota monitoring was described as a general alternative to directory scanning for all Pod storage consumers. Kubernetes currently applies project-quota monitoring to qualifying disk-backed `emptyDir` volumes, while container writable-layer accounting remains a runtime responsibility. The text now scopes quota monitoring and deleted-open-file accuracy to `emptyDir`, and notes the feature-gate, user-namespace, and filesystem requirements.
- The displayed Pod-usage formula and conclusion omitted Kubernetes-managed Pod files such as the generated `/etc/hosts`, even though the earlier measurement list mentioned them and kubelet includes them in the aggregate used for Pod eviction. Those files are now included consistently in the formula, example explanation, image-layer comparison, and conclusion.
- The post generalized Pod requests and limits as simple sums across all containers. That is correct for the shown Pod, which has only regular app containers, but Pods with init containers use Kubernetes' effective Pod resource calculation. The scheduling and Pod-limit explanations now state that distinction.
- The generic ephemeral volume wording implied that a PVC quota always applies. It now says these volumes use PVC-requested capacity and are subject to any applicable PVC-related `ResourceQuota`.
- The Summary API `jq` filter selected only by Pod name. Because Pod names are unique only within a namespace and a node summary covers all namespaces, it could select multiple Pods. The command now captures the target Pod UID and filters `.podRef.uid`, which is cluster-unique.
- The `DiskPressure` explanation treated free-inode signals as cross-platform. Kubernetes exposes the inode eviction signals only on Linux, so the text now includes that platform qualification.

## Review Notes

- The `core/v1` Pod manifest uses current, non-deprecated fields. It decoded successfully with `kubectl` v1.34.1 in client-side dry-run mode, and the fields were also checked against the current Kubernetes v1.37 documentation and API reference.
- The example arithmetic is exact: `1Gi + 256Mi` is 1.25 GiB, and `3Gi + 512Mi` is 3.5 GiB. The `400m`, `400Mi`, and `400M` quantity explanation matches Kubernetes documentation.
- The `registry.example.com` image references are intentional-looking placeholders. The manifest demonstrates resource accounting but will not normally reach `Running` unless readers replace those images with pullable images available to their cluster.
- The `kubectl` and `jq` syntax is valid. Summary API access still requires a scheduled Pod, `jq`, and RBAC permission to use the node proxy endpoint.
- In Kubernetes v1.37, `containerfs` remains dependent on the runtime and the `KubeletSeparateDiskGC` feature; current upstream documentation lists CRI-O 1.29 or later as the supported runtime. The post's generic warning to verify the distribution and runtime layout remains correct.
- All external links in the post returned HTTP 200 during validation; the author link redirected successfully to the intended GitHub profile.
