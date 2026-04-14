# How to Configure Redis Streams Consumer Groups in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, Stream, Consumer Group, Pub/Sub, Microservice

Description: Configure Redis Streams consumer groups in Dapr pub/sub for reliable, scalable message consumption with at-least-once delivery guarantees.

---

## Overview

Redis Streams introduced consumer groups in Redis 5.0, enabling multiple consumers to process messages from the same stream in a coordinated way. Dapr's Redis pub/sub component uses Redis Streams under the hood and supports consumer groups for distributed message processing. This guide covers configuring consumer groups and understanding how Dapr manages stream acknowledgments.

## How Dapr Uses Redis Streams

Dapr maps each pub/sub topic to a Redis Stream key. When a subscriber starts, Dapr creates a consumer group on the stream using the `app-id` as the group name. Multiple replicas of the same service share the consumer group, and Redis assigns stream entries to individual consumers within the group.

## Prerequisites

- Redis 6.2 or later (earlier versions support Streams but lack some features)
- Dapr CLI installed

## Running Redis with Streams Support

```bash
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis.default.svc.cluster.local:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
    - name: consumerID
      value: "${HOSTNAME}"
    - name: enableTLS
      value: "false"
    - name: processingTimeout
      value: "60s"
    - name: redeliverInterval
      value: "60s"
    - name: maxLenApprox
      value: "1000"
    - name: redisMaxRetries
      value: "3"
```

The `consumerID` field sets the individual consumer name within the group. Using `${HOSTNAME}` ensures each pod has a unique consumer ID.

## Publishing Messages

```bash
curl -X POST http://localhost:3500/v1.0/publish/redis-pubsub/events \
  -H "Content-Type: application/json" \
  -d '{"eventId": "EVT-1001", "type": "user.signup"}'
```

Verify the stream entry in Redis:

```bash
redis-cli XLEN events
redis-cli XRANGE events - +
```

## Subscribing Application

```python
from flask import Flask, request
app = Flask(__name__)

@app.route('/events', methods=['POST'])
def handle_event():
    event = request.json
    data = event.get('data', {})
    print(f"Event {data['eventId']}: {data['type']}")
    return '', 200
```

## Inspecting Consumer Groups

```bash
# List consumer groups on the stream
redis-cli XINFO GROUPS events

# Check pending messages for a group
redis-cli XPENDING events order-service - + 10

# Check individual consumer statistics
redis-cli XINFO CONSUMERS events order-service
```

## Redelivery of Unacknowledged Messages

If a Dapr sidecar crashes before acknowledging a message, the `redeliverInterval` controls when Dapr reclaims and redelivers the pending message. Set it based on your processing time:

```yaml
metadata:
  - name: redeliverInterval
    value: "30s"
  - name: processingTimeout
    value: "25s"
```

Processing timeout should be less than redelivery interval to avoid duplicates.

## Stream Length Management

Redis Streams grow indefinitely without trimming. Use `maxLenApprox` to cap the stream:

```yaml
metadata:
  - name: maxLenApprox
    value: "10000"
```

This uses Redis's approximate trimming (`MAXLEN ~`), which is efficient for high-throughput streams.

## Summary

Dapr's Redis pub/sub component leverages Redis Streams consumer groups for reliable message delivery across multiple service replicas. Set a unique `consumerID` per pod for proper consumer tracking, configure `redeliverInterval` to handle crashed consumers, and use `maxLenApprox` to prevent unbounded stream growth. Redis Streams provide a lightweight alternative to Kafka for lower-throughput pub/sub scenarios.
