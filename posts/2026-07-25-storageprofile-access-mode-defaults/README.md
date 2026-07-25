# Why Does CDI Pick the Wrong Access Mode? Understanding StorageProfile Defaults

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, StorageProfile, Persistent Volume

Description: Understand CDI StorageProfile selection, explain surprising access modes, and override defaults without breaking other KubeVirt workloads.

---

When a DataVolume uses `spec.storage` with the default KubeVirt disk-image content type and omits `accessModes` or `volumeMode`, CDI tries to render those fields from the StorageProfile for the selected StorageClass, falling back to a Kubernetes default where one exists. A result that looks "wrong" is usually the first compatible preference in that profile, a user override on the profile, or a different StorageClass than the author expected.

CDI cannot discover every operational requirement. It may prefer combinations that support performance or live migration, while your particular VM requires a simpler mode.

## Trace the Decision

First identify the rendered PVC, selected StorageClass, and corresponding StorageProfile:

```bash
kubectl get datavolume vm-root -n vm-lab -o yaml
kubectl get pvc vm-root -n vm-lab -o yaml
kubectl get pvc vm-root -n vm-lab \
  -o jsonpath='{.spec.storageClassName}{"\n"}'
kubectl get storageprofile fast-storage -o yaml
```

A profile can contain ordered alternatives:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: StorageProfile
metadata:
  name: fast-storage
spec:
  claimPropertySets:
    - accessModes:
        - ReadWriteMany
      volumeMode: Block
    - accessModes:
        - ReadWriteOnce
      volumeMode: Block
    - accessModes:
        - ReadWriteOnce
      volumeMode: Filesystem
status:
  storageClass: fast-storage
  provisioner: storage.example.com/csi
  claimPropertySets:
    - accessModes:
        - ReadWriteMany
      volumeMode: Block
    - accessModes:
        - ReadWriteOnce
      volumeMode: Block
    - accessModes:
        - ReadWriteOnce
      volumeMode: Filesystem
```

The status is what controllers currently consume. The spec contains administrator overrides. CDI-provided defaults appear in status when no user override replaces them.

## Understand Compatibility Matching

`claimPropertySets` is ordered by preference. CDI considers values already supplied in the DataVolume and chooses a compatible set for fields that remain unspecified.

For example, this request fixes the volume mode but lets CDI choose access:

```yaml
spec:
  storage:
    storageClassName: fast-storage
    volumeMode: Filesystem
    resources:
      requests:
        storage: 30Gi
```

CDI searches for a property set compatible with `Filesystem`. If the profile only advertises block combinations, CDI cannot supply the required access mode: rendering fails and the DataVolume receives an `ErrClaimNotValid` warning event. In the inverse case, where `accessModes` is supplied but no profile set has a matching volume mode, CDI leaves `volumeMode` unset and Kubernetes defaults it to `Filesystem`.

This request removes ambiguity:

```yaml
spec:
  storage:
    storageClassName: fast-storage
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 30Gi
```

An explicit DataVolume parameter has higher priority than StorageProfile defaults.

## Check Which Default StorageClass Was Chosen

For the default KubeVirt disk-image content type, if `storageClassName` is absent, CDI prefers a class annotated as the default virtualization class before the normal Kubernetes default. A DataVolume with `contentType: archive` uses the normal Kubernetes default instead.

```bash
kubectl get storageclass \
  -o custom-columns=NAME:.metadata.name,K8S_DEFAULT:.metadata.annotations.storageclass\\.kubernetes\\.io/is-default-class,VIRT_DEFAULT:.metadata.annotations.storageclass\\.kubevirt\\.io/is-default-virt-class
```

A manifest tested on one cluster can therefore render differently on another. Reusable production manifests should name the class or deliberately accept platform defaults.

Also check the DataVolume itself for an explicit class inherited from a VM template or higher-level operator:

```bash
kubectl get vm web-vm -n vm-lab -o yaml
kubectl get datavolume vm-root -n vm-lab -o yaml
```

## Pick Access Mode Based on Storage Semantics

Access modes describe how Kubernetes may mount a volume; they are not generic performance levels.

- `ReadWriteOnce` permits read-write mounting by a single node. Multiple Pods on that node can still use it.
- `ReadWriteMany` permits read-write mounting by many nodes, if the driver supports it.
- `ReadOnlyMany` permits read-only mounting by many nodes.
- `ReadWriteOncePod` restricts read-write access to one Pod and is only supported for CSI volumes under specific Kubernetes and driver conditions. CDI's StorageProfile documentation notes that CDI does not currently test it as a profile default.

For a single non-migrating VM, `ReadWriteOnce` is usually adequate. For a VM using a PVC, KubeVirt's live-migration documentation requires shared `ReadWriteMany` storage. Confirm that the driver supports the mode and check the VMI's `LiveMigratable` condition before relying on migration. Do not select `ReadWriteMany` merely because it appears more capable.

## Override One Workload or the Whole Class

For one DataVolume, override fields locally:

```yaml
storage:
  storageClassName: fast-storage
  accessModes:
    - ReadWriteOnce
  volumeMode: Block
  resources:
    requests:
      storage: 30Gi
```

This is the lowest-risk choice because it does not affect other tenants.

For an incorrect cluster-wide profile, a storage administrator can update `spec.claimPropertySets`:

```bash
kubectl edit storageprofile fast-storage
```

Use a reviewed manifest for repeatability:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: StorageProfile
metadata:
  name: fast-storage
spec:
  claimPropertySets:
    - accessModes:
        - ReadWriteOnce
      volumeMode: Block
    - accessModes:
        - ReadWriteOnce
      volumeMode: Filesystem
```

After applying it, wait for status reconciliation and create a test DataVolume. Existing PVC access modes are generally immutable, so a profile change does not rewrite already provisioned disks.

## Verify What Was Actually Provisioned

Do not stop at the DataVolume spec. Inspect the claim and events:

```bash
kubectl get pvc vm-root -n vm-lab \
  -o custom-columns=NAME:.metadata.name,CLASS:.spec.storageClassName,ACCESS:.spec.accessModes,MODE:.spec.volumeMode,PHASE:.status.phase
kubectl describe pvc vm-root -n vm-lab
```

If the driver rejects the combination, fix the requested mode or the profile to match documented driver capabilities. StorageProfile recommendations help CDI render claims, but they do not add features to the CSI driver.

## Official Documentation

- [CDI StorageProfile behavior and priorities](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [CDI DataVolume target storage](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [Kubernetes persistent volume access modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
