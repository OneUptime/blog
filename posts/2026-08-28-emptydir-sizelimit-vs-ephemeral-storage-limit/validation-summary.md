# Validation Summary: emptyDir sizeLimit vs ephemeral-storage Limit: Which Limit Evicts the Pod First?

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered

- Kubernetes v1.37 and the core Pod API
- Kubelet local ephemeral-storage accounting and eviction
- Disk-backed and memory-backed `emptyDir` volumes
- Container and effective Pod `ephemeral-storage` requests and limits
- Kubernetes scheduling and node-pressure eviction
- `nodefs`, `imagefs`, and `containerfs` filesystem layouts
- XFS and ext4 project-quota monitoring with user namespaces
- Linux tmpfs memory accounting
- `kubectl` and JSONPath

## Sources Consulted

- [Kubernetes release history](https://kubernetes.io/releases/)
- [Kubernetes: Local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#local-ephemeral-storage)
- [Kubernetes: Volumes and `emptyDir`](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes v1.37 API reference: Pod and `EmptyDirVolumeSource`](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#emptydirvolumesource)
- [Kubernetes: Node-pressure Eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes: Feature Gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [Kubernetes: User Namespaces](https://kubernetes.io/docs/concepts/workloads/pods/user-namespaces/)
- [Kubernetes v1.37.0 kubelet eviction manager source](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/kubelet/eviction/eviction_manager.go)
- [Kubernetes v1.37.0 Pod ephemeral-storage aggregation source](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/kubelet/stats/helper.go#L408-L450)
- [Kubernetes enhancement: Ephemeral-storage quota monitoring](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/1029-ephemeral-storage-quotas/README.md)
- [Kubernetes issue #139205: dedicated-image-filesystem per-container accounting](https://github.com/kubernetes/kubernetes/issues/139205)
- [Kubernetes kubectl command reference](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands)
- [Kubernetes kubectl JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes: Container Images](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes 1.25: Local Storage Capacity Isolation Reaches GA](https://kubernetes.io/blog/2022/09/19/local-storage-capacity-isolation-ga/)

## Issues Found

- The post said there was no fixed ordering and that whichever limit kubelet observed first would win. That omitted Kubernetes v1.37.0's deterministic same-synchronization order: `emptyDir` limits, then the effective Pod aggregate limit, then container limits, with successful local-limit evictions handled before node-pressure eviction. The explanation now distinguishes cross-sample timing from this implementation-specific tie-break and makes clear that it is not an API guarantee.
- The concrete example said the builder's 6 GiB container limit could trigger eviction regardless of shared-volume size. That was incorrect because an over-limit `emptyDir` or an over-limit 8 GiB Pod aggregate is checked first in the same synchronization. The example now conditions the container-limit path on both earlier scopes remaining within their limits and clarifies that YAML field placement does not set precedence.
- The container-scope explanation presented writable-layer accounting as unconditional. Kubernetes v1.37.0 has an accepted bug on nodes with a dedicated image filesystem that can omit writable-layer bytes from the per-container check. Added a narrow version-specific caveat and explained that the aggregate Pod check remains a backstop once total usage exceeds its limit.
- The Pod-limit description treated every Pod limit as a simple sum and omitted other kubelet-accounted Pod-local files. It now refers to the effective aggregate of container limits, identifies the sum rule for the shown app-container-only Pod, and includes files such as `/etc/hosts` in aggregate usage and budget calculations.
- The node-pressure and filesystem-layout text mentioned only `nodefs` and `imagefs`. Kubernetes v1.37 also documents `containerfs` signals and single-filesystem, split-disk, and supported split-image layouts. Updated both passages and retained the feature/runtime qualification for split-image support.
- The project-quota paragraph implied that a supported XFS or ext4 filesystem plus an unspecified feature setting was sufficient. Current quota monitoring is beta and disabled by default, applies to `emptyDir`, requires Pods in user namespaces, and has kernel, CRI, OCI runtime, mount, and filesystem prerequisites. The corrected text states those constraints and limits deleted-open-file accounting to quota-monitored `emptyDir` data.
- The budget advice used “image-layer data,” which could be read as including shared read-only image layers. Replaced it with “writable-layer data” and described the 4 GiB example as a derived Pod limit because Kubernetes has no direct Pod-level `ephemeral-storage` limit field.
- The memory-backed section omitted the effect of its shown `sizeLimit`. It now states that `sizeLimit` constrains tmpfs usage while the pages count as container memory rather than local ephemeral storage.

## Review Notes

- The complete Pod manifest decoded successfully with `kubectl` client-side dry-run. Its API version, fields, resource quantities, volume declarations, and request/limit arithmetic are valid and current. The partial YAML blocks are valid in their stated Pod-spec or container contexts.
- All shown `kubectl` commands and flags are current. The exact node-capacity JSONPath expression parses correctly and emits capacity and allocatable storage on separate lines; event sorting by `.metadata.creationTimestamp` is valid.
- The `registry.example.com` images are intentionally illustrative and use the reserved `example.com` domain. The manifest demonstrates accounting configuration but is not a runnable reproduction unless equivalent images are made available under those names.
- Kubernetes v1.37.0 was the latest release on the validation date. The documented same-pass check order and dedicated-image-filesystem bug are version-specific implementation details and should be rechecked for later Kubernetes releases.
- All external links in the post resolved to relevant Kubernetes or upstream project pages during review.
