# How to Set Up Rook-Ceph for Stateful Application HA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, High Availability, StatefulSet, Storage, Kubernetes

Description: Configure Rook-Ceph storage to support high-availability stateful applications using RBD mirroring, volume snapshots, and proper StatefulSet storage patterns.

---

## HA Storage Requirements for Stateful Apps

Stateful applications like databases and message queues need storage that survives node failures, supports rapid failover, and provides point-in-time recovery. Rook-Ceph provides all these capabilities through RBD replication, volume snapshots, and CSI integration.

## RBD Storage Class for HA Databases

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-ha-database
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: database-pool
  imageFormat: "2"
  imageFeatures: layering,exclusive-lock,object-map,fast-diff
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## StatefulSet with HA Storage

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql-ha
spec:
  replicas: 3
  serviceName: postgresql
  selector:
    matchLabels:
      app: postgresql-ha
  podManagementPolicy: OrderedReady
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: postgresql-ha
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: postgresql-ha
              topologyKey: kubernetes.io/hostname
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        storageClassName: ceph-ha-database
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi
```

## Configure Volume Snapshots for Point-in-Time Recovery

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ceph-rbdplugin-snapclass
driver: rook-ceph.rbd.csi.ceph.com
deletionPolicy: Retain
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
```

## Automated Snapshot Schedule

```yaml
# Create recurring snapshots using a CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pvc-snapshot
spec:
  schedule: "0 * * * *"  # Hourly
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: snapshot
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  kubectl apply -f - <<EOF
                  apiVersion: snapshot.storage.k8s.io/v1
                  kind: VolumeSnapshot
                  metadata:
                    name: db-snap-$(date +%Y%m%d%H%M)
                  spec:
                    volumeSnapshotClassName: ceph-rbdplugin-snapclass
                    source:
                      persistentVolumeClaimName: data-postgresql-ha-0
                  EOF
```

## Test Failover Behavior

```bash
# Simulate node failure
kubectl drain worker-02 --ignore-daemonsets --delete-emptydir-data

# Watch StatefulSet recovery
kubectl get pods -w -l app=postgresql-ha

# Verify data integrity after pod reschedule
kubectl exec postgresql-ha-0 -- psql -U postgres -c "SELECT COUNT(*) FROM my_table;"
```

## Monitor Storage Health for HA Apps

```bash
# Check Ceph cluster health
ceph health

# Monitor replication lag (for RBD mirrored volumes)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror image status database-pool/data-postgresql-ha-0

# Alert on nearfull
ceph osd dump | grep nearfull
```

## Summary

Rook-Ceph supports stateful application HA through 3-replica RBD pools, volume snapshots for point-in-time recovery, StatefulSet pod anti-affinity to distribute replicas across nodes, and the `Retain` reclaim policy to prevent accidental data loss. Regular automated snapshots provide an additional recovery layer beyond Ceph's built-in replication.
