# How to Implement the Outbox Pattern with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Outbox Pattern, Microservice, Event

Description: Learn how to implement the transactional outbox pattern with MySQL to reliably publish events to a message broker without losing messages when the service or broker fails.

---

## What Is the Outbox Pattern

The transactional outbox pattern solves the dual-write problem: how do you update your database and publish an event to a message broker atomically? If you write to the database and then publish to the broker, a crash between the two operations either loses the event or leaves the database in an inconsistent state.

The solution: write the event to an outbox table in the same database transaction as your business data. A separate relay process reads the outbox and publishes to the broker, guaranteeing at-least-once delivery.

## Create the Outbox Table

```sql
CREATE TABLE outbox_events (
  id            BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id      CHAR(36)      NOT NULL DEFAULT (UUID()),
  event_type    VARCHAR(100)  NOT NULL,
  aggregate_type VARCHAR(50)  NOT NULL,
  aggregate_id  VARCHAR(100)  NOT NULL,
  payload       JSON          NOT NULL,
  published_at  TIMESTAMP,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_id (event_id),
  INDEX idx_unpublished (published_at, created_at)
) ENGINE=InnoDB;
```

## Writing to the Outbox Atomically

```sql
-- Place an order and record the event in the same transaction
START TRANSACTION;

  INSERT INTO orders (user_id, total, status)
  VALUES (42, 99.99, 'PENDING');

  SET @order_id = LAST_INSERT_ID();

  INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'ORDER_CREATED',
    'order',
    @order_id,
    JSON_OBJECT(
      'order_id',  @order_id,
      'user_id',   42,
      'total',     99.99,
      'currency',  'USD',
      'timestamp', NOW()
    )
  );

COMMIT;
```

If the transaction rolls back (e.g., due to a validation error), neither the order nor the event is written.

## Relay Process: Publishing Events

A relay process polls the outbox table and publishes unpublished events to the message broker:

```python
import pymysql
import json
import time

def publish_pending_events(db_conn, broker_client):
    with db_conn.cursor(pymysql.cursors.DictCursor) as cur:
        # Fetch a batch of unpublished events
        cur.execute("""
            SELECT id, event_id, event_type, aggregate_type,
                   aggregate_id, payload
            FROM outbox_events
            WHERE published_at IS NULL
            ORDER BY created_at ASC
            LIMIT 100
            FOR UPDATE SKIP LOCKED
        """)
        events = cur.fetchall()

    for event in events:
        # Publish to message broker (Kafka, RabbitMQ, SNS, etc.)
        broker_client.publish(
            topic=event["event_type"],
            key=event["aggregate_id"],
            value=json.loads(event["payload"]),
            headers={"event_id": event["event_id"]}
        )

        # Mark as published
        with db_conn.cursor() as cur:
            cur.execute(
                "UPDATE outbox_events SET published_at = NOW() WHERE id = %s",
                (event["id"],)
            )

    db_conn.commit()
```

The `FOR UPDATE SKIP LOCKED` clause prevents multiple relay instances from processing the same event concurrently.

## Cleanup Old Published Events

```sql
-- Delete events published more than 7 days ago
DELETE FROM outbox_events
WHERE published_at IS NOT NULL
  AND published_at < NOW() - INTERVAL 7 DAY
LIMIT 1000;
```

Schedule this as a MySQL Event or a cron job to prevent the outbox table from growing unboundedly.

## Idempotent Consumers

Because the relay uses at-least-once delivery, consumers must handle duplicate events. Use the `event_id` for deduplication:

```sql
-- Consumer deduplication table
CREATE TABLE processed_events (
  event_id   CHAR(36)  NOT NULL PRIMARY KEY,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Check before processing
INSERT IGNORE INTO processed_events (event_id) VALUES ('event-uuid-here');
-- ROW_COUNT() = 1 means new event, = 0 means already processed
SELECT ROW_COUNT() AS is_new;
```

## Monitoring the Outbox

```sql
-- Alert if unpublished events are accumulating (relay may be down)
SELECT COUNT(*) AS unpublished_count,
       MIN(created_at) AS oldest_unpublished
FROM outbox_events
WHERE published_at IS NULL;
```

Set an alert if `unpublished_count` exceeds a threshold or `oldest_unpublished` is more than a few minutes old.

## Summary

The transactional outbox pattern with MySQL guarantees that database changes and event publishing are consistent. Write events to the outbox table in the same transaction as your business data, use a relay process with `FOR UPDATE SKIP LOCKED` for concurrent polling, and make consumers idempotent using the `event_id`. Monitor the outbox size to detect relay failures early.
