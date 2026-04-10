# How to Set Up Ceph RBD Storage for NATS on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NATS, JetStream, RBD, Kubernetes, Messaging

Description: Learn how to configure Ceph RBD block storage for NATS JetStream on Kubernetes, enabling persistent messaging with durable stream and consumer state.

---

NATS JetStream is the persistent messaging layer of the NATS messaging system. JetStream stores stream data, consumer state, and metadata on disk. Running NATS JetStream on Kubernetes with Rook-Ceph RBD ensures message durability across pod restarts.

## NATS JetStream Storage Requirements

JetStream stores data in its file store on the following paths:
- **Stream data** - Message payloads and headers
- **Consumer state** - Consumer sequence positions
- **Metadata** - Stream and consumer configuration

JetStream is designed for local storage, making RBD's ReadWriteOnce semantics a natural fit.

## Creating the Block Pool and StorageClass

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create nats-pool 32 32

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set nats-pool size 3

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init nats-pool
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-nats
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: nats-pool
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

## Deploying NATS with JetStream Using Helm

```bash
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update
```

```yaml
# nats-values.yaml
config:
  jetstream:
    enabled: true
    fileStore:
      pvc:
        enabled: true
        size: 50Gi
        storageClassName: rook-ceph-nats
  cluster:
    enabled: true
    replicas: 3

natsBox:
  enabled: true
```

```bash
helm install nats nats/nats \
  -f nats-values.yaml \
  --namespace messaging \
  --create-namespace
```

## NATS JetStream Configuration

Configure JetStream with storage limits:

```yaml
config:
  jetstream:
    enabled: true
    merge:
      domain: hub
    memoryStore:
      enabled: true
      maxSize: 1Gi
    fileStore:
      dir: /data
      maxSize: 40Gi
      pvc:
        enabled: true
        size: 50Gi
        storageClassName: rook-ceph-nats
```

## Creating Persistent Streams

```bash
# Connect to the NATS box
kubectl -n messaging exec -it deploy/nats-box -- sh

# Create a durable stream
nats stream add ORDERS \
  --subjects "orders.>" \
  --retention limits \
  --max-msgs-per-subject -1 \
  --max-bytes 10GB \
  --storage file \
  --replicas 3 \
  --dupe-window 2m

# Check stream info
nats stream info ORDERS
```

## Creating Durable Consumers

```bash
# Create a push consumer
nats consumer add ORDERS order-processor \
  --filter "orders.new" \
  --ack explicit \
  --deliver all \
  --replay instant \
  --max-deliver 5 \
  --deliver-group workers

# Monitor consumer state
nats consumer info ORDERS order-processor
```

## Monitoring JetStream Storage

```bash
kubectl -n messaging exec -it deploy/nats-box -- \
  nats server report jetstream

kubectl -n messaging exec -it deploy/nats-box -- \
  nats account info
```

Check PVC usage:

```bash
kubectl -n messaging get pvc | grep nats
```

## Summary

NATS JetStream's file-based persistence works seamlessly with Ceph RBD on Kubernetes. The NATS Helm chart accepts `storageClassName` for JetStream file store PVCs, automatically provisioning Rook RBD volumes per node. Stream replication (set via `--replicas 3`) provides JetStream-level redundancy on top of Ceph's block-level replication, ensuring message durability even if a NATS server pod fails.
