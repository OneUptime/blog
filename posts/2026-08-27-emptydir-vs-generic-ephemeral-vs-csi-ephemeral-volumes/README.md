# Choose Between emptyDir, Generic Ephemeral, and CSI Ephemeral Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, emptyDir, Generic Ephemeral Volumes, CSI, Ephemeral Storage

Description: Choose the right Pod-lifecycle volume by comparing provisioning, capacity, scheduling, accounting, driver support, and cleanup semantics.

---

`emptyDir`, generic ephemeral volumes, and CSI ephemeral volumes all put a volume inline in a Pod specification, and all are intended to follow the Pod's lifecycle. They differ in who creates the storage, when capacity is considered, whether a PVC exists, and which resource limit accounts for usage.

The word "ephemeral" describes lifecycle, not one common implementation or one common accounting system. Generic ephemeral volumes are stable from Kubernetes 1.23, while CSI ephemeral volumes are stable from Kubernetes 1.25. Check the documentation for the Kubernetes release and CSI driver actually installed in the cluster.

## Compare the Three Volume Types

| Property | `emptyDir` | Generic ephemeral | CSI ephemeral |
| --- | --- | --- | --- |
| Pod field | `emptyDir` | `ephemeral.volumeClaimTemplate` | `csi` |
| Provisioning owner | kubelet | ephemeral volume controller plus normal PV provisioner | CSI driver on the selected node |
| PVC created | No | Yes, automatically | No |
| Storage source | node kubelet storage or RAM | any dynamic-provisioning driver that supports the claim | CSI driver that advertises ephemeral lifecycle support |
| Capacity-aware scheduling | through container `ephemeral-storage` requests for disk-backed storage or memory requests for `medium: Memory`, not through `sizeLimit` | normal PVC binding and CSI storage capacity mechanisms can apply | not supported |
| Pod storage-limit accounting | disk-backed use is local ephemeral storage; tmpfs use is memory | driver-backed volume capacity; PVC count and requested storage are subject to namespace quota, not Pod `ephemeral-storage` | not covered by Pod storage resource usage limits |
| Fixed volume capacity | `sizeLimit`; disk-backed overage is measured and can trigger eviction rather than using a dedicated filesystem quota, while `medium: Memory` uses a tmpfs capacity cap | supported when the storage driver provides a fixed-size volume | driver-specific attributes; no standard capacity field |

## Choose `emptyDir` for Simple Node-Local Scratch Space

An `emptyDir` starts empty when the Pod is assigned to a node. It survives container restarts inside that Pod, but Kubernetes deletes it when the Pod is removed from the node.

```yaml
volumes:
  - name: scratch
    emptyDir:
      sizeLimit: 2Gi
```

Use it for temporary files, sharing files between containers in one Pod, caches that can be rebuilt, and init-container handoff. The default medium comes from the filesystem backing the kubelet directory. `medium: Memory` creates a tmpfs instead.

For disk-backed `emptyDir`, usage contributes to local ephemeral-storage accounting. Set realistic `ephemeral-storage` requests and limits on containers. The `emptyDir.sizeLimit` does not itself reserve that amount during scheduling, and kubelet enforcement is based on usage measurement and Pod eviction rather than a smaller dedicated disk mounted for the container.

For memory-backed `emptyDir`, file pages count as memory use of the container that wrote them. Set realistic memory requests for scheduling, and size both the memory limit and the volume cap.

## Choose Generic Ephemeral for a PVC-Backed Scratch Volume

Generic ephemeral volumes embed a PVC template in the Pod:

```yaml
volumes:
  - name: scratch
    ephemeral:
      volumeClaimTemplate:
        metadata:
          labels:
            purpose: scratch
        spec:
          accessModes: ["ReadWriteOnce"]
          storageClassName: fast-scratch
          resources:
            requests:
              storage: 20Gi
```

The ephemeral volume controller creates a real PVC in the Pod's namespace. Normal PVC binding and, when needed, dynamic provisioning then apply. Kubernetes recommends `WaitForFirstConsumer` for the StorageClass because it lets the scheduler choose a suitable node before topology-constrained provisioning.

Choose this type when scratch space needs a driver-defined performance class, network attachment, snapshot or clone support, storage-capacity tracking, or a fixed capacity that the Pod cannot exceed. The exact capabilities still depend on the driver.

The Pod owns the generated PVC. Pod deletion causes garbage collection of the PVC, which usually causes volume deletion when the StorageClass reclaim policy is `Delete`. A `Retain` policy deliberately leaves cleanup work for an administrator.

PVC-backed capacity is separate from local `ephemeral-storage`. A Pod using this volume still needs `ephemeral-storage` requests and limits for its writable container layers, logs, and any disk-backed `emptyDir` volumes.

## Choose CSI Ephemeral Only for a Driver Designed for It

CSI ephemeral volumes are prepared directly by a CSI driver after the Pod is scheduled:

```yaml
volumes:
  - name: injected-data
    csi:
      driver: inline.storage.example.com
      volumeAttributes:
        profile: application
```

The driver must advertise `Ephemeral` in the `CSIDriver.spec.volumeLifecycleModes` list. The attributes are driver-specific and are supplied by the Pod author, so a driver must not expose administrator-only parameters through this mode.

Use CSI ephemeral for special node-local integrations that a particular driver documents, such as data injection or a driver-managed transient mount. Kubernetes schedules the Pod before this storage is prepared, does not use storage-capacity-aware scheduling for this mode, and does not cover its usage with the Pod's local storage resource limits. A preparation failure can therefore leave the Pod unable to start on its selected node.

Do not substitute CSI ephemeral for generic ephemeral merely to avoid seeing a PVC. If capacity, binding, topology, quota, or normal storage operations matter, the PVC-backed design is the stronger abstraction.

## Make the Decision from Requirements

Use this short sequence:

1. If ordinary node-local disk or RAM is sufficient, use `emptyDir`.
2. If the volume needs a storage request, fixed capacity, topology-aware provisioning, or normal PVC features, use generic ephemeral.
3. If a specific CSI driver documents an inline ephemeral use case and storage creation is expected to succeed after scheduling, use CSI ephemeral.
4. If the data must outlive Pod deletion, use a normal persistent PVC instead of an ephemeral volume.

Also confirm the failure model. All three follow the Pod lifecycle, but node failure can destroy local data and driver behavior determines what is recoverable. "Ephemeral" never means that Kubernetes will preserve application data through Pod replacement.

## Official Documentation

- [Kubernetes ephemeral volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes emptyDir volumes](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes storage capacity](https://kubernetes.io/docs/concepts/storage/storage-capacity/)
- [Kubernetes CSIDriver API](https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/csi-driver-v1/)

## Conclusion

Choose by provisioning and accounting, not by the shared "ephemeral" label. `emptyDir` is kubelet-managed local scratch, generic ephemeral is a Pod-owned temporary PVC with normal storage semantics, and CSI ephemeral is a specialized driver-managed inline mount prepared after scheduling.
