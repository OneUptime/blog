# How to Configure Dapr for High Throughput Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Performance, Throughput, Optimization, Kubernetes

Description: Learn how to configure Dapr for high-throughput workloads by tuning concurrency, connection pooling, pub/sub settings, and sidecar resources.

---

## Overview

High-throughput applications require careful Dapr configuration to avoid the sidecar becoming a bottleneck. Key levers include concurrency limits, connection pool sizes, pub/sub batch settings, and sidecar resource allocation.

## Increase Sidecar Resources

Allocate sufficient CPU and memory for the sidecar under load:

```yaml
annotations:
  dapr.io/sidecar-cpu-request: "500m"
  dapr.io/sidecar-cpu-limit: "2000m"
  dapr.io/sidecar-memory-request: "256Mi"
  dapr.io/sidecar-memory-limit: "512Mi"
```

## Tune App Max Concurrency

Set a high concurrency limit for your throughput-oriented service:

```yaml
annotations:
  dapr.io/app-max-concurrency: "200"
```

Remove this annotation entirely to allow unlimited concurrency if your app handles backpressure internally.

## Optimize Pub/Sub for High Throughput

Configure bulk publish and subscribe settings:

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
    value: "kafka-broker:9092"
  - name: maxMessageBytes
    value: "10485760"
  - name: consumerFetchMin
    value: "1048576"       # Fetch at least 1MB per poll
  - name: consumerFetchDefault
    value: "2097152"       # Default fetch size of 2MB per request
  - name: channelBufferSize
    value: "512"           # Larger internal buffer
```

## Use Bulk Subscribe

For high-volume topics, use bulk subscription to process multiple messages per handler invocation:

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "high-volume-events",
        "route": "/process-bulk",
        "bulkSubscribe": {
            "enabled": True,
            "maxMessagesCount": 100,
            "maxAwaitDurationMs": 1000
        }
    }])

@app.route('/process-bulk', methods=['POST'])
def process_bulk():
    envelope = request.json
    entries = envelope.get("entries", [])
    results = []
    for entry in entries:
        # Process each message
        data = json.loads(entry["event"])
        results.append({"entryId": entry["entryId"], "status": "SUCCESS"})
    return jsonify({"statuses": results})
```

## Optimize State Operations

Use bulk state operations for batch reads and writes:

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateItem

def batch_save(records: list):
    with DaprClient() as client:
        states = [StateItem(key=r["id"], value=r["data"]) for r in records]
        client.save_bulk_state(store_name="statestore", states=states)
```

## Horizontal Pod Autoscaling

Scale application pods based on CPU or custom metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: high-throughput-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Summary

Achieving high throughput with Dapr requires tuning at multiple layers: sidecar resource limits, concurrency settings, pub/sub batching, bulk state operations, and horizontal scaling. Profile your application under realistic load and adjust each setting incrementally to find the optimal configuration for your specific workload.
