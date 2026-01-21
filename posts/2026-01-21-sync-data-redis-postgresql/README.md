# How to Sync Data Between Redis and PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PostgreSQL, Data Sync, Change Data Capture, Dual-Write, Caching, Database

Description: A comprehensive guide to synchronizing data between Redis and PostgreSQL using dual-write patterns, change data capture, and event-driven synchronization strategies.

---

Keeping Redis cache and PostgreSQL database in sync is a common challenge in modern applications. This guide covers practical patterns and implementations for maintaining data consistency between these two systems.

## Why Sync Redis and PostgreSQL?

Redis serves as an excellent caching layer for PostgreSQL data, but maintaining consistency between them requires careful design:

- **Performance**: Redis provides sub-millisecond reads while PostgreSQL handles durable storage
- **Scalability**: Offload read traffic from PostgreSQL to Redis
- **Availability**: Continue serving cached data during PostgreSQL maintenance

## Pattern 1: Cache-Aside with TTL

The simplest approach - read from cache first, fall back to database:

```python
import redis
import psycopg2
import json
from typing import Optional, Dict, Any

class CacheAsideSync:
    def __init__(self, redis_client: redis.Redis, pg_connection):
        self.redis = redis_client
        self.pg = pg_connection
        self.default_ttl = 3600  # 1 hour

    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        cache_key = f"user:{user_id}"

        # Try cache first
        cached = self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # Cache miss - fetch from PostgreSQL
        cursor = self.pg.cursor()
        cursor.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        cursor.close()

        if row:
            user = {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "created_at": row[3].isoformat()
            }
            # Populate cache
            self.redis.setex(cache_key, self.default_ttl, json.dumps(user))
            return user

        return None

    def update_user(self, user_id: int, name: str, email: str) -> bool:
        cache_key = f"user:{user_id}"

        # Update PostgreSQL first
        cursor = self.pg.cursor()
        try:
            cursor.execute(
                "UPDATE users SET name = %s, email = %s WHERE id = %s",
                (name, email, user_id)
            )
            self.pg.commit()

            # Invalidate cache
            self.redis.delete(cache_key)

            return True
        except Exception as e:
            self.pg.rollback()
            raise e
        finally:
            cursor.close()
```

## Pattern 2: Dual-Write Pattern

Write to both systems simultaneously for stronger consistency:

```python
import redis
import psycopg2
import json
import logging
from contextlib import contextmanager
from typing import Dict, Any

logger = logging.getLogger(__name__)

class DualWriteSync:
    def __init__(self, redis_client: redis.Redis, pg_connection):
        self.redis = redis_client
        self.pg = pg_connection

    @contextmanager
    def transaction(self):
        """Context manager for PostgreSQL transactions."""
        cursor = self.pg.cursor()
        try:
            yield cursor
            self.pg.commit()
        except Exception:
            self.pg.rollback()
            raise
        finally:
            cursor.close()

    def create_user(self, user_data: Dict[str, Any]) -> int:
        cache_key = f"user:{user_data.get('id', 'temp')}"

        with self.transaction() as cursor:
            # Write to PostgreSQL
            cursor.execute(
                """
                INSERT INTO users (name, email)
                VALUES (%s, %s)
                RETURNING id, created_at
                """,
                (user_data["name"], user_data["email"])
            )
            row = cursor.fetchone()
            user_id = row[0]
            created_at = row[1]

            # Prepare cache data
            cache_data = {
                "id": user_id,
                "name": user_data["name"],
                "email": user_data["email"],
                "created_at": created_at.isoformat()
            }

            # Write to Redis within the same logical operation
            cache_key = f"user:{user_id}"
            try:
                self.redis.setex(cache_key, 3600, json.dumps(cache_data))
            except redis.RedisError as e:
                # Log but do not fail - PostgreSQL is source of truth
                logger.warning(f"Redis write failed: {e}")

            return user_id

    def update_user_atomic(self, user_id: int, updates: Dict[str, Any]) -> bool:
        """Update with compensation on failure."""
        cache_key = f"user:{user_id}"

        # Get current state for potential rollback
        old_cache = self.redis.get(cache_key)

        with self.transaction() as cursor:
            # Build dynamic UPDATE query
            set_clauses = ", ".join(f"{k} = %s" for k in updates.keys())
            values = list(updates.values()) + [user_id]

            cursor.execute(
                f"UPDATE users SET {set_clauses} WHERE id = %s RETURNING *",
                values
            )
            row = cursor.fetchone()

            if not row:
                return False

            # Update Redis
            new_cache_data = {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "created_at": row[3].isoformat()
            }

            try:
                self.redis.setex(cache_key, 3600, json.dumps(new_cache_data))
            except redis.RedisError as e:
                logger.warning(f"Redis update failed: {e}")
                # Consider compensation strategies here

            return True
```

## Pattern 3: Change Data Capture with PostgreSQL Listen/Notify

Use PostgreSQL's built-in notification system for real-time sync:

```sql
-- Create notification trigger in PostgreSQL
CREATE OR REPLACE FUNCTION notify_user_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM pg_notify('user_changes', json_build_object(
            'operation', TG_OP,
            'id', OLD.id
        )::text);
        RETURN OLD;
    ELSE
        PERFORM pg_notify('user_changes', json_build_object(
            'operation', TG_OP,
            'id', NEW.id,
            'name', NEW.name,
            'email', NEW.email,
            'created_at', NEW.created_at
        )::text);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION notify_user_change();
```

```python
import redis
import psycopg2
import psycopg2.extensions
import select
import json
import threading
import logging

logger = logging.getLogger(__name__)

class CDCSync:
    def __init__(self, redis_client: redis.Redis, pg_dsn: str):
        self.redis = redis_client
        self.pg_dsn = pg_dsn
        self.running = False
        self.listener_thread = None

    def start(self):
        """Start the CDC listener in a background thread."""
        self.running = True
        self.listener_thread = threading.Thread(target=self._listen_loop)
        self.listener_thread.daemon = True
        self.listener_thread.start()
        logger.info("CDC listener started")

    def stop(self):
        """Stop the CDC listener."""
        self.running = False
        if self.listener_thread:
            self.listener_thread.join(timeout=5)
        logger.info("CDC listener stopped")

    def _listen_loop(self):
        """Main listening loop for PostgreSQL notifications."""
        conn = psycopg2.connect(self.pg_dsn)
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

        cursor = conn.cursor()
        cursor.execute("LISTEN user_changes;")

        while self.running:
            # Wait for notifications with timeout
            if select.select([conn], [], [], 5) == ([], [], []):
                continue

            conn.poll()
            while conn.notifies:
                notify = conn.notifies.pop(0)
                self._handle_notification(notify.payload)

        cursor.close()
        conn.close()

    def _handle_notification(self, payload: str):
        """Process a single notification and update Redis."""
        try:
            data = json.loads(payload)
            operation = data.get("operation")
            user_id = data.get("id")
            cache_key = f"user:{user_id}"

            if operation == "DELETE":
                self.redis.delete(cache_key)
                logger.debug(f"Deleted cache key: {cache_key}")
            else:
                # INSERT or UPDATE
                cache_data = {
                    "id": user_id,
                    "name": data.get("name"),
                    "email": data.get("email"),
                    "created_at": data.get("created_at")
                }
                self.redis.setex(cache_key, 3600, json.dumps(cache_data))
                logger.debug(f"Updated cache key: {cache_key}")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse notification: {e}")
        except redis.RedisError as e:
            logger.error(f"Redis error during sync: {e}")
```

## Pattern 4: Event-Driven Sync with Message Queue

For high-throughput systems, use a message queue for decoupled synchronization:

```python
import redis
import psycopg2
import json
from typing import Dict, Any

class EventDrivenSync:
    def __init__(self, redis_client: redis.Redis, pg_connection):
        self.redis = redis_client
        self.pg = pg_connection
        self.event_stream = "db:events"

    def write_with_event(self, user_data: Dict[str, Any]) -> int:
        """Write to PostgreSQL and emit event to Redis Stream."""
        cursor = self.pg.cursor()

        try:
            cursor.execute(
                """
                INSERT INTO users (name, email)
                VALUES (%s, %s)
                RETURNING id, name, email, created_at
                """,
                (user_data["name"], user_data["email"])
            )
            row = cursor.fetchone()
            self.pg.commit()

            # Emit event to Redis Stream
            event = {
                "type": "user_created",
                "data": json.dumps({
                    "id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "created_at": row[3].isoformat()
                })
            }
            self.redis.xadd(self.event_stream, event, maxlen=10000)

            return row[0]
        except Exception:
            self.pg.rollback()
            raise
        finally:
            cursor.close()

    def process_events(self, consumer_group: str, consumer_name: str):
        """Process events from Redis Stream to update cache."""
        # Create consumer group if not exists
        try:
            self.redis.xgroup_create(
                self.event_stream,
                consumer_group,
                id="0",
                mkstream=True
            )
        except redis.ResponseError:
            pass  # Group already exists

        while True:
            # Read events
            events = self.redis.xreadgroup(
                consumer_group,
                consumer_name,
                {self.event_stream: ">"},
                count=100,
                block=5000
            )

            for stream, messages in events:
                for message_id, data in messages:
                    self._process_event(data)
                    # Acknowledge message
                    self.redis.xack(self.event_stream, consumer_group, message_id)

    def _process_event(self, event_data: Dict[bytes, bytes]):
        """Process a single event and update cache."""
        event_type = event_data[b"type"].decode()
        data = json.loads(event_data[b"data"].decode())

        if event_type == "user_created":
            cache_key = f"user:{data['id']}"
            self.redis.setex(cache_key, 3600, json.dumps(data))
        elif event_type == "user_updated":
            cache_key = f"user:{data['id']}"
            self.redis.setex(cache_key, 3600, json.dumps(data))
        elif event_type == "user_deleted":
            cache_key = f"user:{data['id']}"
            self.redis.delete(cache_key)
```

## Pattern 5: Batch Synchronization

For initial population or periodic full sync:

```python
import redis
import psycopg2
import json
import logging
from typing import Iterator, Dict, Any

logger = logging.getLogger(__name__)

class BatchSync:
    def __init__(self, redis_client: redis.Redis, pg_connection):
        self.redis = redis_client
        self.pg = pg_connection
        self.batch_size = 1000

    def _fetch_users_batch(self, offset: int) -> Iterator[Dict[str, Any]]:
        """Fetch a batch of users from PostgreSQL."""
        cursor = self.pg.cursor()
        cursor.execute(
            """
            SELECT id, name, email, created_at
            FROM users
            ORDER BY id
            LIMIT %s OFFSET %s
            """,
            (self.batch_size, offset)
        )

        for row in cursor:
            yield {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "created_at": row[3].isoformat()
            }

        cursor.close()

    def full_sync(self) -> int:
        """Perform a full synchronization from PostgreSQL to Redis."""
        offset = 0
        total_synced = 0

        while True:
            users = list(self._fetch_users_batch(offset))

            if not users:
                break

            # Use pipeline for efficient batch writes
            pipe = self.redis.pipeline()

            for user in users:
                cache_key = f"user:{user['id']}"
                pipe.setex(cache_key, 3600, json.dumps(user))

            pipe.execute()

            total_synced += len(users)
            offset += self.batch_size

            logger.info(f"Synced {total_synced} users")

        return total_synced

    def incremental_sync(self, since_timestamp: str) -> int:
        """Sync only records modified since a given timestamp."""
        cursor = self.pg.cursor()
        cursor.execute(
            """
            SELECT id, name, email, created_at, updated_at
            FROM users
            WHERE updated_at > %s
            ORDER BY updated_at
            """,
            (since_timestamp,)
        )

        pipe = self.redis.pipeline()
        count = 0

        for row in cursor:
            user = {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "created_at": row[3].isoformat(),
                "updated_at": row[4].isoformat()
            }
            cache_key = f"user:{user['id']}"
            pipe.setex(cache_key, 3600, json.dumps(user))
            count += 1

            # Execute in batches
            if count % 1000 == 0:
                pipe.execute()
                pipe = self.redis.pipeline()

        pipe.execute()
        cursor.close()

        return count
```

## Handling Sync Failures

Implement retry logic and dead letter handling:

```python
import redis
import json
import time
import logging
from functools import wraps
from typing import Callable, Any

logger = logging.getLogger(__name__)

def retry_with_backoff(max_retries: int = 3, base_delay: float = 1.0):
    """Decorator for retrying operations with exponential backoff."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_exception = None

            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (redis.RedisError, Exception) as e:
                    last_exception = e
                    delay = base_delay * (2 ** attempt)
                    logger.warning(
                        f"Attempt {attempt + 1} failed: {e}. "
                        f"Retrying in {delay}s"
                    )
                    time.sleep(delay)

            raise last_exception
        return wrapper
    return decorator

class ResilientSync:
    def __init__(self, redis_client: redis.Redis, pg_connection):
        self.redis = redis_client
        self.pg = pg_connection
        self.dead_letter_key = "sync:dead_letter"

    @retry_with_backoff(max_retries=3)
    def sync_user(self, user_id: int):
        """Sync a single user with retry logic."""
        cursor = self.pg.cursor()
        cursor.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        cursor.close()

        if row:
            user = {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "created_at": row[3].isoformat()
            }
            cache_key = f"user:{user_id}"
            self.redis.setex(cache_key, 3600, json.dumps(user))

    def sync_with_dead_letter(self, user_id: int):
        """Sync with dead letter queue for permanent failures."""
        try:
            self.sync_user(user_id)
        except Exception as e:
            # Send to dead letter queue
            dead_letter = {
                "user_id": user_id,
                "error": str(e),
                "timestamp": time.time()
            }
            self.redis.lpush(self.dead_letter_key, json.dumps(dead_letter))
            logger.error(f"Sync failed for user {user_id}, added to dead letter")

    def process_dead_letters(self):
        """Reprocess items from dead letter queue."""
        while True:
            item = self.redis.rpop(self.dead_letter_key)
            if not item:
                break

            data = json.loads(item)
            try:
                self.sync_user(data["user_id"])
                logger.info(f"Recovered user {data['user_id']} from dead letter")
            except Exception as e:
                # Put back at end of queue with updated timestamp
                data["timestamp"] = time.time()
                data["retry_count"] = data.get("retry_count", 0) + 1

                if data["retry_count"] < 5:
                    self.redis.lpush(self.dead_letter_key, json.dumps(data))
                else:
                    logger.error(f"Permanent failure for user {data['user_id']}")
```

## Monitoring Sync Health

Track synchronization metrics:

```python
import redis
import time
from dataclasses import dataclass
from typing import Dict

@dataclass
class SyncMetrics:
    total_synced: int = 0
    sync_errors: int = 0
    avg_sync_time_ms: float = 0.0
    last_sync_timestamp: float = 0.0

class MonitoredSync:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.metrics_key = "sync:metrics"

    def record_sync(self, duration_ms: float, success: bool):
        """Record sync operation metrics."""
        pipe = self.redis.pipeline()

        if success:
            pipe.hincrby(self.metrics_key, "total_synced", 1)
        else:
            pipe.hincrby(self.metrics_key, "sync_errors", 1)

        pipe.hset(self.metrics_key, "last_sync_timestamp", time.time())
        pipe.lpush("sync:durations", duration_ms)
        pipe.ltrim("sync:durations", 0, 999)  # Keep last 1000

        pipe.execute()

    def get_metrics(self) -> Dict:
        """Get current sync metrics."""
        pipe = self.redis.pipeline()
        pipe.hgetall(self.metrics_key)
        pipe.lrange("sync:durations", 0, -1)

        results = pipe.execute()
        metrics = results[0]
        durations = [float(d) for d in results[1]]

        return {
            "total_synced": int(metrics.get(b"total_synced", 0)),
            "sync_errors": int(metrics.get(b"sync_errors", 0)),
            "avg_sync_time_ms": sum(durations) / len(durations) if durations else 0,
            "last_sync_timestamp": float(metrics.get(b"last_sync_timestamp", 0))
        }
```

## Best Practices

1. **Choose PostgreSQL as source of truth** - Always write to PostgreSQL first
2. **Use TTLs on cache entries** - Prevents stale data from persisting indefinitely
3. **Implement idempotent sync operations** - Safe for retries and duplicate events
4. **Monitor sync lag** - Track the delay between database writes and cache updates
5. **Handle partial failures gracefully** - Use dead letter queues and compensating transactions
6. **Test failure scenarios** - Simulate Redis and PostgreSQL failures in staging

## Conclusion

Synchronizing Redis and PostgreSQL requires careful consideration of consistency requirements, failure handling, and performance trade-offs. Start with the cache-aside pattern for simplicity, and evolve to CDC or event-driven patterns as your needs grow. Always prioritize PostgreSQL as the source of truth and design for eventual consistency in the cache layer.
