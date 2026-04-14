# How to Optimize Dapr Pub/Sub Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Performance, Throughput, Kafka, Redis, Microservice

Description: Learn how to optimize Dapr Pub/Sub throughput using concurrency settings, batching, partitioning, and broker-specific configuration tuning.

---

Dapr Pub/Sub provides a portable messaging abstraction, but unlocking high throughput requires understanding both Dapr's configuration knobs and the underlying broker's performance characteristics. This guide covers practical techniques for maximizing message throughput in Dapr Pub/Sub applications, from concurrency tuning to broker-level optimizations.

## Understanding Dapr Pub/Sub Throughput Bottlenecks

Throughput is limited by several layers:
- The Dapr sidecar's concurrency settings for calling your app
- The broker's partition count and consumer group configuration
- Your application's message processing time per message
- Network latency between the sidecar and your app

Measure before tuning. Use Dapr's Prometheus metrics to identify the actual bottleneck:

```bash
# Scrape Dapr sidecar metrics
curl http://localhost:9090/metrics | grep dapr_pubsub
```

Key metrics to watch:

```text
dapr_component_pubsub_ingress_count      - messages received by sidecar
dapr_component_pubsub_ingress_latencies  - time from receive to app ack
dapr_component_pubsub_egress_count       - messages published
```

## Tuning Dapr Pub/Sub Concurrency

The `app-max-concurrency` setting controls how many messages the sidecar delivers to your app concurrently.

```yaml
# dapr/subscriptions.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: order-pubsub
  topic: orders
  routes:
    default: /orders/handle
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 1000
```

Configure the Dapr sidecar concurrency via annotations in Kubernetes:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-consumer"
  dapr.io/app-port: "5000"
  dapr.io/app-max-concurrency: "20"
```

Or via the CLI for self-hosted:

```bash
dapr run \
  --app-id order-consumer \
  --app-port 5000 \
  --app-max-concurrency 20 \
  -- python consumer.py
```

## Implementing Bulk Subscribe for Batch Processing

Dapr's bulk subscribe API delivers multiple messages in a single HTTP call, dramatically reducing per-message overhead.

```python
from flask import Flask, request, jsonify
import concurrent.futures
import logging

app = Flask(__name__)
logger = logging.getLogger(__name__)

# Thread pool for parallel message processing
executor = concurrent.futures.ThreadPoolExecutor(max_workers=20)


@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "order-pubsub",
            "topic": "orders",
            "route": "/orders/handle-bulk",
            "bulkSubscribe": {
                "enabled": True,
                "maxMessagesCount": 100,
                "maxAwaitDurationMs": 500
            }
        }
    ])


@app.route('/orders/handle-bulk', methods=['POST'])
def handle_bulk_orders():
    """Handle a bulk batch of messages from Dapr."""
    body = request.json
    entries = body.get("entries", [])

    if not entries:
        return jsonify({"statuses": []}), 200

    logger.info("Received bulk batch of %d messages", len(entries))

    # Process all messages in parallel
    futures = {
        executor.submit(process_order, entry): entry.get("entryId")
        for entry in entries
    }

    statuses = []
    for future, entry_id in futures.items():
        try:
            future.result(timeout=5)
            statuses.append({"entryId": entry_id, "status": "SUCCESS"})
        except Exception as e:
            logger.error("Failed to process entry %s: %s", entry_id, e)
            statuses.append({"entryId": entry_id, "status": "RETRY"})

    return jsonify({"statuses": statuses}), 200


def process_order(entry: dict) -> None:
    """Process a single order from the bulk batch."""
    event_data = entry.get("event", {})
    order_id = event_data.get("data", {}).get("orderId", "unknown")
    logger.debug("Processing order %s", order_id)
    # Add actual processing logic here


if __name__ == "__main__":
    app.run(port=5000, threaded=True)
```

## Optimizing Kafka Broker Configuration

When using Kafka as the Dapr Pub/Sub backend, tune the broker settings for throughput.

```yaml
# dapr/components/kafka-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: consumerGroup
    value: "order-consumer-group"
  # Increase fetch size for batching
  - name: consumerFetchMin
    value: "65536"
  - name: consumerFetchDefault
    value: "1048576"
  # Compression reduces network I/O
  - name: compression
    value: "snappy"
  - name: channelBufferSize
    value: "256"
```

Tune Kafka topic partitions to match your consumer replica count:

```bash
# Create a topic with partitions matching expected consumers
kafka-topics.sh --bootstrap-server kafka:9092 \
  --create \
  --topic orders \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=86400000 \
  --config segment.bytes=104857600
```

## Optimizing Redis Streams Pub/Sub

When using Redis Streams as the backend, tune the consumer group and delivery settings.

```yaml
# dapr/components/redis-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-cluster:6379"
  # How long to block waiting for messages (ms)
  - name: processingTimeout
    value: "5000ms"
  # Retry on delivery failure
  - name: redeliverInterval
    value: "60000ms"
  # Approximate max stream length before trimming old entries
  - name: maxLenApprox
    value: "100000"
  - name: enableTLS
    value: "false"
```

Monitor Redis Streams consumer group lag:

```bash
# Check pending messages per consumer group
redis-cli XPENDING orders order-consumer-group - + 100

# Show consumer group info
redis-cli XINFO GROUPS orders
```

## Scaling Consumers Horizontally

Horizontal scaling combined with the right partition count multiplies throughput linearly.

```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-consumer-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-consumer
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: dapr_pubsub_incoming_messages_total
      target:
        type: AverageValue
        averageValue: "500"
```

Use KEDA for event-driven autoscaling based on queue depth:

```yaml
# kubernetes/keda-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-consumer-scaler
spec:
  scaleTargetRef:
    name: order-consumer
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
  - type: redis-streams
    metadata:
      address: redis:6379
      stream: orders
      consumerGroup: order-consumer-group
      pendingEntriesCount: "100"
```

## Summary

Optimizing Dapr Pub/Sub throughput is a multi-layered effort. You learned how to tune the `app-max-concurrency` setting on the Dapr sidecar, enable bulk subscribe to process messages in batches with a single HTTP call, configure Kafka-specific settings like linger time, batch size, and compression, tune Redis Streams read counts and redelivery intervals, and scale consumers horizontally with Kubernetes HPA or KEDA. Always measure baseline throughput and queue lag before and after each change, and ensure your partition count is at least as large as your maximum consumer replica count to prevent idle consumers.
