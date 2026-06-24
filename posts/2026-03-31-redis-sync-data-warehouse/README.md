# How to Sync Redis Data to a Data Warehouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Warehouse, ETL, Kafka, Pipeline

Description: Learn how to sync Redis data to a data warehouse using Kafka Connect, Debezium, or custom scripts to enable analytics on your operational data.

---

Syncing Redis data to a data warehouse enables long-term analytics on data that lives in your fast in-memory store. Redis is optimized for speed, not analytics - moving data downstream unlocks reporting, dashboards, and ML pipelines.

## Why Sync Redis to a Data Warehouse

Redis excels at real-time operations but lacks SQL querying, long retention, and analytical functions. Common use cases for syncing include:

- Session analytics: who visited, how long, from where
- Rate limit counters aggregated by time window
- Leaderboard snapshots for trend analysis
- Cache hit/miss ratios over time

## Option 1: Kafka Connect with Redis Source

The most production-ready approach uses Kafka as a buffer between Redis and the warehouse.

Install the Redis Kafka Source connector:

```bash
confluent-hub install jaredpetersen/kafka-connect-redis:latest
```

Configure the connector to capture keyspace events:

```json
{
  "name": "redis-source",
  "config": {
    "connector.class": "io.github.jaredpetersen.kafkaconnectredis.source.RedisSourceConnector",
    "redis.uri": "redis://localhost:6379",
    "redis.channels": "__keyevent@0__:set",
    "topic": "redis-events"
  }
}
```

Enable keyspace notifications in Redis:

```bash
redis-cli CONFIG SET notify-keyspace-events KEA
```

Then use a Kafka Sink connector to write to your warehouse (e.g., BigQuery, Snowflake, Redshift).

## Option 2: Custom Python ETL Script

For simpler setups, poll Redis keys on a schedule and write to your warehouse:

```python
import redis
import json
import time
import psycopg2

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def sync_counters_to_warehouse():
    conn = psycopg2.connect("postgresql://user:pass@warehouse/analytics")
    cur = conn.cursor()

    keys = r.keys("counter:*")
    for key in keys:
        value = r.get(key)
        ts = int(time.time())
        cur.execute(
            "INSERT INTO redis_counters (key, value, synced_at) VALUES (%s, %s, to_timestamp(%s))",
            (key, int(value), ts)
        )

    conn.commit()
    cur.close()
    conn.close()

sync_counters_to_warehouse()
```

Run this script via cron or an Airflow DAG.

## Option 3: RDB Snapshot Parsing

For bulk historical loads, take an RDB snapshot and parse it:

```bash
# Trigger a snapshot
redis-cli BGSAVE

# Copy the dump.rdb file
cp /var/lib/redis/dump.rdb /tmp/

# Use rdb-tools to export to JSON
pip install rdbtools
rdb --command json /tmp/dump.rdb > redis_snapshot.json
```

Then load the JSON into your warehouse using the native loader.

## Handling Data Types

Redis stores data as strings, hashes, lists, sets, and sorted sets. Map them to warehouse tables:

```text
Redis Hash     -> One row per hash, columns per field
Redis String   -> key-value row with type=string
Redis Sorted Set -> rows with member + score columns
Redis List     -> rows with position + value columns
```

## Keeping Data Fresh

For near-real-time sync, use Redis keyspace notifications with a consumer:

```python
pubsub = r.pubsub()
pubsub.psubscribe("__keyevent@0__:*")

for message in pubsub.listen():
    if message["type"] == "pmessage":
        key = message["data"]
        value = r.get(key)
        # Write to warehouse queue
        send_to_warehouse(key, value)
```

## Summary

Syncing Redis to a data warehouse requires choosing the right method based on volume and latency needs. Kafka Connect is the most scalable approach, while custom Python scripts work well for smaller data sets. Use RDB snapshot parsing for one-time historical loads.
