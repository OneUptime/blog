# Validation Summary: How to Use Local NVMe for Kubernetes Scratch Space with Pod Cleanup

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes Jobs and Pod lifecycle
- Generic ephemeral volumes and PersistentVolumeClaims
- Container Storage Interface (CSI) drivers and sidecars
- Local NVMe storage and topology-aware provisioning
- StorageClasses, PersistentVolumes, and reclaim policies
- `kubectl`, ResourceQuota, `hostPath`, and `emptyDir`

## Sources Consulted

- [Kubernetes: Ephemeral Volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes: Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: Dynamic Volume Provisioning](https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Storage Capacity](https://kubernetes.io/docs/concepts/storage/storage-capacity/)
- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes: Automatic Cleanup for Finished Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/)
- [Kubernetes: Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: Volumes (`emptyDir` and `hostPath`)](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes: Finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl label`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)
- [Kubernetes CSI Developer Documentation: External Provisioner](https://kubernetes-csi.github.io/docs/external-provisioner.html)
- [Kubernetes CSI Developer Documentation: Topology](https://kubernetes-csi.github.io/docs/topology.html)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)
- [Kubernetes ephemeral-volume controller source](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/volume/ephemeral/controller.go)
- [Kubernetes `kubectl get` source](https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/get/get.go)

## Issues Found

- The generated-PVC discovery command selected `app.kubernetes.io/name=sort-shards`, but that label was present only on the Pod template. Generic ephemeral PVCs copy labels from `volumeClaimTemplate.metadata`, so the command would omit the PVC. Added the same application label to the claim template.
- The lifecycle example attempted `kubectl get job,pod,pvc --watch`. A normal `kubectl get` can list multiple resource types, but watch mode requires a single resource type. Split the command into separate Job, Pod, and PVC watches and clarified that each watch should run in a separate terminal.
- The cleanup chain attributed completed-Pod retention and TTL cleanup to the Job controller. Completed Job Pods normally remain, while the separate TTL-after-finished controller deletes the finished Job cascadingly after the configured TTL. Corrected the controller attribution and deletion sequence.
- The `hostPath` comparison categorically said a `hostPath` volume has no PVC or StorageClass lifecycle, even though `hostPath` can also back a statically defined PersistentVolume. Qualified the statement as applying to an inline `hostPath` volume and described the missing capacity-management and cleanup lifecycle precisely.

## Review Notes

- The CSI provisioner name, StorageClass parameters, container image, and sanitization behavior are intentionally driver-specific placeholders. They must be replaced with values and procedures documented by the installed driver.
- `WaitForFirstConsumer` coordinates topology-aware scheduling and provisioning. Capacity-aware scheduler filtering additionally depends on the driver publishing `CSIStorageCapacity` information; the post appropriately requires capacity reporting or a documented retry model.
- Generic ephemeral volumes and TTL-after-finished are stable from Kubernetes v1.23 onward. The current `batch/v1` Job and `storage.k8s.io/v1` StorageClass APIs are not deprecated.
