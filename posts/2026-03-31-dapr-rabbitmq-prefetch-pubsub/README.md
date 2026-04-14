# How to Tune RabbitMQ Prefetch for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RabbitMQ, Prefetch, Pub/Sub, Performance, Tuning, Microservice

Description: Tune RabbitMQ prefetch count in Dapr pub/sub to optimize message throughput, prevent consumer overload, and ensure fair message distribution.

---

## Overview

RabbitMQ's prefetch count (`basic.qos`) controls how many unacknowledged messages a consumer can hold at once. Setting it too high causes memory pressure when processing is slow; setting it too low leaves consumers idle waiting for more messages. Dapr exposes prefetch tuning through component metadata, making it straightforward to optimize without modifying application code.

## How Prefetch Affects Dapr Consumers

Dapr's RabbitMQ component creates a consumer for each subscribed topic. The prefetch count determines how many messages Dapr buffers in the sidecar before they are delivered to your application. With prefetch=1, RabbitMQ waits for an ack before sending the next message, which is the safest but slowest setting.

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
    - name: host
      value: "amqp://rabbitmq.default.svc.cluster.local:5672"
    - name: username
      secretKeyRef:
        name: rabbitmq-credentials
        key: username
    - name: password
      secretKeyRef:
        name: rabbitmq-credentials
        key: password
    - name: prefetchCount
      value: "10"
    - name: durable
      value: "true"
    - name: deletedWhenUnused
      value: "false"
    - name: autoAck
      value: "false"
    - name: requeueInFailure
      value: "false"
    - name: reconnectWait
      value: "2s"
```

## Prefetch Count Guidelines

| Scenario | Recommended Prefetch |
|---|---|
| Slow processing (DB writes, external calls) | 1-5 |
| Fast processing (in-memory transforms) | 20-100 |
| Mixed workload | 10-20 |
| Batch processing | 50-200 |

## Measuring the Impact

Run a load test and observe RabbitMQ management metrics:

```bash
# Install RabbitMQ management plugin
rabbitmq-plugins enable rabbitmq_management

# Use rabbitmqadmin to check consumer utilization
rabbitmqadmin list queues name messages consumers message_stats.ack_details.rate

# Or via HTTP API
curl -u guest:guest http://localhost:15672/api/queues/%2F/orders
```

Look at `consumer_utilization` - values below 0.5 suggest the prefetch is too low.

## Example: Comparing Prefetch Values

```bash
# Start publisher sending 1000 messages
for i in $(seq 1 1000); do
  curl -s -X POST http://localhost:3500/v1.0/publish/rabbitmq-pubsub/orders \
    -H "Content-Type: application/json" \
    -d "{\"orderId\": \"$i\"}" &
done
wait

# Check processing time with prefetch=1 vs prefetch=20
```

## Multiple Consumers with Fair Dispatch

With multiple service replicas and prefetch=1, RabbitMQ distributes messages evenly:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-processor"
```

Scale replicas:

```bash
kubectl scale deployment order-processor --replicas=3
```

Each replica gets its own Dapr consumer with the configured prefetch count.

## Handling Nacks and Requeues

When your application returns a non-2xx status, Dapr rejects the message. Configure `requeueInFailure` carefully:

```yaml
metadata:
  - name: requeueInFailure
    value: "true"
  - name: enableDeadLetter
    value: "true"
```

With `requeueInFailure: true`, failed messages go back to the queue and can cause infinite loops. Use a dead-letter exchange instead.

## Summary

Tuning RabbitMQ prefetch in Dapr is a single metadata field change that can dramatically improve throughput. Start with a low prefetch count during development, measure consumer utilization with RabbitMQ's management API, and increase prefetch until you reach target throughput without memory pressure. Use dead-letter exchanges rather than requeue-on-failure to handle poison messages gracefully.
