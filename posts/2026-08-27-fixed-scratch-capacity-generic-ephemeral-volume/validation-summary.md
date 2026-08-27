# Validation Summary: How to Guarantee Fixed Scratch-Disk Capacity with a Generic Ephemeral Volume

## Status

validated

## Post Type

Technical guide / tutorial

## Technologies Covered

- Kubernetes Pods (`core/v1`)
- Generic ephemeral volumes and `volumeClaimTemplate`
- PersistentVolumeClaims, PersistentVolumes, and dynamic provisioning
- StorageClasses and `WaitForFirstConsumer` binding
- Container Storage Interface (CSI) drivers and storage capacity tracking
- Local ephemeral storage and `emptyDir`
- Kubernetes storage quotas and reclaim policies
- `kubectl` commands and JSONPath output

## Sources Consulted

- [Kubernetes: Ephemeral Volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes: Local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes: Volumes (`emptyDir`)](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: Storage Capacity](https://kubernetes.io/docs/concepts/storage/storage-capacity/)
- [Kubernetes API: Pod v1](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes API: PersistentVolumeClaim v1](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/)
- [Kubernetes API: StorageClass v1](https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/)
- [Kubernetes: Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [kubectl exec reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Kubernetes deprecated API migration guide: Event](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event-v125)

## Issues Found

- The opening described disk-backed `emptyDir.sizeLimit` enforcement categorically. Kubelet applies local ephemeral-storage limits only with a supported node storage layout, and it reacts after measured usage exceeds the limit rather than applying a hard filesystem quota. The opening and later comparison were qualified to describe measurement and eviction accurately.
- The post said the two `df` commands verify write behavior. Those commands report filesystem capacity and inode availability but do not perform a write. The description was corrected to match what the commands actually verify.

## Review Notes

- Both YAML snippets use current, non-deprecated API versions and valid field nesting. They parsed successfully and were decoded by `kubectl` as a Pod and StorageClass.
- The `20Gi` PVC request is a minimum; the bound volume's reported capacity can be larger. The post appropriately distinguishes the requested value from `.status.capacity.storage` and notes that hard capacity enforcement is driver- and backend-specific.
- `kubectl get events --sort-by=.lastTimestamp` remains valid for core/v1 Events, although `lastTimestamp` can be empty for some newer event producers. The current kubectl quick reference uses `.metadata.creationTimestamp` as a more portable chronological sort key.
- The sample application image and CSI provisioner use illustrative `example.com` identifiers. A real deployment also requires the `batch` namespace, a pullable worker image containing `df`, and an installed, correctly configured storage driver and StorageClass.
