# How to Configure Message Queue Persistence in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Message Queue, Persistence, Storage, Durability

Description: Configure persistent message storage for RabbitMQ, Kafka, and NATS on Rancher to ensure messages survive pod restarts and node failures.

## Introduction

Message persistence ensures that messages are not lost when broker pods restart, nodes fail, or maintenance is performed. Each message queue system handles persistence differently. This guide covers configuring durable storage for RabbitMQ, Kafka, and NATS on Rancher-managed clusters.

## Prerequisites

- Rancher-managed cluster
- A StorageClass with persistent volumes
- kubectl access

## Section 1: RabbitMQ Persistence

### Configure Durable Queues and Messages

```yaml
# rabbitmq-persistence-values.yaml - Persistent RabbitMQ configuration

apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq-persistent
  namespace: messaging
spec:
  replicas: 3
  persistence:
    # Critical: enable persistent storage
    storageClassName: standard
    storage: 20Gi
  rabbitmq:
    additionalConfig: |
      # Use quorum queues when clients do not specify a queue type
      default_queue_type = quorum

      # Optional: tune quorum queue WAL segment size
      raft.wal_max_size_bytes = 32000000
```

### Publish Persistent Messages

```python
# publisher.py - Example of publishing persistent messages
import pika
import json
import os

connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        host='rabbitmq-persistent.messaging.svc.cluster.local',
        credentials=pika.PlainCredentials(
            os.environ['RABBITMQ_USER'],
            os.environ['RABBITMQ_PASSWORD']
        )
    )
)
channel = connection.channel()

# Declare a durable queue
channel.queue_declare(
    queue='orders',
    durable=True,  # Queue survives broker restart
    arguments={
        'x-queue-type': 'quorum'  # Quorum queues are always durable
    }
)

# Publish with persistent delivery mode
channel.basic_publish(
    exchange='',
    routing_key='orders',
    body=json.dumps({'order_id': '123', 'item': 'widget'}),
    properties=pika.BasicProperties(
        delivery_mode=pika.DeliveryMode.Persistent,  # Explicitly mark the message as persistent
        content_type='application/json'
    )
)
```

## Section 2: Kafka Persistence

### Configure Kafka Log Retention

```yaml
# kafka-persistence.yaml - Kafka with persistent storage configuration
apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: dual-role
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-persistent
spec:
  replicas: 3
  roles:
    - controller
    - broker
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 100Gi
        class: standard
        # Important: keep data when pod is deleted
        deleteClaim: false
        kraftMetadata: shared
---
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: kafka-persistent
  namespace: kafka
spec:
  kafka:
    version: 4.2.0
    metadataVersion: 4.2-IV1
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
      # Retain logs for 7 days
      log.retention.hours: 168
      # Retain up to 10GB per partition
      log.retention.bytes: 10737418240
      # Log segment size: 1GB
      log.segment.bytes: 1073741824
      # Default broker cleanup policy
      log.cleanup.policy: delete
      # Let the OS flush pages in the background; rely on replication for durability
      log.flush.interval.messages: 9223372036854775807
      log.flush.interval.ms: 9223372036854775807
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

### Configure Log Compaction for Event Store

```yaml
# compacted-topic.yaml - Log-compacted Kafka topic (event sourcing)
apiVersion: kafka.strimzi.io/v1
kind: KafkaTopic
metadata:
  name: user-events
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-persistent
spec:
  partitions: 6
  replicas: 3
  config:
    # Compact - keep only latest value per key
    cleanup.policy: compact
    # Keep records uncompacted for at least 24 hours
    min.compaction.lag.ms: "86400000"
    # Keep tombstone markers for 7 days
    delete.retention.ms: "604800000"
    # Start compaction when at least 70% of the log is dirty
    min.cleanable.dirty.ratio: "0.7"
```

## Section 3: NATS JetStream Persistence

```yaml
# nats-persistence-values.yaml - NATS with JetStream persistence
config:
  cluster:
    enabled: true
    replicas: 3
  jetstream:
    enabled: true
    fileStore:
      enabled: true
      pvc:
        enabled: true
        size: 50Gi
        storageClassName: standard
```

### Create Persistent JetStream Stream

```bash
# Create a file-backed stream with 3 replicas and 7-day retention
kubectl exec -n messaging deployment/nats-box -- \
  nats stream add ORDERS \
  --server nats://nats.messaging.svc.cluster.local:4222 \
  --subjects "orders.*" \
  --storage file \
  --replicas 3 \
  --retention limits \
  --max-age 168h \
  --max-msgs 50000000 \
  --discard old

# View stream info
kubectl exec -n messaging deployment/nats-box -- \
  nats stream info ORDERS \
  --server nats://nats.messaging.svc.cluster.local:4222
```

## Section 4: Configure Longhorn Backup for Message Queue Data

```yaml
# longhorn-mq-backup.yaml - Automated backup of message queue PVCs
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: mq-hourly-snapshot
  namespace: longhorn-system
spec:
  cron: "0 * * * *"  # Every hour
  task: snapshot
  groups:
    - message-queues
  retain: 48   # Keep 48 hourly snapshots (2 days)
  concurrency: 1
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: mq-daily-backup
  namespace: longhorn-system
spec:
  cron: "0 3 * * *"  # Daily at 3 AM
  task: backup
  groups:
    - message-queues
  retain: 30   # Keep 30 days of backups
  concurrency: 1
```

Label message queue PVCs for backup:

```bash
# Label message queue PVCs for backup
for PVC in $(kubectl get pvc -n messaging -o name); do
  kubectl label $PVC \
    -n messaging \
    "recurring-job.longhorn.io/source=enabled" \
    "recurring-job-group.longhorn.io/message-queues=enabled" \
    --overwrite
done
```

## Section 5: Disaster Recovery Test

```bash
#!/bin/bash
# dr-test.sh - Test message persistence after restart

set -euo pipefail

NAMESPACE="messaging"
CLUSTER_NAME="rabbitmq-persistent"
RABBITMQ_POD="${CLUSTER_NAME}-server-0"

RABBITMQ_USER=$(kubectl -n $NAMESPACE get secret ${CLUSTER_NAME}-default-user \
  -o jsonpath='{.data.username}' | base64 --decode)
RABBITMQ_PASS=$(kubectl -n $NAMESPACE get secret ${CLUSTER_NAME}-default-user \
  -o jsonpath='{.data.password}' | base64 --decode)

echo "=== Declaring a durable quorum queue ==="
kubectl exec -n $NAMESPACE $RABBITMQ_POD -- \
  rabbitmqadmin --username="$RABBITMQ_USER" --password="$RABBITMQ_PASS" \
  declare queue name=test-persistence durable=true queue_type=quorum

echo "=== Publishing 1000 persistent test messages ==="
for i in $(seq 1 1000); do
  kubectl exec -n $NAMESPACE $RABBITMQ_POD -- \
    rabbitmqadmin --username="$RABBITMQ_USER" --password="$RABBITMQ_PASS" \
    publish exchange=amq.default routing_key=test-persistence \
    payload="test message ${i}" \
    properties='{"delivery_mode":2}'
done

echo "=== Count messages before restart ==="
kubectl exec -n $NAMESPACE $RABBITMQ_POD -- \
  rabbitmqctl list_queues name messages | grep test-persistence

echo "=== Restarting RabbitMQ pod ==="
kubectl delete pod $RABBITMQ_POD -n $NAMESPACE

echo "=== Waiting for pod to restart ==="
until kubectl get pod/$RABBITMQ_POD -n $NAMESPACE >/dev/null 2>&1; do
  sleep 2
done
kubectl wait pod/$RABBITMQ_POD -n $NAMESPACE \
  --for=condition=Ready \
  --timeout=120s

echo "=== Count messages after restart ==="
kubectl exec -n $NAMESPACE $RABBITMQ_POD -- \
  rabbitmqctl list_queues name messages | grep test-persistence
# Messages should be preserved
```

## Conclusion

Proper persistence configuration is essential for preventing message loss in production environments. For RabbitMQ, use quorum queues which are always durable and provide better safety guarantees than classic mirrored queues. For Kafka, configure appropriate retention periods and replication factors, ensuring `deleteClaim: false` on PVCs so data survives pod deletions. Combine application-level persistence with Longhorn volume backups for complete data protection. Always test your persistence configuration by simulating broker restarts before deploying to production.
