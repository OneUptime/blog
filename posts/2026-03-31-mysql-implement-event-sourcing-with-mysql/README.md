# How to Implement Event Sourcing with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Event Sourcing, Architecture, Transaction, Schema

Description: Learn how to implement an event sourcing pattern using MySQL as the event store, storing immutable domain events and rebuilding state from the event log.

---

Event sourcing stores every state change as an immutable event rather than overwriting rows. MySQL is a practical event store for many workloads because it offers ACID transactions, JSON column support, and the ability to query the event history with SQL.

## Designing the Events Table

The core of event sourcing is an append-only events table. Each row records what happened, to which entity, and when:

```sql
CREATE TABLE events (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  aggregate_id  VARCHAR(36)   NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type    VARCHAR(100)  NOT NULL,
  payload       JSON          NOT NULL,
  metadata      JSON,
  version       INT UNSIGNED  NOT NULL,
  occurred_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_aggregate (aggregate_type, aggregate_id, version),
  UNIQUE KEY uq_aggregate_version (aggregate_type, aggregate_id, version)
) ENGINE=InnoDB;
```

The `version` column enables optimistic concurrency control. No row is ever updated or deleted.

## Appending Events with Optimistic Concurrency

Before inserting a new event, verify the expected version to prevent lost updates:

```sql
-- Wrap in a transaction
START TRANSACTION;

SELECT COALESCE(MAX(version), 0) INTO @current_version
FROM events
WHERE aggregate_id = 'order-42' AND aggregate_type = 'Order'
FOR UPDATE;

-- Application code should check @current_version = @expected_version here.
-- If they differ, roll back to signal a concurrency conflict.
-- The UNIQUE constraint on (aggregate_type, aggregate_id, version) acts as a safety net.

INSERT INTO events (aggregate_id, aggregate_type, event_type, payload, version)
VALUES (
  'order-42',
  'Order',
  'OrderPlaced',
  '{"customer_id": 10, "amount": 150.00, "items": [{"sku": "A1", "qty": 2}]}',
  @current_version + 1
);

COMMIT;
```

## Rebuilding State from Events

To reconstruct the current state of an aggregate, load all its events in order:

```sql
SELECT event_type, payload, version, occurred_at
FROM events
WHERE aggregate_id = 'order-42'
  AND aggregate_type = 'Order'
ORDER BY version ASC;
```

In application code, fold over the events to produce the current state:

```python
def rebuild_order(events):
    state = {}
    for event in events:
        if event["event_type"] == "OrderPlaced":
            state.update(event["payload"])
            state["status"] = "placed"
        elif event["event_type"] == "OrderShipped":
            state["status"] = "shipped"
            state["tracking_number"] = event["payload"]["tracking_number"]
        elif event["event_type"] == "OrderCancelled":
            state["status"] = "cancelled"
    return state
```

## Snapshots for Performance

Replaying thousands of events on every read is slow. Add a snapshots table to cache periodic state:

```sql
CREATE TABLE snapshots (
  aggregate_id   VARCHAR(36)  NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  version        INT UNSIGNED NOT NULL,
  state          JSON         NOT NULL,
  created_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (aggregate_type, aggregate_id)
) ENGINE=InnoDB;
```

Load the latest snapshot and apply only events after the snapshot version:

```sql
SELECT state, version FROM snapshots
WHERE aggregate_id = 'order-42' AND aggregate_type = 'Order';

SELECT event_type, payload, version FROM events
WHERE aggregate_id = 'order-42'
  AND aggregate_type = 'Order'
  AND version > @snapshot_version
ORDER BY version ASC;
```

## Projecting Read Models

Create materialized views by processing events asynchronously and writing to separate read tables:

```sql
CREATE TABLE order_summary (
  order_id    VARCHAR(36) PRIMARY KEY,
  customer_id INT,
  total       DECIMAL(10,2),
  status      VARCHAR(50),
  updated_at  DATETIME(6)
) ENGINE=InnoDB;
```

A background worker tails the events table and upserts into `order_summary`, giving fast read performance without affecting the event store.

## Summary

MySQL is a capable event store when you design an append-only events table with a version column for concurrency control. State is rebuilt by replaying events in order, snapshots reduce replay cost for long-lived aggregates, and separate read tables provide fast query performance. The pattern works well at moderate scale and avoids the operational complexity of dedicated event-sourcing databases.
