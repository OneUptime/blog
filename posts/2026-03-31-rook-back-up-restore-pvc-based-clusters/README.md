# How to Back Up and Restore PVC-Based Clusters in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Backup, Disaster Recovery

Description: Back up and restore PVC-based Rook-Ceph clusters using volume snapshots and clones to protect stateful workloads on Kubernetes.

---

## Backup Strategy for PVC-Based Rook Clusters

Rook-Ceph clusters that store data on PVCs (as opposed to raw host paths) can leverage the CSI snapshot feature to take point-in-time consistent backups. The workflow involves:

1. Creating a `VolumeSnapshotClass` that targets the Rook CSI driver.
2. Taking `VolumeSnapshot` objects for each PVC.
3. Restoring from a snapshot by creating a new PVC with the snapshot as the data source.

## Setting Up the VolumeSnapshotClass

Install the external-snapshotter CRDs if not present:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
```

Create a `VolumeSnapshotClass` for Ceph RBD:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-rbdsnapclass
driver: rook-ceph.rbd.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
```

```bash
kubectl apply -f volume-snapshot-class.yaml
```

## Taking a Backup Snapshot

Create a `VolumeSnapshot` for a PVC named `my-data`:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: my-data-snapshot-20260331
  namespace: default
spec:
  volumeSnapshotClassName: csi-rbdsnapclass
  source:
    persistentVolumeClaimName: my-data
```

```bash
kubectl apply -f snapshot.yaml
kubectl get volumesnapshot my-data-snapshot-20260331
```

Wait for `READYTOUSE` to be `true`.

## Automating Backups with a Script

For periodic backups, use a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pvc-snapshot-job
  namespace: default
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-sa
          containers:
            - name: snap
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  DATE=$(date +%Y%m%d)
                  kubectl apply -f - <<EOF
                  apiVersion: snapshot.storage.k8s.io/v1
                  kind: VolumeSnapshot
                  metadata:
                    name: my-data-snap-${DATE}
                    namespace: default
                  spec:
                    volumeSnapshotClassName: csi-rbdsnapclass
                    source:
                      persistentVolumeClaimName: my-data
                  EOF
          restartPolicy: OnFailure
```

## Restoring from a Snapshot

Create a new PVC using the snapshot as a data source:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-data-restored
  namespace: default
spec:
  storageClassName: rook-ceph-block
  dataSource:
    name: my-data-snapshot-20260331
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f restored-pvc.yaml
kubectl get pvc my-data-restored
```

Once bound, mount the restored PVC into a pod to verify the data.

## Cleaning Up Old Snapshots

Delete snapshots that are no longer needed:

```bash
kubectl delete volumesnapshot my-data-snapshot-20260331
```

Consider using a retention policy script or a tool like Velero to manage snapshot lifecycle automatically.

## Summary

PVC-based Rook clusters support point-in-time snapshots through the CSI snapshot API. Set up a `VolumeSnapshotClass`, create `VolumeSnapshot` objects on a schedule, and restore by referencing a snapshot as a PVC data source. This approach integrates natively with Kubernetes and requires no external backup agent running inside the Ceph cluster.
