# How to Clone PVCs with Ceph CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, PVC, Clone, CSI, RBD, Storage

Description: Clone Kubernetes PersistentVolumeClaims backed by Ceph using the CSI volume cloning feature to create independent copies for testing, staging, and data pipelines.

---

## What is PVC Cloning?

PVC cloning creates a new PVC that is an exact copy of an existing PVC at the moment of cloning. Unlike snapshots (which create a point-in-time reference), a clone is a fully independent volume from the start. Ceph CSI implements cloning efficiently using RBD copy-on-write, so the initial clone operation is fast even for large volumes.

## Prerequisites

- Rook 1.8+ with Ceph CSI 3.x
- Source PVC must be in the same namespace as the clone
- Source PVC's StorageClass must support cloning

## Cloning an RBD PVC

Specify the source PVC in the `dataSource` field:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-clone-for-staging
  namespace: staging
spec:
  storageClassName: rook-ceph-block
  dataSource:
    name: db-production
    kind: PersistentVolumeClaim
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

The clone must request at least as much storage as the source PVC.

## Cloning a CephFS PVC

The same syntax works for CephFS volumes:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dataset-clone
  namespace: ml-experiments
spec:
  storageClassName: rook-cephfs
  dataSource:
    name: training-dataset
    kind: PersistentVolumeClaim
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 500Gi
```

## Practical Use Case: Seeding a Test Database

Clone a database PVC within the same namespace for testing without affecting the original:

```bash
# List PVCs in the namespace
kubectl get pvc -n myapp

# Apply the clone manifest
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data-test-clone
  namespace: myapp
spec:
  storageClassName: rook-ceph-block
  dataSource:
    name: db-data
    kind: PersistentVolumeClaim
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
EOF

# Wait for clone to be bound
kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/db-data-test-clone -n myapp --timeout=120s
```

## Verifying the Clone

```bash
# Check clone status
kubectl get pvc db-data-test-clone -n myapp

# Verify it's a separate RBD image in Ceph
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rbd ls replicapool | grep csi-vol
```

## Cloning vs. Snapshots: When to Use Which

| Feature | Clone | Snapshot |
|---------|-------|----------|
| Independent copy immediately | Yes | No (PVC restore creates independent copy) |
| Storage consumed immediately | Yes | Only for changed blocks |
| Cross-namespace use | No (without VolumePopulator) | No |
| Use for backup | No | Yes |
| Use for staging seed | Yes | Yes (restore to new PVC) |

## Summary

Ceph CSI PVC cloning provides a fast and convenient way to create independent copies of volumes for staging environments, data pipeline branches, and experiment isolation. Using Ceph's copy-on-write mechanism, the clone operation completes quickly regardless of volume size. Clones are fully independent from the moment of creation, so modifications to the clone never affect the source PVC.
