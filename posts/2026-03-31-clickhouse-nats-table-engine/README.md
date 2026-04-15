# How to Use NATS Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NATS, Table Engine, Streaming, Message Queue, Integration, SQL

Description: Learn how to use the ClickHouse NATS table engine to subscribe to NATS subjects and stream messages into ClickHouse using materialized views.

---

The NATS table engine in ClickHouse subscribes to NATS subjects (topics) and exposes incoming messages as rows in a ClickHouse table. Combined with a Materialized View, it creates a continuous pipeline that persists NATS message streams into MergeTree tables for analytics.

## Creating a NATS Table

```sql
CREATE TABLE events_nats (
    ts         DateTime,
    event_type String,
    user_id    UInt64,
    value      Float64
) ENGINE = NATS
SETTINGS
    nats_url      = 'nats-host:4222',
    nats_subjects = 'events.>',
    nats_format   = 'JSONEachRow';
```

## NATS Engine Settings

```text
Setting              Description
nats_url             NATS server URL (host:port)
nats_subjects        Comma-separated subjects or wildcards (e.g., events.>, orders.*)
nats_format          Message format: JSONEachRow, CSV, Avro, Protobuf, etc.
nats_schema          Schema file path (required for Protobuf/Avro)
nats_num_consumers   Number of parallel consumer coroutines
nats_queue_group     NATS queue group name for load-balanced consumption
nats_stream          NATS JetStream stream name (required for JetStream)
nats_consumer_name   Durable pull consumer name (required for JetStream)
nats_username        Username for NATS auth
nats_password        Password for NATS auth
nats_token           Token for NATS auth
nats_credential_file Path to NATS credentials file for auth
nats_secure          Enable TLS (1 = yes)
```

## Streaming into MergeTree via Materialized View

```sql
-- Target MergeTree table
CREATE TABLE events (
    ts         DateTime,
    event_type LowCardinality(String),
    user_id    UInt64,
    value      Float64
) ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id);

-- Materialized View connects NATS source to MergeTree sink
CREATE MATERIALIZED VIEW events_nats_mv TO events AS
SELECT ts, event_type, user_id, value
FROM events_nats;
```

Once the Materialized View is created, ClickHouse subscribes to the NATS subject and inserts incoming messages into `events`.

## Queue Group for Load Balancing

When running multiple ClickHouse replicas, use a NATS queue group so each message is consumed by only one instance:

```sql
CREATE TABLE events_nats (...)
ENGINE = NATS
SETTINGS
    nats_url         = 'nats-host:4222',
    nats_subjects    = 'events.>',
    nats_format      = 'JSONEachRow',
    nats_queue_group = 'clickhouse_consumers';
```

## TLS Authentication

```sql
CREATE TABLE secure_events_nats (...)
ENGINE = NATS
SETTINGS
    nats_url    = 'nats-host:4222',
    nats_secure = 1,
    nats_token  = 'my_nats_token',
    nats_subjects = 'secure.events',
    nats_format = 'JSONEachRow';
```

## NATS JetStream

The NATS table engine also supports JetStream (persistent NATS messaging) for at-least-once delivery. To use JetStream, you must first create a stream and a durable pull consumer in NATS, then reference them using the `nats_stream` and `nats_consumer_name` settings:

```sql
CREATE TABLE js_events (
    ts    DateTime,
    data  String
) ENGINE = NATS
SETTINGS
    nats_url           = 'nats-host:4222',
    nats_subjects      = 'events.*',
    nats_format        = 'JSONEachRow',
    nats_stream        = 'my_stream',
    nats_consumer_name = 'my_consumer';
```

## Monitoring the Pipeline

```sql
-- Check ingestion rate
SELECT
    toStartOfMinute(ts) AS minute,
    count() AS events
FROM events
WHERE ts >= now() - INTERVAL 10 MINUTE
GROUP BY minute
ORDER BY minute;
```

## Summary

The NATS table engine subscribes to NATS subjects and streams messages into ClickHouse. Pair it with a Materialized View targeting a MergeTree table for persistent storage. Use queue groups for multi-replica load balancing and TLS for secure NATS connections. Unlike RabbitMQ, NATS supports wildcard subjects (`>` and `*`) for flexible topic routing.
