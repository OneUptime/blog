# How to Set Up Ceph RBD Storage for MySQL on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MySQL, RBD, Kubernetes, Database

Description: Learn how to configure Ceph RBD block storage for MySQL on Kubernetes, including StorageClass creation, InnoDB tuning, and deploying MySQL with persistent volumes.

---

MySQL running on Kubernetes requires reliable block storage with low-latency I/O for InnoDB's write-ahead log. Rook-Ceph RBD provides the ReadWriteOnce block storage that MySQL needs for consistent transactional performance.

## Creating a MySQL-Optimized Block Pool

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create mysql-pool 64 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mysql-pool size 3

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init mysql-pool
```

## Creating the StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-mysql
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: mysql-pool
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

## Deploying MySQL with Rook Storage

Deploy MySQL as a StatefulSet with dedicated PVC:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: databases
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: root-password
          ports:
            - containerPort: 3306
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
          livenessProbe:
            exec:
              command: ["mysqladmin", "ping", "-h", "127.0.0.1"]
            initialDelaySeconds: 30
            periodSeconds: 10
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: rook-ceph-mysql
        resources:
          requests:
            storage: 100Gi
```

## Tuning MySQL InnoDB for RBD

Create a MySQL configuration file optimized for block storage:

```ini
[mysqld]
# InnoDB settings for RBD storage
innodb_buffer_pool_size = 2G
innodb_redo_log_capacity = 1G
innodb_flush_log_at_trx_commit = 1
innodb_flush_method = O_DIRECT

# Increase I/O capacity for SSDs
innodb_io_capacity = 2000
innodb_io_capacity_max = 4000
```

Mount this as a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
  namespace: databases
data:
  my.cnf: |
    [mysqld]
    innodb_buffer_pool_size = 2G
    innodb_redo_log_capacity = 1G
    innodb_flush_log_at_trx_commit = 1
    innodb_flush_method = O_DIRECT
    innodb_io_capacity = 2000
    innodb_io_capacity_max = 4000
```

## Backup MySQL to Ceph RGW

Use mysqldump with S3 upload for backups:

```bash
kubectl -n databases exec -it mysql-0 -- bash -c \
  "mysqldump -u root -p\$MYSQL_ROOT_PASSWORD --all-databases | gzip | \
   aws s3 cp - s3://mysql-backups/dump-$(date +%Y%m%d).sql.gz \
   --endpoint-url http://rook-ceph-rgw.rook-ceph.svc.cluster.local"
```

## Summary

Ceph RBD provides the block storage that MySQL needs for reliable InnoDB operation. Setting `innodb_flush_method = O_DIRECT` avoids double-caching (OS page cache + InnoDB buffer pool), and the doublewrite buffer should remain enabled since RBD does not guarantee atomic writes at the InnoDB page level (16KB). Using `reclaimPolicy: Retain` ensures data survives StatefulSet deletion during maintenance operations.
