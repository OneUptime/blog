# Why Did CDI Fall Back from CSI or Snapshot Cloning to Host-Assisted Copy?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, CSI, Volume Cloning

Description: Explain CDI clone fallback annotations, verify efficient-clone prerequisites, and decide whether host-assisted copy is expected or fixable.

---

Host-assisted copy is CDI's compatibility path when an efficient CSI clone or snapshot clone cannot be used. It starts source and target worker Pods and transfers data over the cluster network. The result can still be correct, but it is slower and consumes compute, network, and storage I/O.

CDI records the selected clone type and, when it falls back, a reason on the target PVC and in events. Read that evidence before changing the StorageProfile.

## Confirm That Fallback Happened

Inspect the target DataVolume and PVC:

```bash
kubectl describe datavolume cloned-root -n vm-lab
kubectl get pvc cloned-root -n vm-lab -o yaml
kubectl describe pvc cloned-root -n vm-lab
```

Look for annotations such as:

```yaml
metadata:
  annotations:
    cdi.kubevirt.io/cloneType: copy
    cdi.kubevirt.io/cloneFallbackReason: The volume modes of source and target are incompatible
```

Also check events:

```bash
kubectl get events -n vm-lab \
  --sort-by=.metadata.creationTimestamp
```

Do not infer the method solely from elapsed time. A backend-native clone can be slow, and a small host-assisted copy can finish quickly.

## Understand CDI's Clone Choices

CDI supports three broad paths:

1. CSI volume clone, where the CSI driver clones a PVC.
2. Snapshot-based smart clone, where CDI snapshots the source and restores a new PVC.
3. Host-assisted copy, where CDI copies data between worker Pods.

The StorageProfile advertises the preferred strategy:

```bash
kubectl get storageprofile fast-rwo -o yaml
```

Possible `cloneStrategy` values are:

```text
csi-clone
snapshot
copy
```

If no strategy is specified, CDI documents attempting snapshot cloning where possible and otherwise falling back to copy. A `csi-clone` setting should only be used when the CSI driver actually supports volume cloning.

## Check Efficient-Clone Prerequisites

For CSI cloning, current CDI checks these important requirements:

- CSI driver supports volume cloning
- StorageProfile uses `csi-clone`
- source volume and target StorageClass resolve to the same CSI driver, which supports cloning across those classes
- source and target use the same volume mode
- creator has source permission for a cross-namespace clone
- source volume is not in use

For snapshot cloning:

- a matching VolumeSnapshotClass exists
- source volume and target StorageClass resolve to the same CSI driver
- source and target use the same volume mode
- creator has source permission
- source volume is not in use

Compare source and target:

```bash
kubectl get pvc source-root -n golden-images \
  -o custom-columns=CLASS:.spec.storageClassName,MODE:.spec.volumeMode,SIZE:.status.capacity.storage

kubectl get pvc cloned-root -n vm-lab \
  -o custom-columns=CLASS:.spec.storageClassName,MODE:.spec.volumeMode,SIZE:.spec.resources.requests.storage
```

Check snapshot infrastructure:

```bash
kubectl get volumesnapshotclass
kubectl get csidriver
```

A VolumeSnapshotClass must correspond to the CSI driver shared by the source volume and target StorageClass. Merely having any snapshot class is insufficient.

## Common Fallback Reasons

### Different StorageClasses

Different StorageClass names alone do not force host-assisted copy. CDI can use an efficient clone when both classes resolve to the same CSI driver and that driver supports the operation. Moving from an RBD class such as `golden-rbd` to a CephFS class such as `team-cephfs` uses different CSI drivers and requires copying bytes:

```yaml
spec:
  source:
    pvc:
      namespace: golden-images
      name: source-root
  storage:
    storageClassName: team-cephfs
```

If movement between different CSI drivers or backends is intentional, host-assisted copy is expected.

### Different Volume Modes

A filesystem source and block target are not interchangeable for efficient clone APIs. CDI can use host-assisted copying for supported conversions, including block-to-filesystem KubeVirt content.

Keep modes identical when native cloning matters:

```yaml
storage:
  volumeMode: Block
```

Only request a mode the target driver supports.

### Missing or Incorrect Clone Strategy

Inspect both profile spec and status:

```bash
kubectl get storageprofile fast-rwo \
  -o jsonpath='{.spec.cloneStrategy}{" "}{.status.cloneStrategy}{"\n"}'
```

Do not set `csi-clone` as an optimization guess. An incorrect profile can turn a predictable fallback into a failed provisioning operation.

### Source Is in Use

CDI requires an unused source for cloning and waits while a Pod is using the source PVC, emitting a `CloneSourceInUse` event rather than falling back solely because the source is busy. Coordinate a shutdown or use an application-consistent image publication workflow. Do not detach production storage abruptly just to obtain a faster clone.

### Permission Is Missing

Cross-namespace clones must be authorized in the source namespace. The dedicated permission is `create` on `datavolumes/source`; for PVC sources, CDI also accepts permission to create Pods there. A permission failure can prevent the clone rather than simply make it slower, depending on the path and admission stage. Verify the dedicated permission explicitly:

```bash
kubectl auth can-i create datavolumes.cdi.kubevirt.io \
  --subresource=source \
  --namespace=golden-images \
  --as=system:serviceaccount:vm-lab:vm-builder
```

## Decide Whether to Fix or Accept Copy

Accept host-assisted copy when:

- moving between incompatible CSI drivers or backends
- intentionally changing volume mode
- cloning is rare and the performance cost is acceptable
- the CSI driver lacks clone or snapshot support

Fix the configuration when:

- source and target are meant to be identical
- the driver officially supports the optimized path
- recurring golden-image fan-out is saturating the network
- a missing VolumeSnapshotClass or stale StorageProfile is the only blocker

Measure clone duration, network traffic, and backend load before and after any change. Native clones may be space-efficient snapshots with performance and retention implications specific to the storage vendor.

## Official Documentation

- [CDI efficient cloning and fallback annotations](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/efficient-cloning.md)
- [CDI CSI volume cloning](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/csi-cloning.md)
- [CDI snapshot smart cloning](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/smart-clone.md)
- [CDI StorageProfile cloneStrategy](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
