# How to Set Up Ceph RBD Storage for CockroachDB on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CockroachDB, RBD, Kubernetes, Database

Description: Learn how to provision Ceph RBD block storage for CockroachDB on Kubernetes, covering cluster deployment, storage configuration, and zone replication settings.

---

CockroachDB is a distributed SQL database designed for cloud-native environments. It stores data using the Pebble storage engine that performs well on block devices. Rook-Ceph RBD provides the per-node persistent storage that CockroachDB needs on Kubernetes.

## CockroachDB Storage Architecture

Each CockroachDB node stores:
- **Pebble data files** - The core database storage
- **WAL files** - Write-ahead log for crash recovery
- **Temporary sort files** - For large query operations

Each node manages its own storage independently, making RBD ReadWriteOnce the correct access mode.

## Creating the Block Pool and StorageClass

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create cockroachdb-pool 64 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init cockroachdb-pool
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-cockroachdb
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: cockroachdb-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Deploying CockroachDB with the Operator

Use the CockroachDB Kubernetes operator:

```yaml
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: cockroachdb
  namespace: databases
spec:
  dataStore:
    pvc:
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 200Gi
        storageClassName: rook-ceph-cockroachdb
        volumeMode: Filesystem
  nodes: 3
  cockroachDBVersion: v23.2.3
  tlsEnabled: true
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      cpu: "2"
      memory: 8Gi
```

## Manual StatefulSet Deployment

If not using the operator:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cockroachdb
  namespace: databases
spec:
  serviceName: cockroachdb
  replicas: 3
  selector:
    matchLabels:
      app: cockroachdb
  template:
    metadata:
      labels:
        app: cockroachdb
    spec:
      containers:
        - name: cockroachdb
          image: cockroachdb/cockroach:v23.2.3
          args:
            - start
            - --logtostderr
            - --insecure
            - --join=cockroachdb-0.cockroachdb,cockroachdb-1.cockroachdb,cockroachdb-2.cockroachdb
            - --cache=256MiB
            - --max-sql-memory=256MiB
          volumeMounts:
            - name: datadir
              mountPath: /cockroach/cockroach-data
  volumeClaimTemplates:
    - metadata:
        name: datadir
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: rook-ceph-cockroachdb
        resources:
          requests:
            storage: 200Gi
```

## Performance Tuning

CockroachDB benefits from tuning storage and memory settings:

```bash
# Set store size per node by adding the --store flag to startup args
# --store=path=/cockroach/cockroach-data,size=190GiB
```

```sql
-- Limit snapshot rebalance rate to reduce I/O pressure on Ceph RBD
SET CLUSTER SETTING kv.snapshot_rebalance.max_rate = '64 MiB';

-- Limit snapshot recovery rate for network-attached storage
SET CLUSTER SETTING kv.snapshot_recovery.max_rate = '64 MiB';
```

## Cluster Health Monitoring

```bash
kubectl -n databases exec -it cockroachdb-0 -- \
  cockroach node status --insecure

kubectl -n databases exec -it cockroachdb-0 -- \
  cockroach debug zip --insecure /tmp/debug.zip
```

## Summary

Ceph RBD provides the per-node persistent storage CockroachDB needs for its distributed SQL engine. Both the CockroachDB Kubernetes operator and manual StatefulSet deployments reference Rook StorageClasses for PVC provisioning. Using `reclaimPolicy: Retain` protects data during maintenance, and tuning Pebble storage settings ensures consistent write performance on RBD-backed storage.
