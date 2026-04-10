# How to Set Up Ceph RBD Storage for MongoDB on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MongoDB, RBD, Kubernetes, Database

Description: Learn how to provision Ceph RBD block storage for MongoDB replica sets on Kubernetes, including StorageClass configuration, WiredTiger tuning, and oplog sizing.

---

MongoDB running on Kubernetes needs reliable block storage for its WiredTiger storage engine and oplog. Rook-Ceph RBD delivers the consistent I/O performance that MongoDB requires for maintaining replica set health and serving production workloads.

## Creating a MongoDB Block Pool

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create mongodb-pool 64 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mongodb-pool size 3

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init mongodb-pool
```

## Creating the StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-mongodb
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: mongodb-pool
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

## Deploying MongoDB Replica Set

Use the MongoDB Community Kubernetes Operator:

```yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-rs
  namespace: databases
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.5"
  security:
    authentication:
      modes: ["SCRAM"]
  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: mongo-admin-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
  statefulSet:
    spec:
      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 100Gi
            storageClassName: rook-ceph-mongodb
        - metadata:
            name: logs-volume
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 10Gi
            storageClassName: rook-ceph-mongodb
```

## Tuning WiredTiger for RBD

Configure MongoDB WiredTiger cache and journal settings:

```yaml
spec:
  additionalMongodConfig:
    storage.wiredTiger.engineConfig.cacheSizeGB: 2
    storage.wiredTiger.engineConfig.journalCompressor: snappy
    storage.wiredTiger.collectionConfig.blockCompressor: snappy
    operationProfiling.slowOpThresholdMs: 100
```

## Oplog Configuration

Size the oplog appropriately for replication window requirements:

```bash
# Connect to the replica set primary
kubectl -n databases exec -it mongodb-rs-0 -- mongosh -u admin -p

# In mongosh - resize oplog to 10GB
use local
db.adminCommand({replSetResizeOplog: 1, size: 10240})

# Check current oplog status
rs.printReplicationInfo()
```

## Monitoring Replica Set Health

```bash
# Check replication lag
kubectl -n databases exec -it mongodb-rs-0 -- \
  mongosh --eval "rs.printSecondaryReplicationInfo()" \
  -u admin -p "$MONGO_PASSWORD" --authenticationDatabase admin
```

## Summary

Ceph RBD provides the consistent block I/O that MongoDB's WiredTiger engine and oplog require. The MongoDB Community Operator simplifies replica set deployment on Kubernetes and works directly with Rook StorageClasses via `volumeClaimTemplates`. Configuring appropriate WiredTiger cache sizes and oplog retention ensures stable replica set health when storing data on Ceph RBD volumes.
