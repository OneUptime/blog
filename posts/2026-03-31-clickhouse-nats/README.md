# How to Use ClickHouse with NATS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NATS, Messaging, Data Engineering, Analytics

Description: Learn how to consume messages from NATS subjects and JetStream streams directly into ClickHouse using the NATS table engine and materialized views.

---

> ClickHouse's NATS engine subscribes to subjects and JetStream streams, ingesting messages directly into analytical storage without external pipelines.

NATS is a lightweight, high-performance messaging system popular in cloud-native environments. ClickHouse includes a native NATS table engine that subscribes to NATS subjects and, combined with a materialized view, writes messages into MergeTree tables for analytics. This guide covers both core NATS subjects and JetStream persistent streams.

---

## Prerequisites

Install the NATS server and verify connectivity.

```bash
# Install NATS server
brew install nats-server       # macOS
# or
go install github.com/nats-io/nats-server/v2@latest

# Start NATS server with JetStream enabled
nats-server --jetstream --store_dir /tmp/nats-data &

# Verify with the NATS CLI
nats server info

# Check ClickHouse NATS support
clickhouse-client --query \
  "SELECT * FROM system.build_options WHERE name ILIKE '%NATS%'"
```

## Setting Up JetStream

Create a JetStream stream to make messages persistent and replayable.

```bash
# Create a stream for analytics events
nats stream add analytics \
  --subjects "events.>" \
  --storage file \
  --retention limits \
  --max-age 24h \
  --replicas 1

# Verify the stream
nats stream info analytics

# Create a consumer for ClickHouse
nats consumer add analytics clickhouse_consumer \
  --filter "events.>" \
  --ack explicit \
  --deliver all \
  --max-deliver 5 \
  --wait 30s
```

## Creating the Storage Table

Define the MergeTree table where NATS messages will be stored.

```sql
CREATE TABLE nats_events
(
    event_id    UUID,
    user_id     UInt64,
    event_type  LowCardinality(String),
    subject     String,
    payload     String,
    ts          DateTime64(3),
    received_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, user_id, ts)
TTL received_at + INTERVAL 30 DAY;
```

## Creating the NATS Table Engine

Connect ClickHouse to the NATS server.

```sql
CREATE TABLE nats_source
(
    event_id   String,
    user_id    UInt64,
    event_type String,
    payload    String,
    ts         String
)
ENGINE = NATS
SETTINGS
    nats_url            = 'nats://localhost:4222',
    nats_subjects       = 'events.user, events.system',
    nats_format         = 'JSONEachRow',
    nats_num_consumers  = 4,
    nats_queue_group    = 'clickhouse_group';
```

## Using JetStream with ClickHouse

For persistent, replayable streams, configure JetStream settings.

```sql
CREATE TABLE nats_jetstream_source
(
    event_id   String,
    user_id    UInt64,
    event_type String,
    payload    String,
    ts         String
)
ENGINE = NATS
SETTINGS
    nats_url                   = 'nats://localhost:4222',
    nats_subjects               = 'events.>',
    nats_format                 = 'JSONEachRow',
    nats_num_consumers          = 2,
    nats_stream                 = 'analytics',
    nats_consumer               = 'clickhouse_consumer';
```

## Creating the Materialized View

Transform and route messages into the storage table.

```sql
CREATE MATERIALIZED VIEW mv_nats_events TO nats_events AS
SELECT
    toUUID(event_id)            AS event_id,
    user_id,
    event_type,
    'events.user'               AS subject,
    payload,
    parseDateTimeBestEffort(ts) AS ts
FROM nats_source
WHERE length(event_id) > 0;
```

## Publishing Test Messages

Send messages from Python to validate the pipeline.

```python
import asyncio
import json
import uuid
import random
import time
import nats

async def publish_events():
    nc = await nats.connect("nats://localhost:4222")
    js = nc.jetstream()

    event_types = ['page_view', 'click', 'purchase', 'signup', 'logout']

    for i in range(1000):
        event = {
            'event_id':   str(uuid.uuid4()),
            'user_id':    random.randint(1, 5000),
            'event_type': random.choice(event_types),
            'payload':    json.dumps({'session': f's{i}', 'v': '2.0'}),
            'ts':         time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
        }

        subject = f"events.{'user' if random.random() > 0.3 else 'system'}"
        await js.publish(subject, json.dumps(event).encode())

        if i % 100 == 0:
            print(f'Published {i} messages')

    await nc.drain()
    print('Done publishing 1000 messages')

asyncio.run(publish_events())
```

## Connecting with TLS Authentication

Secure the NATS connection with TLS certificates.

```sql
CREATE TABLE nats_secure_source
(
    event_id   String,
    user_id    UInt64,
    event_type String,
    ts         String
)
ENGINE = NATS
SETTINGS
    nats_url               = 'tls://nats.example.com:4222',
    nats_subjects           = 'events.>',
    nats_format             = 'JSONEachRow',
    nats_num_consumers      = 2,
    nats_secure            = 1,
    nats_root_ca_cert      = '/etc/clickhouse-server/certs/nats-ca.crt',
    nats_client_cert       = '/etc/clickhouse-server/certs/nats-client.crt',
    nats_client_key        = '/etc/clickhouse-server/certs/nats-client.key';
```

## Monitoring NATS Consumer State

Check the consumer status from ClickHouse system tables.

```sql
-- Check NATS consumer status
SELECT
    database,
    table,
    num_consumers,
    num_pending_messages
FROM system.nats_consumers
WHERE database = 'default';
```

```bash
# Check JetStream consumer from NATS CLI
nats consumer info analytics clickhouse_consumer

# View stream message count
nats stream info analytics --json | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print('Messages:', d['state']['messages'])"
```

## Querying the Ingested Data

Run analytics queries on the messages stored in ClickHouse.

```sql
-- Event distribution over the last hour
SELECT
    event_type,
    count()               AS total,
    count(DISTINCT user_id) AS unique_users,
    min(ts)               AS first_seen,
    max(ts)               AS last_seen
FROM nats_events
WHERE received_at >= now() - INTERVAL 1 HOUR
GROUP BY event_type
ORDER BY total DESC;

-- Throughput per second
SELECT
    toStartOfSecond(received_at) AS second,
    count()                      AS msgs_per_second
FROM nats_events
WHERE received_at >= now() - INTERVAL 5 MINUTE
GROUP BY second
ORDER BY second DESC
LIMIT 20;
```

## Summary

ClickHouse's NATS engine subscribes to subjects directly and feeds messages into analytical tables via materialized views. Use JetStream for durable, replayable streams and configure `nats_consumer` to maintain consumer offsets across restarts. Queue groups let multiple ClickHouse instances share the load. Secure production deployments with TLS certificates and monitor consumer state through `system.nats_consumers`.
