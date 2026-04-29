# How to Configure Message Queue Persistence in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Message Persistence, RabbitMQ, Kafka, Kubernetes, Storage

Description: Configure durable message persistence for RabbitMQ and Kafka in Rancher using persistent volumes, durable queues, and replication policies.

## Introduction

Message persistence helps messages survive broker restarts and pod rescheduling when the broker uses persistent storage. Without persistence, a broker restart can cause message loss. This guide covers persistence configuration for both RabbitMQ and Kafka on Rancher.

## RabbitMQ Persistence

RabbitMQ persistence operates at two levels: broker-level storage via PVCs, and queue-level durability via durable queues and persistent messages.

### Broker Storage Configuration

```yaml
# rabbitmq-values.yaml (Bitnami chart persistence section)

persistence:
  enabled: true                # Enable PVC creation
  storageClass: "longhorn"
  accessModes:
    - ReadWriteOnce
  size: 50Gi
  mountPath: /opt/bitnami/rabbitmq/.rabbitmq/mnesia
```

### Declare Durable Queues

Queues must be declared as durable, messages must be marked persistent, and publishers should use confirms for stronger durability guarantees:

```python
# Python example using pika library
import pika

connection = pika.BlockingConnection(
    pika.ConnectionParameters('rabbitmq.messaging.svc.cluster.local')
)
channel = connection.channel()

# Declare a durable queue
channel.queue_declare(
    queue='orders',
    durable=True    # Queue survives broker restart
)

# Enable publisher confirms
channel.confirm_delivery()

# Publish a persistent message
channel.basic_publish(
    exchange='',
    routing_key='orders',
    body='Order #12345',
    properties=pika.BasicProperties(
        delivery_mode=pika.spec.PERSISTENT_DELIVERY_MODE   # Message survives restart
    )
)
```

### RabbitMQ Quorum Queues (Recommended for Production)

Quorum queues replace classic mirrored queues and provide stronger consistency guarantees:

```python
# Declare a quorum queue
channel.queue_declare(
    queue='orders-quorum',
    durable=True,
    arguments={'x-queue-type': 'quorum'}   # Use Raft-based replication
)
```

## Kafka Persistence

Kafka persists messages to disk automatically. Key settings control retention.

### Broker Storage Configuration

```yaml
# kafka-values.yaml (Bitnami chart persistence sections)
controller:
  persistence:
    enabled: true
    storageClass: "longhorn"
    accessModes:
      - ReadWriteOnce
    size: 100Gi   # Kafka is very storage-intensive

broker:
  persistence:
    enabled: true
    storageClass: "longhorn"
    accessModes:
      - ReadWriteOnce
    size: 100Gi

# Kafka log configuration
overrideConfiguration:
  log.retention.hours: 168
  log.retention.bytes: 10737418240  # Keep up to 10GB per partition
  log.segment.bytes: 1073741824   # Roll segment files at 1GB
  log.cleanup.policy: delete      # Delete old segments (vs compact)
```

### Topic-Level Retention Override

```bash
# Set different retention for a specific topic
kafka-configs.sh \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name audit-log \
  --alter \
  --add-config "retention.ms=2592000000"  # 30 days for audit logs
```

### Replication Factor

For production topics on clusters with at least three brokers, set replication factor to 3 and use producers with `acks=all`:

```bash
kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create \
  --topic payments \
  --partitions 6 \
  --replication-factor 3 \
  --config min.insync.replicas=2
```

## Conclusion

Message persistence in Rancher requires correctly configuring both the storage layer (persistent volumes/claims and appropriate retention settings) and the broker-level settings (durable queues, persistent messages, publisher confirms, and replication). The combination greatly reduces message-loss risk during pod restarts or node failures, but end-to-end durability also depends on client settings such as RabbitMQ publisher confirms and Kafka producer `acks=all`.
