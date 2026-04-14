# How to Configure NATS JetStream Retention Policies for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, NATS, JetStream, Retention, Pub/Sub

Description: Configure NATS JetStream stream retention policies for Dapr pub/sub, covering limits-based, interest-based, and work-queue retention with practical examples.

---

## Overview

NATS JetStream provides persistent messaging with configurable retention policies that determine when messages are discarded from streams. These retention policies are configured at the NATS JetStream stream level, not through Dapr component metadata. You create and configure streams with the desired retention using the NATS CLI or server configuration, then point your Dapr pub/sub component at the stream.

## Retention Policy Types

JetStream supports three retention modes:

- `limits` (default): Retain messages until size, age, or count limits are reached
- `interest`: Retain only while active consumers exist
- `workqueue`: Delete messages after acknowledgment (each message consumed once)

## Dapr Component Configuration

The Dapr `pubsub.jetstream` component configures consumer-level settings. Stream-level settings like retention policy, message limits, and max age must be configured on the NATS server directly (see sections below).

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: nats-pubsub
  namespace: default
spec:
  type: pubsub.jetstream
  version: v1
  metadata:
    - name: natsURL
      value: "nats://nats:4222"
    - name: name
      value: "dapr-jetstream"
    - name: streamName
      value: "ORDERS"
    - name: replicas
      value: "3"
    - name: deliverPolicy
      value: "last"
    - name: ackPolicy
      value: "explicit"
    - name: ackWait
      value: "30s"
    - name: maxDeliver
      value: "5"
```

## Limits-Based Retention

Create a stream with limits-based retention using the NATS CLI. Messages are discarded when size, age, or count limits are hit:

```bash
kubectl exec -it nats-0 -- nats stream add ORDERS \
  --subjects="orders.>" \
  --retention=limits \
  --max-msgs=500000 \
  --max-age=168h \
  --max-bytes=5368709120 \
  --max-msg-size=1048576 \
  --discard=old \
  --replicas=3 \
  --storage=file
```

## Work Queue Retention

Create a stream with work queue retention. Each message is consumed exactly once:

```bash
kubectl exec -it nats-0 -- nats stream add TASKS \
  --subjects="tasks.>" \
  --retention=work \
  --discard=old \
  --replicas=3 \
  --storage=file
```

Then configure the Dapr component with explicit acknowledgment:

```yaml
metadata:
  - name: streamName
    value: "TASKS"
  - name: ackPolicy
    value: "explicit"
  - name: maxDeliver
    value: "3"
  - name: ackWait
    value: "60s"
```

## Interest-Based Retention

Create a stream with interest-based retention. Messages are retained only while consumers are active:

```bash
kubectl exec -it nats-0 -- nats stream add EVENTS \
  --subjects="events.>" \
  --retention=interest \
  --max-age=1h \
  --replicas=3 \
  --storage=file
```

## Inspecting Streams via NATS CLI

Verify stream configuration and consumer state:

```bash
# View detailed stream info including retention policy
kubectl exec -it nats-0 -- nats stream info ORDERS

# List all streams
kubectl exec -it nats-0 -- nats stream ls

# Check consumer lag
kubectl exec -it nats-0 -- nats consumer info ORDERS dapr-consumer
```

## Publishing and Subscribing

```python
from dapr.clients import DaprClient
import json

# Publish
with DaprClient() as client:
    client.publish_event(
        pubsub_name="nats-pubsub",
        topic_name="orders",
        data=json.dumps({"orderId": "o1", "status": "new"}),
        data_content_type="application/json"
    )
```

```yaml
# Subscription
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-sub
spec:
  pubsubname: nats-pubsub
  topic: orders
  route: /orders
```

## Monitoring Stream Health

```bash
# View stream stats
kubectl exec -it nats-0 -- nats stream report

# Output: stream name, messages, bytes, consumers, retention
```

## Summary

NATS JetStream retention policies are configured at the stream level using the NATS CLI or server configuration, then referenced by the Dapr `pubsub.jetstream` component via `streamName`. The three retention modes are: `limits` retains messages until size or age thresholds are exceeded, `workqueue` deletes after acknowledgment for task queue patterns, and `interest` retains only while consumers are subscribed. For durable event streaming, use `limits` with `--max-age` set to your replay window. For task processing, use `workqueue` with explicit ack and a `maxDeliver` retry limit in the Dapr component to handle failures.
