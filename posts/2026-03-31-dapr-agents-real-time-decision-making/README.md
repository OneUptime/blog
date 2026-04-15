# How to Use Dapr Agents for Real-Time Decision Making

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Real-Time, Decision Making, Event-Driven

Description: Learn how to build Dapr-powered agents that make real-time decisions by reacting to streaming events and invoking downstream services.

---

## Overview

Real-time decision making requires an agent to consume events as they arrive, evaluate context, and act within milliseconds. Dapr's pub/sub, service invocation, and state management APIs together provide the building blocks for low-latency autonomous agents.

## Architecture

A real-time Dapr agent typically follows this pattern:

1. Subscribe to a high-velocity event stream via pub/sub
2. Load relevant state from a fast state store
3. Apply a decision model (rule engine or ML model)
4. Invoke downstream services or publish result events

## Setting Up the Event Subscription

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: sensor-events
spec:
  topic: sensor-readings
  route: /decide
  pubsubname: pubsub
```

## Implementing the Decision Handler

```python
from flask import Flask, request, jsonify
from dapr.clients import DaprClient
import json, time

app = Flask(__name__)

@app.route('/decide', methods=['POST'])
def decide():
    envelope = request.json
    event = json.loads(envelope.get("data", "{}"))

    sensor_id = event["sensor_id"]
    reading = event["value"]

    # Load baseline from state store for comparison
    with DaprClient() as client:
        state = client.get_state("statestore", f"baseline:{sensor_id}")
        baseline = json.loads(state.data) if state.data else {"threshold": 80}

    # Make decision
    if reading > baseline["threshold"]:
        action = "alert"
        _trigger_alert(sensor_id, reading)
    else:
        action = "normal"

    return jsonify({"status": "processed", "action": action}), 200

def _trigger_alert(sensor_id, reading):
    with DaprClient() as client:
        client.publish_event(
            pubsub_name="pubsub",
            topic_name="alerts",
            data=json.dumps({"sensor": sensor_id, "value": reading, "ts": time.time()})
        )
```

## Invoking Downstream Services for Enrichment

Before deciding, enrich the event with additional context from another service:

```python
def enrich_event(sensor_id: str) -> dict:
    with DaprClient() as client:
        response = client.invoke_method(
            app_id="sensor-registry",
            method_name=f"sensors/{sensor_id}/metadata",
            http_verb="GET"
        )
        return json.loads(response.data)
```

## Measuring Decision Latency

Instrument your handler to track decision time:

```python
import time

@app.route('/decide', methods=['POST'])
def decide():
    start = time.perf_counter()
    # ... decision logic ...
    latency_ms = (time.perf_counter() - start) * 1000
    app.logger.info(f"Decision latency: {latency_ms:.2f}ms")
    return jsonify({"latency_ms": latency_ms}), 200
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: decision-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: decision-agent
  template:
    metadata:
      labels:
        app: decision-agent
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "decision-agent"
        dapr.io/app-port: "5000"
        dapr.io/app-protocol: "http"
    spec:
      containers:
      - name: agent
        image: myrepo/decision-agent:latest
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
```

## Summary

Dapr enables real-time decision agents by combining fast pub/sub event delivery with low-latency state reads and service invocation. By designing your agent as a stateless event handler enriched with Dapr building blocks, you can scale horizontally to handle high-velocity event streams with low-latency processing times.
