# How to Use the dapr publish Command for Message Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Pub/Sub, Testing, Messaging

Description: Learn how to use the dapr publish command to send test messages to pub/sub topics directly from the CLI without writing application code.

---

## Overview

The `dapr publish` command lets you publish messages to a Dapr pub/sub topic from the command line. This is invaluable for testing subscriber services, simulating events, and debugging message pipelines without writing a dedicated publisher application.

## Basic Usage

Publish a message to a topic:

```bash
dapr publish --publish-app-id my-publisher \
             --pubsub pubsub \
             --topic orders \
             --data '{"orderId": "order-001", "amount": 99.99}'
```

- `--publish-app-id` is the app ID used as the publisher identity
- `--pubsub` is the name of the pub/sub component
- `--topic` is the target topic name
- `--data` is the message payload as a JSON string

## Publishing from a File

For complex payloads, use a file:

```bash
dapr publish --publish-app-id event-publisher \
             --pubsub pubsub \
             --topic order-events \
             --data-file ./test-event.json
```

Where `test-event.json` contains:

```json
{
  "eventType": "order.placed",
  "timestamp": "2026-03-31T10:00:00Z",
  "payload": {
    "orderId": "ord-789",
    "customerId": "cust-123",
    "total": 249.50
  }
}
```

## Setting CloudEvents Metadata

Dapr wraps messages in CloudEvents format by default. Set custom metadata:

```bash
dapr publish --publish-app-id test-publisher \
             --pubsub pubsub \
             --topic inventory-events \
             --data '{"sku":"ITEM-001","change":-5}' \
             --metadata '{"ttlInSeconds":"300","priority":"high"}'
```

## Testing a Subscriber Service

Run a subscriber and then publish test messages to verify it behaves correctly:

```bash
# Terminal 1: start the subscriber
dapr run --app-id subscriber --app-port 8080 -- python subscriber.py

# Terminal 2: publish test messages
dapr publish --publish-app-id test-sender \
             --pubsub pubsub \
             --topic product-updates \
             --data '{"productId":"prod-001","price":19.99}'
```

## Bulk Publishing for Load Testing

Use a loop to simulate high-volume message publishing:

```bash
#!/bin/bash
for i in $(seq 1 100); do
  dapr publish \
    --publish-app-id load-tester \
    --pubsub pubsub \
    --topic stress-test \
    --data "{\"messageId\": $i, \"payload\": \"test data $i\"}"
  echo "Published message $i"
done
```

## Publishing in Kubernetes Environments

The `dapr publish` command works in self-hosted mode only and does not support Kubernetes directly. To publish a test message in a Kubernetes environment, use `kubectl exec` to call the Dapr sidecar HTTP API from within a pod:

```bash
kubectl exec -n production deploy/my-app -c my-app -- \
  curl -s -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
    -H "Content-Type: application/json" \
    -d '{"orderId":"k8s-001"}'
```

## Summary

`dapr publish` is the fastest way to test pub/sub subscribers without writing any publisher code. It publishes messages directly to the configured pub/sub backend through the Dapr sidecar. Use it during development to validate subscriber logic, test error handling, and simulate event-driven workflows manually.
