# How to Implement Event Store Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Store, Event Sourcing, State Store, CQRS, Pattern

Description: Implement the Event Store pattern using Dapr state store to persist domain events as an immutable audit log for event sourcing.

---

## Overview

The Event Store pattern is the foundation of Event Sourcing - instead of storing current state, you store the sequence of events that led to that state. Dapr's state store provides the persistence layer for an event store, while pub/sub handles event propagation to downstream consumers.

## Event Store Data Model

Each aggregate's events are stored as an ordered sequence:

```python
from dataclasses import dataclass, field
from datetime import datetime
import uuid
import json

@dataclass
class StoredEvent:
    event_id: str
    event_type: str
    aggregate_id: str
    aggregate_type: str
    sequence: int
    version: str
    payload: dict
    metadata: dict
    occurred_at: str

    def to_dict(self) -> dict:
        return {
            "eventId": self.event_id,
            "eventType": self.event_type,
            "aggregateId": self.aggregate_id,
            "aggregateType": self.aggregate_type,
            "sequence": self.sequence,
            "version": self.version,
            "payload": self.payload,
            "metadata": self.metadata,
            "occurredAt": self.occurred_at
        }
```

## Event Store Implementation with Dapr

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateOptions, Concurrency
import json
from typing import List, Optional

class DaprEventStore:
    def __init__(self, store_name: str = "event-store"):
        self.store_name = store_name

    def append_events(self, aggregate_id: str, events: List[StoredEvent],
                      expected_version: int = -1):
        with DaprClient() as client:
            # Get current stream to check version
            stream_key = f"stream:{events[0].aggregate_type}:{aggregate_id}"
            current = client.get_state(self.store_name, stream_key)

            current_version = -1
            existing_events = []

            if current.data:
                stream = json.loads(current.data)
                current_version = stream["version"]
                existing_events = stream["events"]

            # Optimistic concurrency check
            if expected_version != -1 and current_version != expected_version:
                raise Exception(
                    f"Concurrency conflict: expected version {expected_version}, "
                    f"actual version {current_version}"
                )

            # Append new events
            for i, event in enumerate(events):
                event.sequence = current_version + i + 1

            all_events = existing_events + [e.to_dict() for e in events]
            new_version = current_version + len(events)

            # Save updated stream
            client.save_state(
                store_name=self.store_name,
                key=stream_key,
                value=json.dumps({
                    "aggregateId": aggregate_id,
                    "version": new_version,
                    "events": all_events
                }),
                etag=current.etag if current.etag else None,
                options=StateOptions(
                    concurrency=Concurrency.first_write
                )
            )

            return new_version

    def load_events(self, aggregate_type: str, aggregate_id: str,
                    from_version: int = 0) -> List[dict]:
        with DaprClient() as client:
            stream_key = f"stream:{aggregate_type}:{aggregate_id}"
            result = client.get_state(self.store_name, stream_key)

            if not result.data:
                return []

            stream = json.loads(result.data)
            events = stream["events"]

            return [e for e in events if e["sequence"] >= from_version]
```

## Dapr State Store Component for Event Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: event-store
  namespace: default
spec:
  type: state.postgresql
  version: v2
  metadata:
  - name: connectionString
    secretKeyRef:
      name: postgres-secret
      key: connectionString
  - name: tablePrefix
    value: "event_streams"
  - name: maxConns
    value: "20"
```

## Aggregate Root with Event Sourcing

```python
class OrderAggregate:
    def __init__(self):
        self.order_id = None
        self.status = None
        self.total = 0.0
        self._version = -1
        self._pending_events = []

    @classmethod
    def load(cls, event_store: DaprEventStore, order_id: str) -> 'OrderAggregate':
        aggregate = cls()
        events = event_store.load_events("Order", order_id)

        for event in events:
            aggregate._apply_event(event)
            aggregate._version = event["sequence"]

        return aggregate

    def place(self, order_id: str, customer_id: str, total: float):
        event = StoredEvent(
            event_id=str(uuid.uuid4()),
            event_type="OrderPlaced",
            aggregate_id=order_id,
            aggregate_type="Order",
            sequence=0,
            version="1.0",
            payload={"customerId": customer_id, "total": total},
            metadata={},
            occurred_at=datetime.utcnow().isoformat()
        )
        self._pending_events.append(event)
        self._apply_event(event.to_dict())

    def _apply_event(self, event: dict):
        if event["eventType"] == "OrderPlaced":
            self.order_id = event["aggregateId"]
            self.status = "placed"
            self.total = event["payload"]["total"]

    def save(self, event_store: DaprEventStore):
        event_store.append_events(self.order_id, self._pending_events, self._version)
        self._pending_events.clear()
```

## Publishing Events After Persistence

```python
def publish_stored_events(events: List[StoredEvent]):
    with DaprClient() as client:
        for event in events:
            client.publish_event(
                pubsub_name="orders-pubsub",
                topic_name=event.event_type,
                data=json.dumps(event.to_dict()),
                data_content_type='application/json'
            )
```

## Summary

The Event Store pattern with Dapr provides a durable, append-only log of all aggregate state changes. Using optimistic concurrency with ETags prevents concurrent modification conflicts. PostgreSQL as the backing state store adds SQL-level durability and enables direct SQL queries for debugging and reporting on the event stream without going through Dapr's API.
