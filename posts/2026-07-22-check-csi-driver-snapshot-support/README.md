# How to Check Whether Your Kubernetes CSI Driver Supports Volume Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Volume Snapshot, Storage Driver, Troubleshooting

Description: Verify snapshot creation and restore support across the Kubernetes API, CSI deployment, driver capability, and storage backend.

---

The presence of `VolumeSnapshot` CRDs does not prove that a Kubernetes storage driver can take snapshots. Neither does a `CSIDriver` object, a `VolumeSnapshotClass`, or a successful backend snapshot created outside Kubernetes. End-to-end support requires the cluster components, the correct driver deployment, the CSI snapshot RPCs, and restore behavior to work together.

The most reliable check combines official driver documentation with a reversible creation-and-restore test.

## Start with the PVC, not the node plugin

First identify the exact PersistentVolume and CSI driver used by the PVC you plan to protect:

```bash
PVC_NAMESPACE=app
PVC_NAME=app-data

PV_NAME=$(kubectl get pvc "$PVC_NAME" \
  --namespace "$PVC_NAMESPACE" \
  -o jsonpath='{.spec.volumeName}')

kubectl get pvc "$PVC_NAME" --namespace "$PVC_NAMESPACE" -o wide
kubectl get pv "$PV_NAME" \
  -o jsonpath='{.spec.csi.driver}{"\n"}'
```

If `.spec.csi.driver` is empty, inspect the complete PV:

```bash
kubectl get pv "$PV_NAME" -o yaml
```

The volume may use a deprecated in-tree plugin or be affected by CSI migration. Kubernetes `VolumeSnapshot` support is for CSI drivers; confirm the migration and snapshot behavior in the current vendor documentation rather than assuming the old provisioner name is enough.

Also confirm that the source claim is `Bound`. The snapshot controller cannot dynamically snapshot an unbound PVC.

## Check the cluster-wide snapshot API

The cluster needs three CRDs and a common snapshot controller:

```bash
kubectl api-resources --api-group=snapshot.storage.k8s.io

kubectl get crd \
  volumesnapshots.snapshot.storage.k8s.io \
  volumesnapshotcontents.snapshot.storage.k8s.io \
  volumesnapshotclasses.snapshot.storage.k8s.io

kubectl get deployment --all-namespaces | grep snapshot-controller
```

You should see `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass` served at `snapshot.storage.k8s.io/v1`, plus a healthy snapshot-controller deployment. These components are driver-neutral. Their presence proves only that Kubernetes can host and reconcile the API objects.

If they are absent, install them through the Kubernetes distribution or from a compatible, pinned external-snapshotter release before testing the driver.

## Do not infer capability from CSIDriver

This is a common false check:

```bash
kubectl get csidriver
```

The object is useful for identifying installed drivers and Kubernetes interaction settings, but it does not expose the CSI controller's snapshot capability list. There is no standard `kubectl get csidriver ...` field that says `supportsSnapshots: true`.

At the CSI protocol level, a snapshot-capable driver advertises the `CREATE_DELETE_SNAPSHOT` controller service capability and implements `CreateSnapshot` and `DeleteSnapshot`. `ListSnapshots` is optional. Kubernetes does not mirror that RPC response into the `CSIDriver` object.

Directly querying the Unix socket with a CSI client can help a driver developer, but it is not a portable cluster-user test: controller pods use different socket paths and images often contain no diagnostic client. Prefer the vendor's capability statement and an end-to-end Kubernetes test.

## Inspect the driver's controller deployment

Snapshot calls go through an external-snapshotter sidecar colocated with the CSI controller service. Find the controller workload for the driver-not the node-plugin DaemonSet-and inspect its containers:

```bash
kubectl get deployment,statefulset --all-namespaces

kubectl get WORKLOAD_KIND DRIVER_CONTROLLER \
  --namespace DRIVER_NAMESPACE \
  -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"\t"}{.image}{"\n"}{end}'
```

Replace `WORKLOAD_KIND` with `deployment` or `statefulset`, based on the controller workload you found.

A container commonly named `csi-snapshotter` is strong evidence that the installed driver package is configured for snapshots. It is not proof by itself. The sidecar could be incompatible, pointed at the wrong CSI socket, or paired with a driver that does not advertise `CREATE_DELETE_SNAPSHOT`.

Do not manually add the sidecar from a generic example. Use the driver's official chart or manifests so its socket, RBAC, credentials, flags, and supported version remain consistent.

## Find a matching VolumeSnapshotClass

List the classes and compare their `driver` fields to the source PV:

```bash
kubectl get volumesnapshotclass \
  -o custom-columns='NAME:.metadata.name,DRIVER:.driver,POLICY:.deletionPolicy,DEFAULT:.metadata.annotations.snapshot\.storage\.kubernetes\.io/is-default-class'
```

Then inspect the candidate:

```bash
kubectl get volumesnapshotclass SNAPSHOT_CLASS -o yaml
```

The class's `driver` must exactly match `.spec.csi.driver` on the PV. Parameters and credential references are vendor-specific. A matching class shows that an administrator configured a route to the driver; because these resources can be created manually, it still does not guarantee the backend accepts snapshot calls.

The Kubernetes CSI driver directory can be a discovery aid, but its own disclaimer says entries are not validated by SIG Storage. Treat the vendor's current documentation and support matrix as authoritative for driver version, volume type, topology, encryption, and managed-cluster limitations.

## Run a snapshot smoke test

Use a disposable PVC containing a known marker file. Avoid making the first test against a busy production database, because ordinary storage snapshots may only be crash-consistent.

Create a request with an explicit class:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: csi-snapshot-test
  namespace: app
spec:
  volumeSnapshotClassName: SNAPSHOT_CLASS
  source:
    persistentVolumeClaimName: app-data-test
```

Replace `SNAPSHOT_CLASS` with the real class name, apply it, and watch status:

```bash
kubectl apply -f snapshot-test.yaml

kubectl get volumesnapshot csi-snapshot-test \
  --namespace app \
  --watch
```

Success requires more than the object existing. Verify:

```bash
kubectl get volumesnapshot csi-snapshot-test \
  --namespace app \
  -o jsonpath='{.status.readyToUse}{"\t"}{.status.restoreSize}{"\t"}{.status.boundVolumeSnapshotContentName}{"\n"}'
```

`readyToUse` should become `true`, and a content name should be present. Resolve that content and inspect its status:

```bash
CONTENT_NAME=$(kubectl get volumesnapshot csi-snapshot-test \
  --namespace app \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

kubectl get volumesnapshotcontent "$CONTENT_NAME" \
  -o jsonpath='{.spec.driver}{"\t"}{.status.snapshotHandle}{"\t"}{.status.readyToUse}{"\n"}'
```

The snapshot handle should be non-empty. Check the storage backend as well; the handle's format and visibility are driver-specific.

## Prove restore support separately

Kubernetes restore means provisioning a new volume whose CSI `CreateVolume` request carries the snapshot as its content source. Create a new PVC in the same namespace with the same compatible StorageClass, access mode, and volume mode. If the snapshot reports `restoreSize`, the PVC's requested size must be at least that value:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data-restored-test
  namespace: app
spec:
  storageClassName: APP_STORAGE_CLASS
  dataSource:
    name: csi-snapshot-test
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 5Gi
```

Replace the class and capacity with values from the source PVC and snapshot. Wait for the claim to bind, mount it in a disposable Pod, and verify the marker file and expected filesystem. This catches installations that can create a snapshot but cannot provision a usable restored volume.

If the StorageClass uses `WaitForFirstConsumer`, `Pending` can be normal until a Pod references the PVC. Create the validation Pod before diagnosing provisioning as broken.

## Interpret failures by stage

| Observation | Most likely layer |
| --- | --- |
| API server rejects the kind | CRDs missing or wrong API version |
| Snapshot exists but no content is bound | Common controller, source PVC, class, or RBAC |
| Content exists but no snapshot handle | External snapshotter, CSI socket, driver capability, credentials, or backend |
| Handle exists and readiness stays false | Driver reports backend snapshot is not ready |
| Snapshot is ready but restored PVC stays Pending | External provisioner, StorageClass/driver mismatch, size, topology, or restore support |
| Restored PVC mounts but data is invalid | Application consistency or backend restore semantics |

Use `kubectl describe` for events, then read logs from the common controller, driver-specific snapshotter, CSI driver, and external provisioner in that order. Do not patch `status.readyToUse` manually; it is controller-owned evidence, not a switch.

Only after both creation and data verification succeed should you mark that exact driver version, volume type, StorageClass, and snapshot class combination as supported.

## Official Documentation

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI external-snapshotter](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Kubernetes CSI external-provisioner data sources](https://kubernetes-csi.github.io/docs/external-provisioner.html#datasources)
- [Kubernetes CSI driver directory and disclaimer](https://kubernetes-csi.github.io/docs/drivers.html)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)
