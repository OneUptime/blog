# How to Sync Redis Cache with PostgreSQL Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PostgreSQL, Cache Synchronization, Logical Replication, Debezium

Description: Learn how to keep Redis cache in sync with PostgreSQL changes using logical replication, Debezium CDC, and application-level event patterns.

---

## The Cache Synchronization Problem

When multiple services write to PostgreSQL independently, simple cache-aside invalidation in your application is insufficient. Changes from:
- Background jobs and cron tasks
- Other microservices
- Database migrations
- Direct database access by administrators

...will bypass your application's cache invalidation logic, leaving stale data in Redis.

## Approach 1: Application-Level Events with Pub/Sub

Publish cache invalidation events through Redis Pub/Sub whenever PostgreSQL is updated:

```python
import redis
import psycopg2
import json
from typing import Optional

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

INVALIDATION_CHANNEL = "cache:invalidation"

def publish_invalidation(entity: str, entity_id: str):
    """Publish a cache invalidation event for all subscribers."""
    event = json.dumps({'entity': entity, 'id': entity_id})
    r.publish(INVALIDATION_CHANNEL, event)

def update_user_with_event(user_id: int, name: str, email: str):
    pg = psycopg2.connect("postgresql://user:password@localhost/mydb")
    with pg.cursor() as cur:
        cur.execute(
            "UPDATE users SET name = %s, email = %s WHERE id = %s",
            (name, email, user_id)
        )
    pg.commit()

    # Invalidate local cache
    r.delete(f"user:{user_id}")

    # Publish invalidation event for other services
    publish_invalidation("user", str(user_id))

# Invalidation listener (runs in each service instance)
def start_invalidation_listener():
    import threading

    def listen():
        sub_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
        pubsub = sub_client.pubsub()
        pubsub.subscribe(INVALIDATION_CHANNEL)

        for message in pubsub.listen():
            if message['type'] == 'message':
                event = json.loads(message['data'])
                entity = event['entity']
                entity_id = event['id']

                # Delete from local cache
                r.delete(f"{entity}:{entity_id}")
                print(f"Invalidated cache: {entity}:{entity_id}")

    thread = threading.Thread(target=listen, daemon=True)
    thread.start()
    return thread
```

## Approach 2: PostgreSQL NOTIFY for Direct Cache Invalidation

PostgreSQL triggers can send NOTIFY messages that a listener bridges to Redis:

```sql
-- Create a trigger function that fires on table changes
CREATE OR REPLACE FUNCTION notify_cache_invalidation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM pg_notify(
            'cache_invalidation',
            json_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'id', OLD.id
            )::text
        );
        RETURN OLD;
    ELSE
        PERFORM pg_notify(
            'cache_invalidation',
            json_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'id', NEW.id
            )::text
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to users table
CREATE TRIGGER users_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();

-- Attach to products table
CREATE TRIGGER products_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();
```

Python listener that bridges NOTIFY to Redis cache invalidation:

```python
import psycopg2
import psycopg2.extensions
import redis
import json
import select
import logging

logger = logging.getLogger(__name__)

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

KEY_PATTERNS = {
    'users': lambda id: [f"user:{id}", f"user:{id}:*"],
    'products': lambda id: [f"product:{id}", f"products:list:*"],
    'orders': lambda id: [f"order:{id}", f"user:orders:*"],
}

def handle_notification(payload: str):
    event = json.loads(payload)
    table = event.get('table')
    entity_id = event.get('id')

    patterns = KEY_PATTERNS.get(table)
    if not patterns:
        return

    for pattern in patterns(entity_id):
        if '*' in pattern:
            # Use SCAN to safely delete matching keys
            keys = list(r.scan_iter(pattern))
            if keys:
                r.delete(*keys)
                logger.info(f"Invalidated {len(keys)} keys matching {pattern}")
        else:
            r.delete(pattern)
            logger.info(f"Invalidated cache key: {pattern}")

def start_pg_notify_listener():
    pg = psycopg2.connect("postgresql://user:password@localhost/mydb")
    pg.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

    with pg.cursor() as cur:
        cur.execute("LISTEN cache_invalidation;")

    logger.info("Listening for PostgreSQL NOTIFY messages...")

    while True:
        if select.select([pg], [], [], 5) == ([], [], []):
            continue  # Timeout - keep polling

        pg.poll()
        while pg.notifies:
            notify = pg.notifies.pop(0)
            handle_notification(notify.payload)

if __name__ == '__main__':
    start_pg_notify_listener()
```

## Approach 3: Debezium CDC (Change Data Capture)

For production-grade synchronization, use Debezium to stream PostgreSQL WAL changes to Kafka, then consume and update Redis:

Configure Debezium PostgreSQL connector:

```json
{
  "name": "postgres-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "replication_user",
    "database.password": "password",
    "database.dbname": "myapp",
    "topic.prefix": "myapp",
    "table.include.list": "public.users,public.products",
    "plugin.name": "pgoutput",
    "slot.name": "debezium",
    "publication.autocreate.mode": "filtered"
  }
}
```

Kafka consumer that updates Redis:

```python
from kafka import KafkaConsumer
import redis
import json
import logging

logger = logging.getLogger(__name__)
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

consumer = KafkaConsumer(
    'myapp.public.users',
    'myapp.public.products',
    bootstrap_servers=['kafka:9092'],
    value_deserializer=lambda v: json.loads(v.decode('utf-8')),
    group_id='redis-cache-sync',
    auto_offset_reset='latest'
)

def process_cdc_event(topic: str, value: dict):
    op = value.get('op')  # c=create, u=update, d=delete, r=read(snapshot)
    after = value.get('after')
    before = value.get('before')

    if 'users' in topic:
        entity = 'user'
        entity_id = (after or before or {}).get('id')
    elif 'products' in topic:
        entity = 'product'
        entity_id = (after or before or {}).get('id')
    else:
        return

    if entity_id is None:
        return

    if op == 'd':
        # Delete: remove from cache
        r.delete(f"{entity}:{entity_id}")
        logger.info(f"CDC DELETE: removed {entity}:{entity_id} from cache")
    elif op in ('c', 'u') and after:
        # Create/Update: update cache with new value
        r.setex(f"{entity}:{entity_id}", 3600, json.dumps(after))
        logger.info(f"CDC {op.upper()}: updated {entity}:{entity_id} in cache")

for message in consumer:
    process_cdc_event(message.topic, message.value)
```

## Choosing the Right Approach

| Approach | Complexity | Latency | Reliability | Best For |
|----------|-----------|---------|-------------|----------|
| App-level events | Low | Low | Medium | Single service writes |
| PG NOTIFY + Listener | Medium | Low | Medium | Multi-service, same DB |
| Debezium CDC | High | Low | High | Microservices, multi-DB |

## Summary

Keeping Redis cache in sync with PostgreSQL changes requires a strategy beyond simple application-level invalidation. For single-service architectures, PostgreSQL NOTIFY triggers with a listener process provide reliable synchronization without external infrastructure. For microservices or multi-writer environments, Debezium CDC with Kafka provides production-grade streaming change capture with guaranteed delivery. Always design for eventual consistency - accept that there is a brief window where Redis may hold stale data, and set appropriate TTLs as a safety net regardless of the synchronization approach used.
