# How to Set Up Ceph RBD Storage for Apache Pulsar on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pulsar, RBD, Kubernetes, Messaging

Description: Learn how to configure Ceph RBD block storage for Apache Pulsar on Kubernetes, including BookKeeper ledger storage, ZooKeeper metadata, and tiered storage to Ceph RGW.

---

Apache Pulsar is a cloud-native distributed messaging and streaming platform. Its architecture separates compute (Pulsar brokers) from storage (Apache BookKeeper). Rook-Ceph RBD provides the per-node block storage that BookKeeper requires, and Ceph RGW provides an S3-compatible tiered storage backend.

## Pulsar Storage Architecture

Pulsar uses multiple storage components:
- **ZooKeeper** - Cluster metadata (small, high-I/O)
- **BookKeeper** - Message ledger storage (large, sequential write)
- **Pulsar brokers** - Stateless, no persistent storage needed
- **Pulsar Proxy** - Stateless routing

## Creating Component-Specific Pools

```bash
# BookKeeper ledger pool (large, sequential I/O)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create pulsar-bk-pool 128 128

# ZooKeeper pool (small, latency-sensitive)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create pulsar-zk-pool 32 32

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init pulsar-bk-pool

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init pulsar-zk-pool
```

## Creating StorageClasses

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-pulsar-bookkeeper
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: pulsar-bk-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-pulsar-zookeeper
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: pulsar-zk-pool
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

## Deploying Pulsar with the StreamNative Operator

The StreamNative Pulsar Operator uses separate CRDs for each component:

```yaml
apiVersion: zookeeper.streamnative.io/v1alpha1
kind: ZooKeeperCluster
metadata:
  name: pulsar-zk
  namespace: messaging
spec:
  replicas: 3
  persistence:
    reclaimPolicy: Retain
    data:
      accessModes: [ReadWriteOnce]
      storageClassName: rook-ceph-pulsar-zookeeper
      resources:
        requests:
          storage: 20Gi
---
apiVersion: bookkeeper.streamnative.io/v1alpha1
kind: BookKeeperCluster
metadata:
  name: pulsar-bk
  namespace: messaging
spec:
  replicas: 3
  storage:
    reclaimPolicy: Retain
    journal:
      numDirsPerVolume: 1
      numVolumes: 1
      volumeClaimTemplate:
        accessModes: [ReadWriteOnce]
        storageClassName: rook-ceph-pulsar-bookkeeper
        resources:
          requests:
            storage: 50Gi
    ledger:
      numDirsPerVolume: 1
      numVolumes: 1
      volumeClaimTemplate:
        accessModes: [ReadWriteOnce]
        storageClassName: rook-ceph-pulsar-bookkeeper
        resources:
          requests:
            storage: 200Gi
---
apiVersion: pulsar.streamnative.io/v1alpha1
kind: PulsarBroker
metadata:
  name: pulsar-broker
  namespace: messaging
spec:
  replicas: 3
  config:
    managedLedgerDefaultEnsembleSize: "3"
    managedLedgerDefaultWriteQuorum: "3"
    managedLedgerDefaultAckQuorum: "2"
```

## Setting Up Tiered Storage with Ceph RGW

Configure Pulsar to offload old ledgers to Ceph S3. S3 credentials must be provided via environment variables (`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`) on the broker pods, not through broker config properties:

```yaml
broker:
  config:
    managedLedgerOffloadDriver: aws-s3
    s3ManagedLedgerOffloadBucket: pulsar-offload
    s3ManagedLedgerOffloadRegion: us-east-1
    s3ManagedLedgerOffloadServiceEndpoint: http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local
    managedLedgerOffloadAutoTriggerSizeThresholdBytes: 10737418240
    managedLedgerOffloadDeletionLagMs: 14400000
```

## Creating Topics with Tiered Storage

```bash
# Create a namespace with offload threshold
kubectl -n messaging exec -it pulsar-broker-0 -- \
  bin/pulsar-admin namespaces set-offload-threshold \
    --size 10G \
    public/default

# Check offload status
kubectl -n messaging exec -it pulsar-broker-0 -- \
  bin/pulsar-admin topics offload-status persistent://public/default/my-topic
```

## Summary

Apache Pulsar on Kubernetes uses Rook-Ceph RBD for both BookKeeper ledger storage and ZooKeeper metadata. Separate pools for each component allow independent sizing and performance tuning. Ceph RGW's S3 compatibility makes it an ideal tiered storage backend for Pulsar's ledger offloading feature, automatically moving cold ledger data from BookKeeper to object storage to reduce RBD storage costs.
