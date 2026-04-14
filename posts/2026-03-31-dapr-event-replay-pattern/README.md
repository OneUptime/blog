# How to Implement Event Replay Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Replay, Event Sourcing, State Reconstruction, Pub/Sub, Pattern

Description: Implement event replay with Dapr to rebuild state, recover from failures, and onboard new services by replaying historical events.

---

## Overview

Event replay is the process of re-processing historical events to reconstruct state, fix bugs in event handlers, or bring new services up to date. In Dapr-based systems, event replay requires reading events from the event store and re-publishing them through pub/sub while preventing duplicate side effects.

## When to Use Event Replay

- Rebuilding a read model after schema change
- Recovering a service that missed events during downtime
- Onboarding a new service that needs historical data
- Fixing a bug in an event handler and reprocessing affected events

## Event Replay Implementation

Build a replay service that reads from the event store and re-publishes:

```python
from dapr.clients import DaprClient
import json
import time
from typing import Optional

class EventReplayService:
    def __init__(self, event_store_name: str, pubsub_name: str):
        self.event_store_name = event_store_name
        self.pubsub_name = pubsub_name

    def replay_aggregate_events(
        self,
        aggregate_type: str,
        aggregate_id: str,
        from_sequence: int = 0,
        to_sequence: Optional[int] = None,
        delay_ms: int = 10
    ):
        """Replay events for a specific aggregate"""
        with DaprClient() as client:
            stream_key = f"stream:{aggregate_type}:{aggregate_id}"
            result = client.get_state(self.event_store_name, stream_key)

            if not result.data:
                print(f"No events found for {aggregate_type}:{aggregate_id}")
                return

            stream = json.loads(result.data)
            events = stream["events"]

            replayed = 0
            for event in events:
                seq = event.get("sequence", 0)
                if seq < from_sequence:
                    continue
                if to_sequence and seq > to_sequence:
                    break

                # Add replay metadata to distinguish from live events
                event["_replay"] = True
                event["_replayedAt"] = "2026-03-31T10:00:00Z"

                client.publish_event(
                    pubsub_name=self.pubsub_name,
                    topic_name=f"{event['eventType']}.replay",
                    data=json.dumps(event)
                )

                replayed += 1
                if delay_ms > 0:
                    time.sleep(delay_ms / 1000)

            print(f"Replayed {replayed} events for {aggregate_type}:{aggregate_id}")

    def replay_topic_events(
        self,
        snapshot_key: str,
        events: list,
        target_topic: str,
        batch_size: int = 100
    ):
        """Replay a batch of events to a specific topic"""
        with DaprClient() as client:
            for i in range(0, len(events), batch_size):
                batch = events[i:i + batch_size]
                for event in batch:
                    event["_replay"] = True
                    client.publish_event(
                        pubsub_name=self.pubsub_name,
                        topic_name=target_topic,
                        data=json.dumps(event)
                    )
                print(f"Replayed batch {i // batch_size + 1}: {len(batch)} events")
```

## Replay-Aware Event Handler

Handlers must distinguish between live and replayed events:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/orders/placed', methods=['POST'])
def handle_order_placed():
    event_data = request.json
    data = event_data.get('data', {})
    is_replay = data.get('_replay', False)

    if is_replay:
        # Skip side effects during replay (no emails, no external calls)
        handle_order_placed_replay(data)
    else:
        # Full processing with side effects for live events
        handle_order_placed_live(data)

    return jsonify({"status": "SUCCESS"}), 200

def handle_order_placed_live(data: dict):
    order_id = data["orderId"]
    # Update read model
    update_order_read_model(order_id, data)
    # Send confirmation email
    send_order_confirmation_email(order_id)
    # Update inventory
    reserve_inventory(data["items"])

def handle_order_placed_replay(data: dict):
    order_id = data["orderId"]
    # Only update read model - skip side effects
    update_order_read_model(order_id, data)
    print(f"Replay: rebuilt read model for order {order_id}")

def update_order_read_model(order_id: str, data: dict):
    print(f"Updating read model for order {order_id}")

def send_order_confirmation_email(order_id: str):
    print(f"Sending email for order {order_id}")

def reserve_inventory(items: list):
    print(f"Reserving inventory for {len(items)} items")
```

## Dapr Subscription for Replay Topic

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-placed-replay
spec:
  pubsubname: orders-pubsub
  topic: OrderPlaced.replay
  routes:
    default: /orders/placed
  scopes:
  - read-model-service
```

## Replay CLI Tool

```bash
#!/bin/bash
# replay-events.sh

AGGREGATE_TYPE=$1
AGGREGATE_ID=$2
FROM_SEQ=${3:-0}

echo "Replaying $AGGREGATE_TYPE:$AGGREGATE_ID from sequence $FROM_SEQ"

curl -X POST http://localhost:3500/v1.0/invoke/event-replay-service/method/replay \
  -H "Content-Type: application/json" \
  -d "{
    \"aggregateType\": \"$AGGREGATE_TYPE\",
    \"aggregateId\": \"$AGGREGATE_ID\",
    \"fromSequence\": $FROM_SEQ
  }"
```

## Summary

Event replay with Dapr requires marking replayed events to suppress side effects in handlers while still updating read models and projections. Publishing to dedicated replay topics (`EventName.replay`) allows subscribing services to handle live and replayed events with different logic. Rate-limiting replay with the `delay_ms` parameter prevents overwhelming downstream services when replaying large event streams.
