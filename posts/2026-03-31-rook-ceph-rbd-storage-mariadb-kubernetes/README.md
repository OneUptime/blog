# How to Set Up Ceph RBD Storage for MariaDB on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MariaDB, RBD, Kubernetes, Database

Description: Learn how to configure Ceph RBD block storage for MariaDB on Kubernetes using the MariaDB Operator, including Galera cluster setup and binary log retention.

---

MariaDB is a popular MySQL-compatible relational database. Running it on Kubernetes with Rook-Ceph RBD storage provides the durable block storage needed for InnoDB data files, undo logs, and binary logs essential for replication and recovery.

## Creating a MariaDB Block Pool

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create mariadb-pool 64 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mariadb-pool size 3

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init mariadb-pool
```

## Creating the StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-mariadb
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: mariadb-pool
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

## Deploying MariaDB with the MariaDB Operator

Use the mariadb-operator for production deployments:

```yaml
apiVersion: k8s.mariadb.com/v1alpha1
kind: MariaDB
metadata:
  name: mariadb
  namespace: databases
spec:
  rootPasswordSecretKeyRef:
    name: mariadb-secret
    key: root-password
  storage:
    size: 100Gi
    storageClassName: rook-ceph-mariadb
  replicas: 3
  replication:
    enabled: true
    mode: SemiSync
    primary:
      podIndex: 0
      automaticFailover: true
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: "2"
      memory: 4Gi
  myCnf: |
    [mysqld]
    innodb_buffer_pool_size = 2G
    innodb_log_file_size = 512M
    innodb_flush_log_at_trx_commit = 1
    innodb_flush_method = O_DIRECT
    innodb_io_capacity = 2000
    # Binary logging for replication
    log_bin = mysql-bin
    binlog_format = ROW
    expire_logs_days = 7
    max_binlog_size = 100M
```

## Setting Up MariaDB Galera Cluster

For synchronous multi-master replication:

```yaml
apiVersion: k8s.mariadb.com/v1alpha1
kind: MariaDB
metadata:
  name: mariadb-galera
  namespace: databases
spec:
  galera:
    enabled: true
    sst: mariabackup
    replicaThreads: 1
    providerOptions:
      gcs.fc_limit: "128"
  replicas: 3
  storage:
    size: 100Gi
    storageClassName: rook-ceph-mariadb
  rootPasswordSecretKeyRef:
    name: mariadb-galera-secret
    key: root-password
```

## Backing Up MariaDB to Ceph RGW

Use mariabackup with S3 destination:

```bash
kubectl -n databases exec -it mariadb-0 -- bash -c \
  "mariabackup --backup --stream=xbstream | \
   aws s3 cp - s3://mariadb-backups/backup-$(date +%Y%m%d).xbstream \
   --endpoint-url http://rook-ceph-rgw.rook-ceph.svc.cluster.local"
```

## Monitoring Replication

```sql
-- Check replication status on replicas (MariaDB 10.5.1+)
SHOW REPLICA STATUS\G

-- Check Galera cluster status
SHOW STATUS LIKE 'wsrep_%';

-- Check binary log position (MariaDB 10.5.2+)
SHOW BINLOG STATUS;
```

## Summary

Ceph RBD provides the durable block storage for MariaDB's InnoDB data files and binary logs on Kubernetes. The mariadb-operator simplifies deployment of both standalone and Galera cluster configurations using Rook StorageClasses. Setting `innodb_flush_method = O_DIRECT` and tuning `innodb_io_capacity` for SSD-backed RBD ensures optimal InnoDB performance while preventing double-caching in the OS page cache.
