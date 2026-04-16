# How to Handle Message Ordering in Kafka-to-ClickHouse Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kafka, Message Ordering, Pipeline, Deduplication

Description: Handle message ordering guarantees in Kafka-to-ClickHouse pipelines using partition keys, deduplication tables, and ReplacingMergeTree to manage out-of-order events.

---

Kafka guarantees ordering within a single partition, but ClickHouse pipelines often consume multiple partitions in parallel, introducing out-of-order delivery relative to global time. Understanding when ordering matters and how to handle it correctly is essential for building accurate analytics.

## When Ordering Matters

Not all pipelines require strict ordering:
- **Append-only events** (page views, logs): Ordering rarely matters
- **State updates** (user profile changes): Latest-wins semantics needed
- **Financial transactions**: Strict ordering required within an account

## Ensuring Partition-Level Ordering

Kafka guarantees order within a partition. Use a consistent partition key to ensure all events for the same entity go to the same partition:

```python
# Producer side: partition by user_id for per-user ordering
producer.send(
    'events',
    key=str(user_id).encode(),  # Consistent partition key
    value=json.dumps(event).encode()
)
```

On the ClickHouse side, a single consumer thread per partition ensures intra-partition order is preserved.

## Using ReplacingMergeTree for Latest-Wins

For state updates where only the latest value matters:

```sql
CREATE TABLE user_profiles (
    user_id UInt64,
    email String,
    plan LowCardinality(String),
    updated_at DateTime,
    kafka_offset UInt64
) ENGINE = ReplacingMergeTree(kafka_offset)
ORDER BY user_id;
```

`ReplacingMergeTree` keeps only the row with the highest version (`kafka_offset` here), effectively implementing last-write-wins semantics after merges.

## Reading Consistent Latest State

Since merges are background processes, query with deduplication to get the correct latest state:

```sql
SELECT *
FROM user_profiles FINAL
WHERE user_id = 12345;
```

Or use `argMax` for batch queries:

```sql
SELECT
    user_id,
    argMax(email, kafka_offset) AS latest_email,
    argMax(plan, kafka_offset) AS latest_plan
FROM user_profiles
GROUP BY user_id;
```

## Handling Out-of-Order Events with CollapsingMergeTree

For state-replacement workloads where you cancel an old row and write a new one (like inventory levels):

```sql
CREATE TABLE inventory_state (
    product_id UInt64,
    quantity Int32,
    event_time DateTime,
    sign Int8  -- 1 for new state, -1 to cancel previous state
) ENGINE = CollapsingMergeTree(sign)
ORDER BY (product_id, event_time);
```

## Deduplicating with the Kafka Offset

Include the Kafka offset in your target table to detect and handle duplicates:

```sql
CREATE TABLE events (
    event_time DateTime,
    user_id UInt64,
    event_type String,
    kafka_partition UInt32,
    kafka_offset UInt64
) ENGINE = ReplacingMergeTree(kafka_offset)
ORDER BY (event_time, user_id, kafka_partition, kafka_offset);
```

## Detecting Out-of-Order Messages

```sql
SELECT
    count() AS total_events,
    countIf(event_time < lag_time) AS out_of_order_count,
    round(countIf(event_time < lag_time) / count() * 100, 2) AS oor_pct
FROM (
    SELECT
        event_time,
        lagInFrame(event_time) OVER (PARTITION BY kafka_partition ORDER BY kafka_offset) AS lag_time
    FROM events
    WHERE toDate(event_time) = today()
);
```

## Summary

Handling message ordering in Kafka-to-ClickHouse pipelines requires choosing the right table engine for your semantics: ReplacingMergeTree for state updates, CollapsingMergeTree for delta changes, and plain MergeTree for append-only events where ordering doesn't matter. Use Kafka partition keys to ensure per-entity ordering at the producer level, and include `kafka_offset` as a version field to enable idempotent deduplication.
