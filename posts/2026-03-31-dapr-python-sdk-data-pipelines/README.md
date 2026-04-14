# How to Use Dapr Python SDK for Data Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Data Pipeline, Pub/Sub, Workflow

Description: Learn how to build event-driven data pipelines using the Dapr Python SDK with pub/sub messaging, state checkpointing, and workflow orchestration.

---

## Introduction

Dapr provides the building blocks for reliable data pipelines: pub/sub for event-driven ingestion, state management for checkpointing, and workflows for orchestrating multi-step transformations. This guide builds a simple ETL pipeline using the Dapr Python SDK.

## Pipeline Architecture

Our pipeline has three stages:
1. **Ingest** - receive raw events via pub/sub
2. **Transform** - enrich and validate data
3. **Load** - write processed records to the state store

## Setting Up the Pipeline Components

```yaml
# components/pipeline-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pipeline-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: consumerID
      value: pipeline-worker
```

## Ingest Stage - Receiving Raw Events

```python
# pipeline.py
import json
from flask import Flask, request, jsonify
from dapr.clients import DaprClient

app = Flask(__name__)

@app.route("/dapr/subscribe", methods=["GET"])
def subscribe():
    return jsonify([
        {
            "pubsubname": "pipeline-pubsub",
            "topic": "raw-events",
            "route": "/ingest"
        },
        {
            "pubsubname": "pipeline-pubsub",
            "topic": "transform-queue",
            "route": "/transform"
        },
        {
            "pubsubname": "pipeline-pubsub",
            "topic": "load-queue",
            "route": "/load"
        }
    ])

@app.route("/ingest", methods=["POST"])
def ingest():
    body = request.get_json()
    raw = body.get("data", {})
    event_id = raw.get("id")

    # Save raw record for checkpointing
    with DaprClient() as client:
        client.save_state(
            store_name="statestore",
            key=f"raw-{event_id}",
            value=json.dumps(raw)
        )
        # Forward to transform stage
        client.publish_event(
            pubsub_name="pipeline-pubsub",
            topic_name="transform-queue",
            data=json.dumps(raw),
            data_content_type="application/json"
        )

    return jsonify({"status": "SUCCESS"})
```

## Transform Stage

```python
@app.route("/transform", methods=["POST"])
def transform():
    body = request.get_json()
    raw = body.get("data", {})
    event_id = raw.get("id")

    # Enrich the record
    enriched = {
        **raw,
        "processed_at": "2026-03-31T00:00:00Z",
        "source": "pipeline-v2",
        "amount_usd": float(raw.get("amount", 0)) * 1.0
    }

    with DaprClient() as client:
        # Forward to load stage
        client.publish_event(
            pubsub_name="pipeline-pubsub",
            topic_name="load-queue",
            data=json.dumps(enriched),
            data_content_type="application/json"
        )

    return jsonify({"status": "SUCCESS"})
```

## Load Stage with Deduplication

```python
@app.route("/load", methods=["POST"])
def load():
    body = request.get_json()
    record = body.get("data", {})
    event_id = record.get("id")

    with DaprClient() as client:
        # Check for duplicate
        existing = client.get_state(
            store_name="statestore",
            key=f"loaded-{event_id}"
        )
        if existing.data:
            print(f"Duplicate event {event_id}, skipping")
            return jsonify({"status": "SUCCESS"})

        # Write final record
        client.save_state(
            store_name="statestore",
            key=f"processed-{event_id}",
            value=json.dumps(record)
        )
        # Mark as loaded
        client.save_state(
            store_name="statestore",
            key=f"loaded-{event_id}",
            value="1"
        )

    print(f"Loaded event {event_id}")
    return jsonify({"status": "SUCCESS"})

if __name__ == "__main__":
    app.run(port=5000)
```

## Injecting Test Events

```bash
dapr publish \
  --publish-app-id pipeline-app \
  --pubsub pipeline-pubsub \
  --topic raw-events \
  --data '{"id":"evt-001","amount":"99.50","user":"alice"}'
```

## Running the Pipeline

```bash
dapr run \
  --app-id pipeline-app \
  --app-port 5000 \
  -- python pipeline.py
```

## Summary

Dapr pub/sub topics act as the queues between pipeline stages, while state management provides checkpointing and deduplication. This architecture decouples each stage so they can be scaled independently. Adding new transformation steps only requires publishing to a new topic and subscribing a new handler.
