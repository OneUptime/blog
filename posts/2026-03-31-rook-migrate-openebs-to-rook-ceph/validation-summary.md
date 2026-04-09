# Validation Summary: How to Migrate from OpenEBS to Rook-Ceph on Kubernetes

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Kubernetes
- Rook-Ceph (RBD block storage, CSI driver)
- OpenEBS (cStor, Jiva)
- Ceph (RBD, RGW, CephFS)
- kubectl CLI
- Kubernetes VolumeSnapshots
- rsync

## Sources Consulted
- Rook official documentation: Block Storage (RBD) StorageClass configuration — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook GitHub examples: `deploy/examples/csi/rbd/storageclass.yaml` — https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- Kubernetes official documentation: VolumeSnapshots — https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes official documentation: kubectl wait — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found

### Issue 1: Rook-Ceph RBD StorageClass missing required CSI secret parameters
**What was wrong:** The StorageClass definition was missing all six required CSI secret parameters (`provisioner-secret-name/namespace`, `controller-expand-secret-name/namespace`, `node-stage-secret-name/namespace`) and the `fstype` parameter. Without these, the CSI driver cannot authenticate with the Ceph cluster and PVC provisioning will fail.

**What was changed:** Added the following parameters to the StorageClass:
- `csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner`
- `csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph`
- `csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner`
- `csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph`
- `csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node`
- `csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph`
- `csi.storage.k8s.io/fstype: ext4`

**Why:** These parameters are required per the official Rook-Ceph RBD StorageClass examples. They tell the CSI driver which Kubernetes Secrets contain the Ceph authentication credentials.

### Issue 2: VolumeSnapshot uses deprecated API group and incorrect spec structure
**What was wrong:** The VolumeSnapshot manifest used `apiVersion: volumesnapshot.external-storage.k8s.io/v1`, which belongs to the archived kubernetes-incubator/external-storage project. Additionally, `persistentVolumeClaimName` was placed directly under `spec` instead of nested under `spec.source`.

**What was changed:** Updated apiVersion to `snapshot.storage.k8s.io/v1` (GA since Kubernetes 1.20) and moved `persistentVolumeClaimName` under `spec.source` to match the GA API structure.

**Why:** The external-storage API group has been deprecated and removed. The GA VolumeSnapshot API at `snapshot.storage.k8s.io/v1` is the correct and current API.

### Issue 3: `kubectl wait` uses invalid condition for Pod phase
**What was wrong:** The command `kubectl wait pod ... --for=condition=Succeeded` is incorrect because `Succeeded` is a Pod phase (`.status.phase`), not a Pod condition (`.status.conditions[]`). Pod conditions include `Ready`, `ContainersReady`, `Initialized`, and `PodScheduled` — but not `Succeeded`.

**What was changed:** Changed `--for=condition=Succeeded` to `--for=jsonpath='{.status.phase}'=Succeeded`.

**Why:** The `--for=condition=X` form checks `.status.conditions[]` entries. To match against the pod phase, the `--for=jsonpath=` form must be used, as documented in the official kubectl wait reference.

## Review Notes
- The migration pod approach (rsync between mounted PVCs) is sound and commonly used for block storage migrations.
- The post correctly uses `restartPolicy: Never` for the one-shot migration pod.
- The init container technique to wait for volume readiness is a reasonable pattern.
- The `reclaimPolicy: Retain` choice is appropriate for a migration context where data protection is important.
- The comparison table is broadly accurate. OpenEBS cStor does use synchronous replication, and Ceph RBD supports CSI snapshots natively.
- The post does not mention that a VolumeSnapshotClass CRD may need to be created for the snapshot step to work, which readers might need depending on their setup.
