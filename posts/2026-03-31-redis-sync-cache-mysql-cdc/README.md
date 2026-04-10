# How to Sync Redis Cache with MySQL Changes (CDC)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, MySQL, CDC, Debezium, Cache Sync

Description: Learn how to sync your Redis cache with MySQL changes using Change Data Capture via Debezium so your cache stays consistent without application-level invalidation.

---

Application-level cache invalidation requires every code path that modifies MySQL to also update Redis. CDC (Change Data Capture) is a more reliable approach: Debezium reads MySQL's binary log and emits change events to Kafka. A separate consumer updates Redis, so no application code needs to manage cache consistency.

## Architecture

```text
MySQL binlog --> Debezium --> Kafka topic (myapp.myapp.users) --> CDC Consumer --> Redis
```

## Setting Up MySQL for Binlog

```sql
-- In MySQL config (my.cnf)
-- log_bin = ON
-- binlog_format = ROW
-- binlog_row_image = FULL

-- Verify
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
```

## Debezium Connector Configuration

```json
{
  "name": "mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "dbz",
    "database.server.id": "1",
    "topic.prefix": "myapp",
    "database.include.list": "myapp",
    "table.include.list": "myapp.users,myapp.products",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
    "schema.history.internal.kafka.topic": "dbhistory.myapp"
  }
}
```

## CDC Consumer: Syncing Redis

```python
from kafka import KafkaConsumer
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
CACHE_TTL = 600

consumer = KafkaConsumer(
    "myapp.myapp.users",
    "myapp.myapp.products",
    bootstrap_servers=["kafka:9092"],
    value_deserializer=lambda v: json.loads(v.decode()) if v else None,
    group_id="redis-cache-sync"
)

def sync_redis(table: str, op: str, before: dict, after: dict):
    if table == "users":
        key = f"user:{after['id']}" if after else f"user:{before['id']}"
        if op in ("c", "u"):
            r.set(key, json.dumps(after), ex=CACHE_TTL)
            print(f"Cached {key}")
        elif op == "d":
            r.delete(key)
            print(f"Evicted {key}")

    elif table == "products":
        key = f"product:{after['id']}" if after else f"product:{before['id']}"
        if op in ("c", "u"):
            r.set(key, json.dumps(after), ex=3600)
        elif op == "d":
            r.delete(key)

for message in consumer:
    if not message.value:
        continue

    payload = message.value
    source_table = payload.get("source", {}).get("table", "")
    op = payload.get("op")        # c, u, d, r (read/snapshot)
    before = payload.get("before")
    after = payload.get("after")

    sync_redis(source_table, op, before, after)
```

## Handling Schema Changes

Debezium emits schema info with each event. Add a version check to avoid deserializing with a stale schema.

```python
def safe_sync(payload: dict):
    try:
        source_table = payload.get("source", {}).get("table", "")
        sync_redis(
            source_table,
            payload.get("op"),
            payload.get("before"),
            payload.get("after")
        )
    except KeyError as e:
        print(f"Schema mismatch, skipping: {e}")
```

## Verifying Sync Lag

```bash
# Kafka consumer lag (how far behind CDC consumer is)
kafka-consumer-groups.sh \
  --bootstrap-server kafka:9092 \
  --group redis-cache-sync \
  --describe

# Spot check Redis vs MySQL
redis-cli GET user:42
mysql -e "SELECT * FROM users WHERE id = 42;"
```

## Summary

CDC-driven Redis cache sync removes the need for application code to manage cache invalidation. Debezium captures every MySQL row change from the binary log and streams it to Kafka. A dedicated consumer applies upserts and deletes to Redis, keeping the cache consistent with the database within seconds without any schema changes or application coupling.

