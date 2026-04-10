# How to Set Up Ceph RBD Storage for RabbitMQ on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RabbitMQ, RBD, Kubernetes, Messaging

Description: Learn how to configure Ceph RBD block storage for RabbitMQ on Kubernetes using the RabbitMQ Cluster Operator, including queue persistence and durable exchange setup.

---

RabbitMQ is a message broker that supports durable queues and messages that survive broker restarts. Running RabbitMQ on Kubernetes with Rook-Ceph RBD ensures that persisted messages, queue definitions, and cluster state survive pod restarts and rescheduling.

## RabbitMQ Persistence Requirements

RabbitMQ stores persistent data in its mnesia database directory, including:
- Queue metadata and bindings
- Durable message contents (for persistent-delivery-mode messages)
- Cluster membership information

Each RabbitMQ node manages its own mnesia directory independently.

## Creating the Block Pool and StorageClass

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create rabbitmq-pool 32 32

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init rabbitmq-pool
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-rabbitmq
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: rabbitmq-pool
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

## Deploying RabbitMQ with the Cluster Operator

Use the official RabbitMQ Cluster Operator:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq
  namespace: messaging
spec:
  replicas: 3
  image: rabbitmq:3.13-management
  persistence:
    storageClassName: rook-ceph-rabbitmq
    storage: 20Gi
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: "2"
      memory: 2Gi
  rabbitmq:
    additionalConfig: |
      cluster_formation.peer_discovery_backend = rabbit_peer_discovery_k8s
      cluster_formation.k8s.host = kubernetes.default
      cluster_formation.k8s.address_type = hostname
      vm_memory_high_watermark.relative = 0.7
      disk_free_limit.absolute = 2GB
```

## Configuring Durable Queues and Exchanges

Declare durable queues and exchanges for message persistence:

```python
import pika

connection = pika.BlockingConnection(
    pika.ConnectionParameters(host="rabbitmq.messaging.svc.cluster.local")
)
channel = connection.channel()

# Declare a durable exchange
channel.exchange_declare(
    exchange="orders",
    exchange_type="direct",
    durable=True,
)

# Declare a durable queue
channel.queue_declare(
    queue="order-processing",
    durable=True,
    arguments={"x-queue-type": "quorum"},
)

# Bind the queue to the exchange
channel.queue_bind(
    queue="order-processing",
    exchange="orders",
    routing_key="order-processing",
)

# Publish a persistent message
channel.basic_publish(
    exchange="orders",
    routing_key="order-processing",
    body="Order payload",
    properties=pika.BasicProperties(
        delivery_mode=pika.spec.PERSISTENT_DELIVERY_MODE,
    ),
)
connection.close()
```

## Monitoring Queue Depth

```bash
# List queues and their message counts
kubectl -n messaging exec -it rabbitmq-server-0 -- \
  rabbitmqctl list_queues name messages messages_ready messages_unacknowledged

# Check cluster status
kubectl -n messaging exec -it rabbitmq-server-0 -- \
  rabbitmqctl cluster_status
```

## Expanding Storage

When message storage grows:

```bash
kubectl -n messaging patch pvc persistence-rabbitmq-server-0 \
  -p '{"spec": {"resources": {"requests": {"storage": "50Gi"}}}}'
```

## Summary

Ceph RBD provides the per-node persistent storage that RabbitMQ needs for durable queues and cluster state. The RabbitMQ Cluster Operator accepts `storageClassName` and `storage` fields to provision Rook-backed PVCs automatically. Using quorum queues (instead of classic mirrored queues) provides superior durability guarantees that complement Ceph's block-level replication.
