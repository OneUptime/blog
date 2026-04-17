# How to Handle Dead Letters in ClickHouse Message Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dead Letter Queue, Pipeline, Error Handling, Kafka

Description: Implement dead letter queue handling in ClickHouse message pipelines to capture, store, and replay failed messages without losing data or blocking the main consumer.

---

A dead letter queue (DLQ) captures messages that cannot be processed successfully - whether due to schema violations, missing fields, or transformation errors. Without a DLQ, failed messages are either dropped silently or block the entire pipeline. Proper DLQ handling keeps your main pipeline flowing while preserving failed messages for investigation and replay.

## DLQ Pattern in ClickHouse Kafka Pipelines

```text
Kafka Topic (events)
    |
    v
ClickHouse Kafka Engine (kafka_handle_error_mode = 'stream')
    |
    +-- Valid messages --> Materialized View --> events table
    |
    +-- Parse errors --> Materialized View --> dead_letters table
    |
    +-- Validation failures --> Materialized View --> failed_events table
```

## Setting Up the Dead Letter Table

```sql
CREATE TABLE dead_letters (
    received_at DateTime DEFAULT now(),
    source_topic String,
    source_partition UInt32,
    source_offset UInt64,
    raw_message String,
    error_type LowCardinality(String),
    error_detail String,
    retry_count UInt8 DEFAULT 0,
    resolved Bool DEFAULT false
) ENGINE = MergeTree
PARTITION BY toYYYYMM(received_at)
ORDER BY (received_at, source_topic)
TTL received_at + INTERVAL 30 DAY;
```

## Capturing Parse Errors

```sql
CREATE MATERIALIZED VIEW dead_letter_parse_errors_mv
TO dead_letters
AS
SELECT
    now() AS received_at,
    'events' AS source_topic,
    _partition AS source_partition,
    _offset AS source_offset,
    _raw_message AS raw_message,
    'PARSE_ERROR' AS error_type,
    _error AS error_detail
FROM kafka_events_raw
WHERE length(_error) > 0;
```

## Capturing Validation Failures

For messages that parse successfully but fail business validation:

```sql
CREATE TABLE failed_events (
    received_at DateTime DEFAULT now(),
    raw_message String,
    failure_reason String
) ENGINE = MergeTree
ORDER BY received_at
TTL received_at + INTERVAL 30 DAY;

CREATE MATERIALIZED VIEW failed_events_mv
TO failed_events
AS
SELECT
    now() AS received_at,
    -- Reconstruct raw from fields
    concat('{"user_id":"', user_id, '","event_type":"', event_type, '"}') AS raw_message,
    multiIf(
        event_type NOT IN ('click', 'view', 'purchase'), 'invalid_event_type',
        toUInt64OrNull(user_id) IS NULL, 'invalid_user_id',
        'unknown'
    ) AS failure_reason
FROM kafka_events_raw
WHERE length(_error) = 0
    AND (
        event_type NOT IN ('click', 'view', 'purchase')
        OR isNull(toUInt64OrNull(user_id))
    );
```

## Monitoring Dead Letter Volume

```sql
SELECT
    toStartOfHour(received_at) AS hour,
    error_type,
    count() AS failed_messages,
    count() OVER (PARTITION BY error_type ORDER BY hour ROWS UNBOUNDED PRECEDING) AS cumulative
FROM dead_letters
WHERE received_at >= now() - INTERVAL 24 HOUR
GROUP BY hour, error_type
ORDER BY hour, error_type;
```

Alert when the dead letter rate exceeds 1% of total message volume.

## Replaying Dead Letters

After fixing the root cause, replay dead letters by reading from the table and re-inserting:

```sql
-- Inspect failed messages
SELECT raw_message, error_detail
FROM dead_letters
WHERE error_type = 'PARSE_ERROR'
    AND received_at >= today()
LIMIT 20;
```

```python
# Replay to Kafka for re-processing
import json
from kafka import KafkaProducer

producer = KafkaProducer(bootstrap_servers=['kafka:9092'])

# Read from dead_letters and republish
for row in client.query('SELECT raw_message FROM dead_letters WHERE resolved = false').named_results():
    producer.send('events', row['raw_message'].encode())

# Mark as resolved
client.command("ALTER TABLE dead_letters UPDATE resolved = true WHERE resolved = false")
```

## Summary

Dead letter handling in ClickHouse pipelines uses `kafka_handle_error_mode = 'stream'` to route parse errors to a dedicated table, separate materialized views for validation failures, and monitoring queries to track dead letter rates over time. Always preserve the original raw message and error details to enable root cause analysis and safe replay after fixing the underlying issue.
