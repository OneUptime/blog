# How to Sync Redis Data to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Redis, Sync, Data Pipeline, Integration, Keyspace

Description: Sync Redis data to ClickHouse for analytics by using Redis keyspace notifications, pub/sub, or periodic SCAN-based batch exports.

---

Redis is an in-memory data store optimized for low-latency operations. Syncing Redis data to ClickHouse enables long-term storage and analytical queries on Redis events, counters, and time-series data.

## Use Case: Tracking Redis Events in ClickHouse

Common scenarios include:

- Storing Redis keyspace events for audit trails
- Moving time-series data from Redis to ClickHouse for historical analysis
- Capturing Redis pub/sub messages for event analytics

## Option 1: Keyspace Notification Listener

Enable Redis keyspace notifications in `redis.conf`:

```bash
notify-keyspace-events KEA
```

Write a subscriber that captures events and batches them to ClickHouse:

```python
import redis
import clickhouse_driver
from datetime import datetime

r = redis.Redis(host='localhost', decode_responses=True)
ch = clickhouse_driver.Client(host='localhost')

ch.execute("""
    CREATE TABLE IF NOT EXISTS redis_events (
        event_time DateTime DEFAULT now(),
        key String,
        event_type LowCardinality(String),
        database UInt8
    ) ENGINE = MergeTree()
    ORDER BY event_time
""")

pubsub = r.pubsub()
pubsub.psubscribe('__keyevent@0__:*')

buffer = []

for message in pubsub.listen():
    if message['type'] == 'pmessage':
        event_type = message['channel'].split(':')[-1]
        key = message['data']
        buffer.append({
            'event_time': datetime.now(),
            'key': key,
            'event_type': event_type,
            'database': 0
        })

    if len(buffer) >= 1000:
        ch.execute('INSERT INTO redis_events VALUES', buffer)
        buffer = []
```

## Option 2: Redis Streams to ClickHouse

Redis Streams provide a persistent, ordered log. Write events to a stream and consume from ClickHouse:

```python
# Producer: write events to Redis Stream
r.xadd('events', {
    'event_type': 'page_view',
    'user_id': '12345',
    'timestamp': str(datetime.now().timestamp())
})

# Consumer: read from stream and insert into ClickHouse
last_id = '0'
while True:
    entries = r.xread({'events': last_id}, count=1000, block=500)
    if entries:
        stream, messages = entries[0]
        rows = [
            {
                'event_time': datetime.fromtimestamp(float(m['timestamp'])),
                'event_type': m['event_type'],
                'user_id': int(m['user_id'])
            }
            for _, m in messages
        ]
        ch.execute('INSERT INTO events VALUES', rows)
        last_id = messages[-1][0]
```

## Option 3: Batch Export via SCAN

For key-value data that needs periodic syncing:

```python
cursor = 0
batch = []

while True:
    cursor, keys = r.scan(cursor, match='user:*:score', count=1000)
    for key in keys:
        user_id = int(key.split(':')[1])
        score = float(r.get(key) or 0)
        batch.append({'user_id': user_id, 'score': score, 'exported_at': datetime.now()})

    if batch:
        ch.execute('INSERT INTO user_scores VALUES', batch)
        batch = []

    if cursor == 0:
        break
```

## Create the Target Table

```sql
CREATE TABLE events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);
```

## Summary

Redis data syncs to ClickHouse via keyspace notification listeners for event tracking, Redis Streams for ordered event logs with backpressure, or periodic SCAN-based exports for key-value snapshots. Buffer events before inserting into ClickHouse to avoid the overhead of single-row inserts.
