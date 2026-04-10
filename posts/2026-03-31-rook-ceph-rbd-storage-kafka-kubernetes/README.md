# How to Set Up Ceph RBD Storage for Apache Kafka on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kafka, RBD, Kubernetes, Messaging

Description: Learn how to configure Ceph RBD block storage for Apache Kafka on Kubernetes using Strimzi, including broker log retention, replication factor settings, and performance tuning.

---

Apache Kafka is a high-throughput distributed streaming platform. Kafka brokers store message logs on local disk, and Rook-Ceph RBD provides the durable, per-broker block storage needed for reliable message retention on Kubernetes.

## Kafka Storage Architecture

Each Kafka broker writes to its own log directory. Partitions are distributed across brokers, so each broker needs independent ReadWriteOnce storage. Multiple Kafka replicas of the same partition sit on different brokers, providing redundancy at the application level.

## Creating the Block Pool and StorageClass

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create kafka-pool 64 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set kafka-pool size 3

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init kafka-pool
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-kafka
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: kafka-pool
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

## Deploying Kafka with Strimzi

Use the Strimzi operator for production Kafka:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: my-kafka
  namespace: messaging
spec:
  kafka:
    version: 3.6.1
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      # Log retention settings
      log.retention.hours: 168
      log.segment.bytes: 1073741824
      log.retention.check.interval.ms: 300000
    storage:
      type: persistent-claim
      size: 200Gi
      class: rook-ceph-kafka
      deleteClaim: false
    resources:
      requests:
        memory: 4Gi
        cpu: "1"
      limits:
        memory: 8Gi
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
      class: rook-ceph-kafka
      deleteClaim: false
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

## Kafka KRaft Mode (No ZooKeeper)

For Kafka 3.6+ with KRaft mode, Strimzi requires `KafkaNodePool` resources and annotations on the `Kafka` resource:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: combined
  labels:
    strimzi.io/cluster: my-kafka
spec:
  replicas: 3
  roles:
    - broker
    - controller
  storage:
    type: persistent-claim
    size: 200Gi
    class: rook-ceph-kafka
    deleteClaim: false
---
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: my-kafka
  namespace: messaging
  annotations:
    strimzi.io/node-pools: enabled
    strimzi.io/kraft: enabled
spec:
  kafka:
    version: 3.6.1
    metadataVersion: 3.6-IV2
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

## Tuning Kafka for RBD Storage

Kafka performance on block storage depends on flush settings:

```yaml
config:
  # Flush settings (RBD handles durability at block level)
  log.flush.interval.messages: "9223372036854775807"
  log.flush.interval.ms: "9223372036854775807"
  # Disable periodic flush check (let OS handle flushing)
  log.flush.scheduler.interval.ms: "9223372036854775807"
  # Thread pool sizes for request handling and network I/O
  num.io.threads: 8
  num.network.threads: 4
```

## Monitoring Kafka Storage Usage

```bash
kubectl -n messaging exec -it my-kafka-kafka-0 -- \
  bin/kafka-log-dirs.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic-list my-topic
```

## Summary

Rook-Ceph RBD provides per-broker persistent storage for Apache Kafka on Kubernetes. Strimzi operator deploys Kafka with `class` and `size` storage settings that Rook CSI provisions automatically. Disabling Kafka-level flush settings (letting the OS handle flushing) is safe with RBD's block-level durability, and improves throughput significantly for high-volume topics.
