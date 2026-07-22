# Transactional Outbox with At-Least-Once Delivery: Designing for Duplicate Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Transactional Outbox, At-Least-Once Delivery, Change Data Capture, Idempotency, Distributed System

Description: Build a transactional outbox that prevents lost events while making relay duplicates, ordering, cleanup, and replay explicit.

---

The transactional outbox solves a dual-write problem: it commits a business change and the intent to publish an event in one local database transaction. It does not guarantee that the relay publishes each event only once.

If a relay publishes successfully and crashes before recording that success, it must publish the outbox row again. Marking the row sent before publishing avoids that duplicate but can lose the event. A correct outbox therefore chooses at-least-once publication, preserves a stable event ID, and requires idempotent consumers.

## Start with the dual-write failure

Without an outbox, application code often does this:

```text
update order in database
publish OrderApproved
```

These operations have two independent outcomes. If the database commits and publishing fails, downstream services never learn about the approved order. If publishing succeeds and the database rolls back, downstream services act on a state that does not exist.

Reversing the calls only reverses the failure. Retrying the whole request can create another event or repeat the business mutation. A distributed transaction is rarely available across the application database and message broker.

## Commit state and intent together

Create the event ID before opening the transaction, then store the aggregate change and an immutable outbox row together:

```sql
CREATE TABLE outbox_event (
    event_id uuid PRIMARY KEY,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    aggregate_version bigint NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    occurred_at timestamptz NOT NULL,
    published_at timestamptz,
    lease_owner text,
    lease_until timestamptz,
    attempt_count integer NOT NULL DEFAULT 0,
    last_error text,
    UNIQUE (aggregate_type, aggregate_id, aggregate_version, event_type)
);
```

Then perform one local transaction:

```sql
BEGIN;

WITH updated AS (
    UPDATE orders
    SET status = 'approved', version = version + 1
    WHERE order_id = :order_id AND status = 'pending'
    RETURNING version
)
INSERT INTO outbox_event (
    event_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, payload, occurred_at
)
SELECT
    :event_id, 'Order', :order_id, updated.version,
    'OrderApproved', :payload, now()
FROM updated
RETURNING event_id;

COMMIT;
```

The `:name` tokens above represent bind parameters supplied by the application's database client; they are not literal PostgreSQL syntax.

The application must require exactly one returned outbox row before committing. Zero rows means the order was missing or was no longer pending, so no event was created and the transaction must follow the caller's conflict or retry policy. If the statement fails, the state change and insert both roll back. A successfully committed order transition therefore has a committed publication intent, and an event cannot escape from a transition that did not occur.

The unique aggregate-version rule is optional but useful when one event type should occur once for each state version. It does not replace `event_id`, which travels with the event and is the downstream deduplication identity.

## The relay has an unavoidable ambiguity

A polling relay typically claims unpublished rows, sends them, then marks them published:

```text
claim event e-91
publish e-91 to broker
mark e-91 published
```

There are three important failures:

1. Failure before publish leaves the row pending. A later attempt sends it.
2. Failure after publish but before `published_at` leaves the outcome ambiguous. A later attempt sends it again.
3. Failure after marking published does not matter only if the broker had definitely accepted the event first.

The second case is why duplicate publication is part of the pattern. Do not “fix” it by setting `published_at` before sending; a crash in between silently loses the event.

A broker acknowledgement or publisher confirm proves acceptance when received, but an acknowledgement can be lost after the broker commits. The relay must still retry uncertain outcomes.

## Poll outbox rows without holding a transaction over the network

PostgreSQL `FOR UPDATE SKIP LOCKED` can distribute queue-like rows across relay instances. Avoid keeping row locks and an open database transaction while waiting for a broker, because a slow broker then holds database resources and blocks cleanup.

Use a short claim transaction that gives rows a renewable lease:

```sql
WITH candidates AS (
    SELECT event_id
    FROM outbox_event
    WHERE published_at IS NULL
      AND (lease_until IS NULL OR lease_until < now())
    ORDER BY occurred_at, event_id
    FOR UPDATE SKIP LOCKED
    LIMIT 100
)
UPDATE outbox_event e
SET lease_owner = :relay_id,
    lease_until = now() + interval '60 seconds',
    attempt_count = attempt_count + 1
FROM candidates c
WHERE e.event_id = c.event_id
RETURNING e.*;
```

The `lease_owner` and `lease_until` columns hold the current claim. After publishing, update only rows whose lease is still owned by the relay. If the relay dies, the lease expires and another instance retries. A stale relay can still have published, so consumers remain idempotent.

Small deployments can publish under a row lock if the throughput and failure behavior are acceptable, but the atomicity limit is unchanged.

## Keep one immutable event identity

Every attempt to relay a row must send the same `event_id`. Do not generate an ID inside the publish loop. Include it in a message header or envelope along with event type, aggregate identity, aggregate version, and occurrence time.

```json
{
  "event_id": "4d47e190-0402-4048-bc2c-89dd54343cdc",
  "event_type": "OrderApproved",
  "aggregate_type": "Order",
  "aggregate_id": "order-417",
  "aggregate_version": 12,
  "occurred_at": "2026-07-22T09:15:00Z",
  "payload": { "approved_by": "policy-engine" }
}
```

Consumers insert `(consumer_name, event_id)` into an inbox under a unique constraint in the same transaction as their local business update. A repeated relay send then becomes a no-op for that consumer while remaining independently consumable by other services.

Broker deduplication is useful defense in depth, but often has a time or session scope. For example, SQS FIFO remembers a deduplication ID for five minutes. Kafka producer idempotence suppresses protocol retries within its defined producer session. Neither is a durable replacement for business-event identity across relay restarts, restore, or manual replay.

## Preserve per-aggregate order intentionally

AWS's outbox guidance calls out notification order as a design concern. Store an aggregate version or sequence in the same transaction as the state change. Route all events for one aggregate through the same ordered broker unit-such as a Kafka record key or SQS FIFO message group ID-and prevent relay concurrency from publishing version 13 before an earlier failed version 12. The claim query above does not provide that serialization by itself: its `ORDER BY` selects the batch but does not guarantee the order of `UPDATE ... RETURNING` rows. Claim only the earliest unpublished version for each aggregate, or use an aggregate-scoped lock, when publish order is required.

Global timestamp order is usually not trustworthy enough. Concurrent transactions can obtain timestamps before committing in the opposite order. Define the ordering requirement precisely:

- per aggregate is common and scalable;
- per tenant is stronger and less parallel;
- a total global order needs a serialization mechanism and is expensive.

Consumers should validate aggregate versions as well. Broker order cannot protect against an old event restored from an archive or published through another route.

## Polling and change data capture are relay choices

A polling publisher reads the outbox table directly. It is straightforward and gives the application explicit retry state, but it adds query load and requires claim, retry, and cleanup logic.

Change data capture reads committed changes from the database log. Debezium's Outbox Event Router is designed to capture outbox-table inserts, place the event ID in a header, use the aggregate ID as the event key, and route events based on configured columns. Because CDC sees committed changes, rolled-back outbox inserts do not become events.

CDC reduces application polling but does not make downstream effects exactly once. Connectors, brokers, or consumers can restart and replay. The same stable event ID and idempotent-consumer contract remain required.

Choose based on operational ownership, latency, database support, and recovery requirements. Do not run polling and CDC against the same rows unless deliberate duplicate publication is acceptable and observable.

## Treat payloads as contracts

Store the event facts needed by consumers at transaction time. Do not store only an aggregate ID and have the relay query current state later: by publication time the aggregate may have advanced, causing an `OrderApproved` event to contain cancelled-order state.

Keep event identity and payload immutable after insertion. Version event schemas, avoid credentials and unnecessary personal data, and define how consumers handle unknown fields and event types. Debezium's documentation expects inserts for outbox changes and can pass JSON or binary payloads through its event router; polling implementations may update only delivery metadata such as lease and publication fields.

## Retry and cleanup safely

Classify transient broker failures separately from invalid events. Use exponential backoff with jitter and a maximum retry delay. Never let one malformed row block every aggregate indefinitely; quarantine it with evidence while preserving ordering rules for its own aggregate.

Delete or archive rows only after the publication system's recovery point is safely beyond them. With polling, that normally means `published_at` is set and an operational retention window has passed. With CDC, coordinate cleanup with connector offsets and snapshot/recovery procedures so rows are not removed before capture.

Keep enough history to investigate a consumer report using `event_id`. Metrics should include oldest unpublished age, pending count, claims whose leases expired, attempts per event, publish latency, terminal failures, and consumer duplicate-detection rate.

## Test both consistency and duplication

Automate these boundaries:

- roll back after the business update and verify no outbox row exists;
- fail the outbox insert and verify the business update rolls back;
- stop the relay before publish and verify a later relay sends the event;
- stop after broker acceptance but before `published_at` and verify the event is sent again;
- run two relays against the same rows and verify claiming behaves as designed;
- publish aggregate versions around failures and verify downstream order checks;
- restore or redrive old events and verify consumer inbox retention covers them.

The success criterion is not “one message observed.” It is “no committed business change lacks an event, and every duplicate event converges on one correct consumer outcome.” That is the reliable contract a transactional outbox actually provides.

## Official Documentation

- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Debezium Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)
- [Debezium Quarkus Outbox extension](https://debezium.io/documentation/reference/stable/integrations/outbox.html)
- [PostgreSQL `SELECT` locking and `SKIP LOCKED`](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Apache Kafka 4.3 producer configuration](https://kafka.apache.org/43/configuration/producer-configs/)
- [Amazon SQS FIFO exactly-once processing](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html)
