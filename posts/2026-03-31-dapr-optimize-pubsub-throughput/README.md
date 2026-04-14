# How to Optimize Dapr for High-Throughput Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Throughput, Kafka, Performance

Description: Learn how to optimize Dapr pub/sub for high-throughput message processing using bulk operations, consumer groups, and component tuning.

---

## Overview

High-throughput pub/sub requires tuning at multiple levels: the underlying broker configuration, Dapr component settings, and application-level bulk processing. This guide focuses on Kafka-backed Dapr pub/sub as it's common in high-throughput scenarios.

## Configure the Kafka Component for Throughput

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-0:9092,kafka-1:9092,kafka-2:9092"
  - name: authRequired
    value: "false"
  - name: maxMessageBytes
    value: "10485760"      # 10MB max message
  - name: consumerFetchMin
    value: "65536"          # Fetch at least 64KB before returning
  - name: channelBufferSize
    value: "1024"           # Internal channel buffer
  - name: consumerFetchDefault
    value: "1048576"
```

## Use Bulk Subscribe

Bulk subscribe processes multiple messages per handler invocation, reducing overhead:

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "events",
        "route": "/process",
        "bulkSubscribe": {
            "enabled": True,
            "maxMessagesCount": 250,
            "maxAwaitDurationMs": 500
        }
    }])

@app.route('/process', methods=['POST'])
def process_bulk():
    envelope = request.json
    entries = envelope.get("entries", [])

    # Process all messages in the batch
    results = []
    for entry in entries:
        event_data = json.loads(entry["event"])
        # ... process event_data ...
        results.append({
            "entryId": entry["entryId"],
            "status": "SUCCESS"
        })

    return jsonify({"statuses": results})
```

## Use Bulk Publish

Publish multiple events in a single API call:

```python
from dapr.clients import DaprClient
import json

def bulk_publish(events: list):
    with DaprClient() as client:
        data = [json.dumps(e) for e in events]
        response = client.publish_events(
            pubsub_name="pubsub",
            topic_name="events",
            data=data,
            data_content_type="application/json"
        )
        if response.failed_entries:
            print(f"Failed to publish {len(response.failed_entries)} events")
```

## Scale Consumer Partitions

Increase Kafka topic partitions to enable parallel consumption:

```bash
# Create topic with 12 partitions for high throughput
kafka-topics.sh --create \
  --bootstrap-server kafka:9092 \
  --topic events \
  --partitions 12 \
  --replication-factor 3
```

Match the number of consumer pods to the partition count:

```yaml
spec:
  replicas: 12  # One pod per partition for maximum parallelism
```

## Monitor Pub/Sub Lag

Track consumer lag to detect throughput bottlenecks:

```bash
kafka-consumer-groups.sh \
  --bootstrap-server kafka:9092 \
  --describe \
  --group dapr-pubsub-consumer-group
```

## Summary

High-throughput Dapr pub/sub requires configuring the component for large fetch sizes and buffers, using bulk subscribe to amortize per-message overhead, publishing in batches, and scaling consumer replicas to match partition count. Monitor consumer lag to validate that your configuration is keeping up with the incoming message rate.
