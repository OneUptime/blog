# How to Set Up Ceph RBD Storage for PostgreSQL on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, PostgreSQL, RBD, Kubernetes, Database

Description: Learn how to provision and configure Ceph RBD block storage for PostgreSQL running on Kubernetes, covering StorageClass setup, StatefulSet configuration, and performance tuning.

---

PostgreSQL is one of the most popular relational databases and runs well on Kubernetes with Rook-Ceph providing block storage. RBD (RADOS Block Device) gives PostgreSQL consistent, low-latency I/O that is essential for transactional workloads.

## Creating a Dedicated Pool for PostgreSQL

Create a replicated pool tuned for database workloads:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create postgres-pool 64 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set postgres-pool size 3

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init postgres-pool
```

## Creating the StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-postgres
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: postgres-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Deploying PostgreSQL with Ceph Storage

Deploy PostgreSQL as a StatefulSet:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      securityContext:
        fsGroup: 999
      containers:
        - name: postgres
          image: postgres:16
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: rook-ceph-postgres
        resources:
          requests:
            storage: 100Gi
```

## PostgreSQL Configuration for RBD

Tune PostgreSQL for the RBD storage backend:

```sql
-- In postgresql.conf or via ALTER SYSTEM
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET synchronous_commit = on;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_cache_size = '4GB';
ALTER SYSTEM SET shared_buffers = '1GB';
SELECT pg_reload_conf();
```

Note: `shared_buffers` and `wal_level` are postmaster parameters that require a full PostgreSQL restart to take effect. The `pg_reload_conf()` call above applies the other settings immediately, but you must restart the pod for `shared_buffers` and `wal_level` changes:

```bash
kubectl -n databases rollout restart statefulset postgres
```

Setting `random_page_cost = 1.1` (close to 1.0) tells the query planner that random I/O is nearly as fast as sequential, which is true for RBD-backed SSDs.

## Expanding the PostgreSQL Volume

When the database outgrows its volume:

```bash
kubectl -n databases patch pvc postgres-data-postgres-0 \
  -p '{"spec": {"resources": {"requests": {"storage": "200Gi"}}}}'

# Confirm resize
kubectl -n databases get pvc postgres-data-postgres-0
```

## Verifying I/O Performance

Run a quick benchmark inside the pod:

```bash
kubectl -n databases exec -it postgres-0 -- bash -c \
  "dd if=/dev/zero of=/var/lib/postgresql/data/testfile bs=1M count=1000 conv=fdatasync && rm /var/lib/postgresql/data/testfile"
```

## Summary

Rook-Ceph RBD provides high-performance block storage for PostgreSQL on Kubernetes. A dedicated pool with 3x replication, a StorageClass with `reclaimPolicy: Retain`, and a StatefulSet with `volumeClaimTemplates` form the foundation of a production-ready PostgreSQL deployment. Tuning `random_page_cost` closer to 1.0 helps the query planner make optimal decisions for RBD-backed SSD storage.
