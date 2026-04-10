# How to Configure Rook-Ceph for Blue-Green Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Blue-Green, Deployment, Storage, Migration

Description: Use Rook-Ceph volume cloning, snapshots, and dual StorageClasses to enable blue-green deployments for stateful applications with safe storage rollback.

---

## Blue-Green for Stateful Apps

Blue-green deployment for stateless apps is straightforward - swap traffic between two deployments. For stateful apps backed by Ceph storage, blue-green requires cloning or mirroring storage so both environments are live simultaneously.

## Strategy 1: Volume Clone for Blue-Green

RBD volume cloning creates an instant copy of a PVC for the green environment:

```yaml
# Create a snapshot of the blue PVC
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: blue-db-snapshot
spec:
  volumeSnapshotClassName: ceph-rbdplugin-snapclass
  source:
    persistentVolumeClaimName: data-blue-db-0
```

```yaml
# Create the green PVC from the snapshot
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-green-db-0
spec:
  storageClassName: ceph-ha-database
  dataSource:
    name: blue-db-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 100Gi
```

## Deploy the Green Environment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
  labels:
    version: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      volumes:
        - name: db-storage
          persistentVolumeClaim:
            claimName: data-green-db-0
      containers:
        - name: app
          image: myapp:v2.0
```

## Traffic Switching

```yaml
# Point production service to green deployment
apiVersion: v1
kind: Service
metadata:
  name: myapp-production
spec:
  selector:
    app: myapp
    version: green   # Change from "blue" to "green" to switch traffic
  ports:
    - port: 80
      targetPort: 8080
```

## Rollback Strategy

```bash
# Rollback: switch traffic back to blue
kubectl patch service myapp-production \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# The blue environment's storage was never modified - safe rollback
kubectl delete deployment app-green
kubectl delete pvc data-green-db-0
kubectl delete volumesnapshot blue-db-snapshot
```

## Strategy 2: ReadWriteMany for Shared State

For apps that support shared filesystem access:

```yaml
# Both blue and green read from the same CephFS volume
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-state
spec:
  storageClassName: rook-cephfs
  accessModes: ["ReadWriteMany"]
  resources:
    requests:
      storage: 10Gi
```

## Monitoring During Cutover

```bash
# Watch pod readiness during transition
kubectl get pods -l app=myapp -w

# Monitor Ceph storage operations during clone
ceph status
ceph -w  # Watch cluster events during clone operations

# Check that green PVC is fully materialized
kubectl describe pvc data-green-db-0 | grep -E "Status|Capacity"
```

## Summary

Blue-green deployments for Rook-Ceph-backed stateful applications use RBD volume snapshots to instantly clone production data into the green environment. Traffic switching via Service selector changes is instant, and rollback is safe because the blue environment's storage is never modified during the green deployment lifecycle. This approach supports zero-downtime database schema migrations and application version upgrades.
