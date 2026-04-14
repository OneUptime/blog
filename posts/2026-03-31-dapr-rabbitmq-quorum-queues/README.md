# How to Configure RabbitMQ Quorum Queues for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RabbitMQ, Quorum Queue, Pub/Sub, High Availability

Description: Configure Dapr RabbitMQ pub/sub to use quorum queues for improved durability and replication guarantees compared to classic mirrored queues.

---

## Why Quorum Queues

RabbitMQ quorum queues (introduced in RabbitMQ 3.8) use the Raft consensus algorithm to replicate messages across a configurable number of nodes. They provide stronger durability guarantees than classic mirrored queues, especially during network partitions. Dapr supports quorum queues via the `queueType` subscription metadata parameter, which can be set to `"quorum"` on individual subscriptions.

## Prerequisites

Deploy RabbitMQ with at least 3 nodes for quorum queue replication:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq
spec:
  replicas: 3
  rabbitmq:
    additionalConfig: |
      default_vhost = /
      cluster_partition_handling = pause_minority
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-pubsub
  namespace: default
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
    - name: connectionString
      value: "amqp://rabbitmq:5672"
    - name: durable
      value: "true"
    - name: deletedWhenUnused
      value: "false"
    - name: autoAck
      value: "false"
    - name: requeueInFailure
      value: "true"
    - name: deliveryMode
      value: "2"
    - name: prefetchCount
      value: "10"
    - name: reconnectWaitSeconds
      value: "2"
    - name: concurrencyMode
      value: "parallel"
    - name: publisherConfirm
      value: "true"
    - name: enableDeadLetter
      value: "true"
    - name: maxLen
      value: "0"
    - name: maxLenBytes
      value: "0"
    - name: exchangeKind
      value: "fanout"
```

## Creating Topics That Use Quorum Queues

When Dapr subscribes for the first time, it creates the queue. Ensure `durable: "true"` and `deletedWhenUnused: "false"` so quorum queues persist across restarts:

```python
from dapr.clients import DaprClient
import json

# Publish a message - Dapr will create the quorum queue on first subscribe
with DaprClient() as client:
    client.publish_event(
        pubsub_name="rabbitmq-pubsub",
        topic_name="critical-events",
        data=json.dumps({"eventId": "e1", "type": "payment"}),
        data_content_type="application/json"
    )
```

## Subscription with Dead Letter Handling

To enable quorum queues, set `queueType` to `quorum` in the subscription metadata. The initial replica count is determined by RabbitMQ's server-side configuration (defaulting to the cluster size), not by Dapr:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: critical-events-sub
spec:
  pubsubname: rabbitmq-pubsub
  topic: critical-events
  route: /events
  deadLetterTopic: critical-events-dlq
  metadata:
    queueType: quorum
```

## Verifying Quorum Queue Creation

```bash
# Check RabbitMQ management API
kubectl exec -it rabbitmq-0 -- rabbitmqctl list_queues \
  name type durable members leader

# Expected output:
# critical-events  quorum  true  [rabbitmq-0@rabbitmq, rabbitmq-1@rabbitmq, rabbitmq-2@rabbitmq]  rabbitmq-0@rabbitmq
```

## Checking Replication Health

```bash
kubectl exec -it rabbitmq-0 -- rabbitmq-queues quorum_status critical-events

# Output shows Raft consensus state and leader:
# Status: {ok, [{leader, rabbitmq-0}, {followers, [rabbitmq-1, rabbitmq-2]}]}
```

## Tuning Prefetch for Throughput

```yaml
- name: prefetchCount
  value: "20"
```

Higher prefetch values increase throughput but can lead to uneven load distribution. Set it to 2-5x your expected processing time in messages per second per consumer.

## Summary

Configuring Dapr RabbitMQ pub/sub with quorum queues requires setting `durable: "true"` and `deletedWhenUnused: "false"` on the component, and `queueType: "quorum"` in the subscription metadata. The initial replica count is determined by RabbitMQ's server-side configuration, defaulting to the cluster size (typically 3 or 5). Quorum queues provide stronger consistency than classic mirrors by using Raft replication, preventing message loss during node failures. Enable `publisherConfirm: "true"` so Dapr awaits broker acknowledgment before confirming a publish, ensuring end-to-end durability.
