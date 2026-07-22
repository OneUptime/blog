# How to Choose the Right VolumeSnapshotClass for a PVC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshotClass, Persistent Volumes, Backup Policy

Description: Match a PVC to a compatible VolumeSnapshotClass while choosing safe deletion, credential, and backend snapshot policies.

---

A `VolumeSnapshotClass` is not selected by price tier, name, or its similarity to a `StorageClass`. Its first hard requirement is driver identity: the class's `driver` must match the CSI driver that owns the PVC's bound PersistentVolume. After that, choose among that driver's classes by deletion policy and vendor-specific parameters.

This order avoids a common failure mode: selecting a class called `default` or `fast-snapshots` that belongs to a different storage driver.

## Resolve the PVC's actual CSI driver

Start with a bound claim:

```bash
PVC_NAMESPACE=app
PVC_NAME=app-data

kubectl get pvc "$PVC_NAME" --namespace "$PVC_NAMESPACE" -o wide
```

Resolve the PV and read its CSI driver:

```bash
PV_NAME=$(kubectl get pvc "$PVC_NAME" \
  --namespace "$PVC_NAMESPACE" \
  -o jsonpath='{.spec.volumeName}')

PVC_CSI_DRIVER=$(kubectl get pv "$PV_NAME" \
  -o jsonpath='{.spec.csi.driver}')

printf '%s\n' "$PVC_CSI_DRIVER"
```

Use the PV as the source of truth. A StorageClass's `provisioner` normally matches, but the PVC can be statically bound or the StorageClass can have changed after provisioning.

If `.spec.csi.driver` is empty, inspect the complete PV. Kubernetes VolumeSnapshot is available only through CSI drivers. A deprecated in-tree volume or an incomplete CSI migration needs separate investigation.

Record other restore-relevant properties while you are here:

```bash
kubectl get pvc "$PVC_NAME" --namespace "$PVC_NAMESPACE" \
  -o jsonpath='storageClass={.spec.storageClassName}{"\n"}volumeMode={.spec.volumeMode}{"\n"}accessModes={.spec.accessModes}{"\n"}capacity={.status.capacity.storage}{"\n"}'
```

## Filter classes by exact driver match

List all snapshot classes:

```bash
kubectl get volumesnapshotclass \
  -o custom-columns='NAME:.metadata.name,DRIVER:.driver,POLICY:.deletionPolicy,DEFAULT:.metadata.annotations.snapshot\.storage\.kubernetes\.io/is-default-class'
```

Only rows whose `DRIVER` exactly equals the PV's `.spec.csi.driver` are candidates. Filter them with JSONPath if useful:

```bash
kubectl get volumesnapshotclass \
  -o jsonpath="{range .items[?(@.driver=='${PVC_CSI_DRIVER}')]}{.metadata.name}{'\t'}{.deletionPolicy}{'\n'}{end}"
```

If no class matches, do not clone a class for another driver and change only its name. Consult the CSI driver's installation and snapshot documentation. You may need to enable the driver's external-snapshotter component or create a class with required vendor parameters and credentials.

The mere presence of a matching class is not proof that the installed driver supports snapshots. Verify the driver's version and perform a restore test.

## Choose the deletion policy deliberately

Every class requires `deletionPolicy: Delete` or `Retain`:

- `Delete` means deleting the `VolumeSnapshot` leads to deletion of its `VolumeSnapshotContent` and a CSI `DeleteSnapshot` call for the backend snapshot.
- `Retain` leaves the `VolumeSnapshotContent` and backend snapshot after the namespaced request is deleted. A cluster administrator must manage them later.

For short-lived development copies, `Delete` can prevent abandoned snapshots. For recovery points that must survive namespace or backup-object deletion, `Retain` is safer—but only with inventory, retention, and manual cleanup automation.

This policy is copied to the dynamically created content object. It is independent of the source PV's `persistentVolumeReclaimPolicy`, and it does not make a snapshot off-cluster or immutable in the storage backend.

Inspect the candidate rather than inferring policy from its name:

```bash
kubectl get volumesnapshotclass SNAPSHOT_CLASS -o yaml
```

## Validate every vendor parameter

Kubernetes treats `parameters` as opaque strings and passes non-reserved values to the CSI driver. Their meanings can include snapshot type, consistency group, tags, location, storage pool, encryption behavior, or backend policy. Only the driver's official documentation can define them.

Do not copy parameters from a StorageClass unless the snapshot driver explicitly documents the same keys. Storage provisioning and snapshot creation are different CSI operations.

Snapshot credentials can be referenced with reserved parameters such as:

```yaml
parameters:
  csi.storage.k8s.io/snapshotter-secret-name: snapshot-credentials
  csi.storage.k8s.io/snapshotter-secret-namespace: storage-system
```

Both keys are needed as a pair. The external-snapshotter fetches the Secret and passes its data to the driver for create and delete calls. The documented values can also use supported templates based on the snapshot and content names. Confirm that the sidecar service account can read the intended Secret without granting broad access.

Missing credentials can allow a class to be created while every snapshot request fails later. Test create and delete behavior, especially if the driver needs credentials for deletion.

## Understand default class selection

An administrator can mark a default with:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: default-snapshots
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: csi.example.com
deletionPolicy: Delete
parameters: {}
```

`csi.example.com` is a structural placeholder, not a real driver. When a `VolumeSnapshot` omits `volumeSnapshotClassName`, Kubernetes determines the source PVC's driver and selects that driver's default class. Multiple CSI drivers can each have one default.

Do not create two defaults for the same driver. Kubernetes cannot choose between them and snapshot creation fails. Also note that `volumeSnapshotClassName: ""` is not a way to disable defaulting; the empty string is not allowed for this field.

Backup jobs are generally more predictable when they name an explicit class. That protects the policy from an administrator changing the default later. Defaults remain useful for interactive requests and workloads whose policy intentionally follows cluster configuration.

## Treat classes as immutable policy versions

The significant fields of a `VolumeSnapshotClass` cannot be updated after creation. When driver parameters or deletion policy change, create a new class with a versioned, descriptive name, test it, migrate automation, and retire the old class only after checking existing snapshots.

Deleting or recreating a class does not rewrite the specification of content objects already provisioned from it. The content stores the deletion policy and driver used for its own lifecycle. Even so, deleting a class can disrupt new requests and make operations harder to audit.

A naming scheme can expose intent without replacing inspection, for example:

- `block-csi-retain-v2` for durable recovery points;
- `block-csi-delete-dev-v1` for short-lived test snapshots; and
- `file-csi-daily-v1` for a separate file driver.

Avoid embedding promises such as `immutable` or `cross-region` unless the backend configuration actually enforces them.

## Check restore compatibility, not just creation

Before approving a class, create a snapshot of a disposable PVC and wait for `status.readyToUse: true`. Then create a new PVC with that snapshot as `dataSource` and a StorageClass whose provisioner uses the same compatible driver.

The restored claim should:

- request at least `status.restoreSize` when reported;
- use the expected `Filesystem` or `Block` volume mode;
- comply with the driver's supported access modes and topology; and
- mount with intact test data.

A class can successfully create backend snapshots while restore fails because of a StorageClass parameter, zone, encryption key, capacity, driver version, or unsupported volume type. Test the complete combination: source StorageClass, source volume mode, snapshot class, target StorageClass, and driver release.

## Use a short approval checklist

Select a class only after all answers are explicit:

1. Does its `driver` exactly match the bound PV's CSI driver?
2. Does the installed driver version document snapshot and restore support for this volume type?
3. Is `Retain` or `Delete` appropriate for the recovery policy?
4. Are all parameters and credential references defined by current vendor documentation?
5. Is there at most one default for this driver?
6. Does the class meet backend location, encryption, durability, and retention requirements?
7. Has a snapshot been created, restored, mounted, and application-validated?
8. Is deletion behavior tested and owned?

The right class is the one that passes all eight checks, not simply the one Kubernetes accepts.

## Official Documentation

- [Kubernetes Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI VolumeSnapshotClass API reference](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html#volumesnapshotclass)
- [Kubernetes CSI VolumeSnapshotClass secrets](https://kubernetes-csi.github.io/docs/secrets-and-credentials-volume-snapshot-class.html)
- [Kubernetes CSI external-snapshotter class parameters](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
