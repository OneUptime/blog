# How to Keep Redis and Elasticsearch in Sync

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Elasticsearch, Data Sync, Cache Invalidation, Search Index, Event-Driven, Dual-Write

Description: A comprehensive guide to synchronizing Redis cache and Elasticsearch search indexes using event-driven patterns, dual-write strategies, and change data capture.

---

Keeping Redis cache and Elasticsearch search indexes synchronized is crucial for applications that need both fast caching and powerful search capabilities. This guide covers practical patterns for maintaining consistency between these systems.

## Why Sync Redis and Elasticsearch?

Modern applications often use Redis and Elasticsearch together:

- **Redis**: Fast key-value lookups, session storage, caching
- **Elasticsearch**: Full-text search, aggregations, analytics

The challenge is ensuring both systems reflect the same data state.

## Architecture Overview

```
                    +------------------+
                    |   Application    |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
       +------v------+              +-------v-------+
       |    Redis    |              | Elasticsearch |
       |   (Cache)   |              |   (Search)    |
       +-------------+              +---------------+
```

## Pattern 1: Dual-Write Pattern

Write to both systems in the same operation:

```python
import redis
import json
from elasticsearch import Elasticsearch
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class DualWriteSync:
    def __init__(self, redis_client: redis.Redis, es_client: Elasticsearch):
        self.redis = redis_client
        self.es = es_client
        self.index_name = "products"
        self.cache_ttl = 3600

    def create_product(self, product: Dict[str, Any]) -> bool:
        """Create product in both Redis and Elasticsearch."""
        product_id = product["id"]
        cache_key = f"product:{product_id}"

        try:
            # Write to Elasticsearch first (source of truth for search)
            self.es.index(
                index=self.index_name,
                id=product_id,
                document=product,
                refresh=True  # Make immediately searchable
            )

            # Write to Redis cache
            self.redis.setex(
                cache_key,
                self.cache_ttl,
                json.dumps(product)
            )

            logger.info(f"Created product {product_id} in both systems")
            return True

        except Exception as e:
            logger.error(f"Failed to create product {product_id}: {e}")
            # Cleanup on partial failure
            self._cleanup_failed_create(product_id)
            raise

    def update_product(self, product_id: str, updates: Dict[str, Any]) -> bool:
        """Update product in both systems."""
        cache_key = f"product:{product_id}"

        try:
            # Update Elasticsearch
            self.es.update(
                index=self.index_name,
                id=product_id,
                doc=updates,
                refresh=True
            )

            # Invalidate Redis cache (will be repopulated on next read)
            self.redis.delete(cache_key)

            logger.info(f"Updated product {product_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to update product {product_id}: {e}")
            raise

    def delete_product(self, product_id: str) -> bool:
        """Delete product from both systems."""
        cache_key = f"product:{product_id}"

        try:
            # Delete from Elasticsearch
            self.es.delete(
                index=self.index_name,
                id=product_id,
                refresh=True
            )

            # Delete from Redis
            self.redis.delete(cache_key)

            logger.info(f"Deleted product {product_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete product {product_id}: {e}")
            raise

    def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get product with cache-aside pattern."""
        cache_key = f"product:{product_id}"

        # Try cache first
        cached = self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # Cache miss - fetch from Elasticsearch
        try:
            result = self.es.get(index=self.index_name, id=product_id)
            product = result["_source"]

            # Populate cache
            self.redis.setex(cache_key, self.cache_ttl, json.dumps(product))

            return product

        except Exception as e:
            logger.error(f"Failed to get product {product_id}: {e}")
            return None

    def _cleanup_failed_create(self, product_id: str):
        """Cleanup after failed dual-write."""
        cache_key = f"product:{product_id}"

        try:
            self.redis.delete(cache_key)
        except Exception:
            pass

        try:
            self.es.delete(index=self.index_name, id=product_id)
        except Exception:
            pass
```

## Pattern 2: Event-Driven Sync with Redis Streams

Use Redis Streams as an event bus for decoupled synchronization:

```python
import redis
import json
import time
import threading
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class EventDrivenSync:
    def __init__(self, redis_client: redis.Redis, es_client: Elasticsearch):
        self.redis = redis_client
        self.es = es_client
        self.event_stream = "sync:events"
        self.index_name = "products"
        self.consumer_group = "es_sync"
        self.running = False

    def emit_event(self, event_type: str, entity_type: str,
                   entity_id: str, data: Dict[str, Any]) -> str:
        """Emit sync event to Redis Stream."""
        event = {
            "event_type": event_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "data": json.dumps(data),
            "timestamp": str(time.time())
        }

        stream_id = self.redis.xadd(
            self.event_stream,
            event,
            maxlen=100000
        )

        return stream_id.decode() if isinstance(stream_id, bytes) else stream_id

    def create_product(self, product: Dict[str, Any]) -> str:
        """Create product and emit event."""
        product_id = product["id"]
        cache_key = f"product:{product_id}"

        # Write to Redis cache
        self.redis.setex(cache_key, 3600, json.dumps(product))

        # Emit event for Elasticsearch sync
        event_id = self.emit_event("created", "product", product_id, product)

        return event_id

    def update_product(self, product_id: str, updates: Dict[str, Any]) -> str:
        """Update product and emit event."""
        cache_key = f"product:{product_id}"

        # Invalidate cache
        self.redis.delete(cache_key)

        # Emit event
        return self.emit_event("updated", "product", product_id, updates)

    def delete_product(self, product_id: str) -> str:
        """Delete product and emit event."""
        cache_key = f"product:{product_id}"

        # Delete from cache
        self.redis.delete(cache_key)

        # Emit event
        return self.emit_event("deleted", "product", product_id, {})

    def start_sync_consumer(self, consumer_name: str = "sync_worker"):
        """Start background consumer for Elasticsearch sync."""
        # Create consumer group
        try:
            self.redis.xgroup_create(
                self.event_stream,
                self.consumer_group,
                id="0",
                mkstream=True
            )
        except redis.ResponseError:
            pass  # Group exists

        self.running = True
        thread = threading.Thread(
            target=self._consume_events,
            args=(consumer_name,)
        )
        thread.daemon = True
        thread.start()
        logger.info("Started Elasticsearch sync consumer")

    def stop_sync_consumer(self):
        """Stop the sync consumer."""
        self.running = False

    def _consume_events(self, consumer_name: str):
        """Consume events and sync to Elasticsearch."""
        batch = []
        batch_size = 100
        flush_interval = 5  # seconds
        last_flush = time.time()

        while self.running:
            try:
                messages = self.redis.xreadgroup(
                    self.consumer_group,
                    consumer_name,
                    {self.event_stream: ">"},
                    count=batch_size,
                    block=1000
                )

                if messages:
                    for stream, entries in messages:
                        for message_id, data in entries:
                            event = self._decode_event(data)
                            event["_message_id"] = message_id
                            batch.append(event)

                # Flush batch if full or timeout
                current_time = time.time()
                if len(batch) >= batch_size or (batch and current_time - last_flush > flush_interval):
                    self._flush_batch(batch)
                    batch = []
                    last_flush = current_time

            except redis.RedisError as e:
                logger.error(f"Redis error in consumer: {e}")
                time.sleep(1)

    def _decode_event(self, data: Dict[bytes, bytes]) -> Dict[str, Any]:
        """Decode event data from Redis."""
        decoded = {
            k.decode() if isinstance(k, bytes) else k:
            v.decode() if isinstance(v, bytes) else v
            for k, v in data.items()
        }
        decoded["data"] = json.loads(decoded["data"])
        return decoded

    def _flush_batch(self, batch: List[Dict[str, Any]]):
        """Flush batch of events to Elasticsearch."""
        if not batch:
            return

        actions = []
        message_ids = []

        for event in batch:
            message_ids.append(event["_message_id"])

            if event["entity_type"] == "product":
                if event["event_type"] == "created":
                    actions.append({
                        "_op_type": "index",
                        "_index": self.index_name,
                        "_id": event["entity_id"],
                        "_source": event["data"]
                    })
                elif event["event_type"] == "updated":
                    actions.append({
                        "_op_type": "update",
                        "_index": self.index_name,
                        "_id": event["entity_id"],
                        "doc": event["data"]
                    })
                elif event["event_type"] == "deleted":
                    actions.append({
                        "_op_type": "delete",
                        "_index": self.index_name,
                        "_id": event["entity_id"]
                    })

        if actions:
            try:
                success, errors = bulk(self.es, actions, raise_on_error=False)
                logger.info(f"Synced {success} documents to Elasticsearch")

                if errors:
                    logger.error(f"Elasticsearch sync errors: {errors}")

            except Exception as e:
                logger.error(f"Bulk sync failed: {e}")
                return

        # Acknowledge processed messages
        if message_ids:
            self.redis.xack(self.event_stream, self.consumer_group, *message_ids)
```

## Pattern 3: Cache Invalidation with Pub/Sub

Use Redis Pub/Sub for immediate cache invalidation:

```python
import redis
import json
import threading
from elasticsearch import Elasticsearch
from typing import Dict, Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)

class PubSubInvalidator:
    def __init__(self, redis_client: redis.Redis, es_client: Elasticsearch):
        self.redis = redis_client
        self.es = es_client
        self.channel = "cache:invalidation"
        self.subscriber = None
        self.running = False

    def invalidate(self, entity_type: str, entity_id: str,
                   action: str, data: Optional[Dict] = None):
        """Publish invalidation message."""
        message = {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "data": data,
            "timestamp": str(__import__('time').time())
        }

        self.redis.publish(self.channel, json.dumps(message))

    def start_listener(self, handlers: Dict[str, Callable]):
        """Start listening for invalidation messages."""
        self.running = True
        self.subscriber = self.redis.pubsub()
        self.subscriber.subscribe(self.channel)

        thread = threading.Thread(
            target=self._listen,
            args=(handlers,)
        )
        thread.daemon = True
        thread.start()

    def stop_listener(self):
        """Stop the invalidation listener."""
        self.running = False
        if self.subscriber:
            self.subscriber.unsubscribe()
            self.subscriber.close()

    def _listen(self, handlers: Dict[str, Callable]):
        """Listen for invalidation messages."""
        for message in self.subscriber.listen():
            if not self.running:
                break

            if message["type"] != "message":
                continue

            try:
                data = json.loads(message["data"])
                entity_type = data["entity_type"]

                if entity_type in handlers:
                    handlers[entity_type](data)

            except Exception as e:
                logger.error(f"Error handling invalidation: {e}")

class SyncManager:
    def __init__(self, redis_client: redis.Redis, es_client: Elasticsearch):
        self.redis = redis_client
        self.es = es_client
        self.invalidator = PubSubInvalidator(redis_client, es_client)
        self.index_name = "products"

    def start(self):
        """Start sync manager."""
        handlers = {
            "product": self._handle_product_invalidation
        }
        self.invalidator.start_listener(handlers)

    def stop(self):
        """Stop sync manager."""
        self.invalidator.stop_listener()

    def update_product(self, product_id: str, updates: Dict[str, Any]) -> bool:
        """Update product with cache invalidation."""
        # Update Elasticsearch
        self.es.update(
            index=self.index_name,
            id=product_id,
            doc=updates,
            refresh=True
        )

        # Publish invalidation
        self.invalidator.invalidate(
            "product",
            product_id,
            "update",
            updates
        )

        return True

    def _handle_product_invalidation(self, message: Dict):
        """Handle product cache invalidation."""
        product_id = message["entity_id"]
        action = message["action"]
        cache_key = f"product:{product_id}"

        if action in ("update", "delete"):
            self.redis.delete(cache_key)
            logger.debug(f"Invalidated cache for product {product_id}")
```

## Pattern 4: Batch Synchronization

Periodically sync data in batches for consistency:

```python
import redis
import json
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk, scan
from typing import Dict, Any, Iterator
import logging

logger = logging.getLogger(__name__)

class BatchSynchronizer:
    def __init__(self, redis_client: redis.Redis, es_client: Elasticsearch):
        self.redis = redis_client
        self.es = es_client
        self.index_name = "products"

    def full_sync_es_to_redis(self, batch_size: int = 1000) -> int:
        """Sync all Elasticsearch documents to Redis cache."""
        synced = 0

        # Scan all documents in Elasticsearch
        query = {"query": {"match_all": {}}}

        for doc in scan(self.es, index=self.index_name, query=query):
            product_id = doc["_id"]
            product = doc["_source"]
            cache_key = f"product:{product_id}"

            self.redis.setex(cache_key, 3600, json.dumps(product))
            synced += 1

            if synced % 1000 == 0:
                logger.info(f"Synced {synced} documents")

        logger.info(f"Full sync completed: {synced} documents")
        return synced

    def full_sync_redis_to_es(self, pattern: str = "product:*",
                              batch_size: int = 500) -> int:
        """Sync Redis cache to Elasticsearch."""
        synced = 0
        actions = []

        cursor = 0
        while True:
            cursor, keys = self.redis.scan(
                cursor=cursor,
                match=pattern,
                count=batch_size
            )

            for key in keys:
                key_str = key.decode() if isinstance(key, bytes) else key
                value = self.redis.get(key_str)

                if value:
                    product = json.loads(value)
                    product_id = key_str.split(":")[-1]

                    actions.append({
                        "_op_type": "index",
                        "_index": self.index_name,
                        "_id": product_id,
                        "_source": product
                    })

                    if len(actions) >= batch_size:
                        success, _ = bulk(self.es, actions)
                        synced += success
                        actions = []
                        logger.info(f"Synced {synced} documents")

            if cursor == 0:
                break

        # Flush remaining
        if actions:
            success, _ = bulk(self.es, actions)
            synced += success

        logger.info(f"Full sync completed: {synced} documents")
        return synced

    def compare_and_sync(self) -> Dict[str, int]:
        """Compare both systems and sync differences."""
        stats = {"synced": 0, "missing_in_es": 0, "missing_in_redis": 0}

        # Get all keys from Redis
        redis_keys = set()
        cursor = 0
        while True:
            cursor, keys = self.redis.scan(cursor=cursor, match="product:*", count=1000)
            for key in keys:
                key_str = key.decode() if isinstance(key, bytes) else key
                product_id = key_str.split(":")[-1]
                redis_keys.add(product_id)
            if cursor == 0:
                break

        # Get all IDs from Elasticsearch
        es_ids = set()
        query = {"query": {"match_all": {}}, "_source": False}
        for doc in scan(self.es, index=self.index_name, query=query):
            es_ids.add(doc["_id"])

        # Find differences
        missing_in_es = redis_keys - es_ids
        missing_in_redis = es_ids - redis_keys

        stats["missing_in_es"] = len(missing_in_es)
        stats["missing_in_redis"] = len(missing_in_redis)

        # Sync missing in Elasticsearch
        for product_id in missing_in_es:
            cache_key = f"product:{product_id}"
            value = self.redis.get(cache_key)
            if value:
                product = json.loads(value)
                self.es.index(index=self.index_name, id=product_id, document=product)
                stats["synced"] += 1

        # Sync missing in Redis
        for product_id in missing_in_redis:
            try:
                result = self.es.get(index=self.index_name, id=product_id)
                product = result["_source"]
                cache_key = f"product:{product_id}"
                self.redis.setex(cache_key, 3600, json.dumps(product))
                stats["synced"] += 1
            except Exception:
                pass

        return stats
```

## Pattern 5: Search Results Caching

Cache Elasticsearch search results in Redis:

```python
import redis
import json
import hashlib
from elasticsearch import Elasticsearch
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class CachedSearch:
    def __init__(self, redis_client: redis.Redis, es_client: Elasticsearch):
        self.redis = redis_client
        self.es = es_client
        self.index_name = "products"
        self.cache_ttl = 300  # 5 minutes for search results

    def _cache_key(self, query: Dict[str, Any]) -> str:
        """Generate cache key from search query."""
        query_json = json.dumps(query, sort_keys=True)
        query_hash = hashlib.md5(query_json.encode()).hexdigest()
        return f"search:{self.index_name}:{query_hash}"

    def search(self, query: Dict[str, Any], use_cache: bool = True) -> Dict[str, Any]:
        """Execute search with optional caching."""
        cache_key = self._cache_key(query)

        # Try cache first
        if use_cache:
            cached = self.redis.get(cache_key)
            if cached:
                logger.debug(f"Cache hit for search query")
                return json.loads(cached)

        # Execute search
        result = self.es.search(index=self.index_name, body=query)

        # Cache result
        if use_cache:
            self.redis.setex(cache_key, self.cache_ttl, json.dumps(result))

        return result

    def invalidate_search_cache(self):
        """Invalidate all search cache entries."""
        cursor = 0
        deleted = 0

        while True:
            cursor, keys = self.redis.scan(
                cursor=cursor,
                match=f"search:{self.index_name}:*",
                count=100
            )

            if keys:
                self.redis.delete(*keys)
                deleted += len(keys)

            if cursor == 0:
                break

        logger.info(f"Invalidated {deleted} search cache entries")
        return deleted

    def search_with_item_cache(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search and cache individual result items."""
        result = self.search(query, use_cache=False)
        hits = result.get("hits", {}).get("hits", [])

        products = []
        pipe = self.redis.pipeline()

        for hit in hits:
            product_id = hit["_id"]
            product = hit["_source"]
            cache_key = f"product:{product_id}"

            # Cache individual product
            pipe.setex(cache_key, 3600, json.dumps(product))
            products.append(product)

        pipe.execute()

        return products
```

## Monitoring Sync Health

Track synchronization status and lag:

```python
import redis
from elasticsearch import Elasticsearch
import time
from dataclasses import dataclass
from typing import Dict

@dataclass
class SyncHealth:
    redis_count: int
    es_count: int
    in_sync: bool
    lag_count: int
    last_check: float

class SyncMonitor:
    def __init__(self, redis_client: redis.Redis, es_client: Elasticsearch):
        self.redis = redis_client
        self.es = es_client
        self.index_name = "products"

    def check_health(self) -> SyncHealth:
        """Check synchronization health."""
        # Count Redis keys
        redis_count = 0
        cursor = 0
        while True:
            cursor, keys = self.redis.scan(cursor=cursor, match="product:*", count=1000)
            redis_count += len(keys)
            if cursor == 0:
                break

        # Count Elasticsearch documents
        es_result = self.es.count(index=self.index_name)
        es_count = es_result["count"]

        # Calculate lag
        lag_count = abs(redis_count - es_count)
        in_sync = lag_count == 0

        return SyncHealth(
            redis_count=redis_count,
            es_count=es_count,
            in_sync=in_sync,
            lag_count=lag_count,
            last_check=time.time()
        )

    def get_metrics(self) -> Dict:
        """Get sync metrics for monitoring."""
        health = self.check_health()

        return {
            "sync_redis_count": health.redis_count,
            "sync_es_count": health.es_count,
            "sync_in_sync": 1 if health.in_sync else 0,
            "sync_lag_count": health.lag_count
        }
```

## Best Practices

1. **Define source of truth** - Decide whether Elasticsearch or another database is authoritative
2. **Use eventual consistency** - Accept that Redis cache may be slightly behind
3. **Implement idempotent updates** - Handle duplicate events gracefully
4. **Cache search results carefully** - Short TTLs prevent stale search results
5. **Monitor sync lag** - Alert when systems drift apart
6. **Test failure scenarios** - Ensure graceful degradation when one system is down
7. **Invalidate aggressively** - When in doubt, invalidate the cache

## Conclusion

Synchronizing Redis and Elasticsearch requires choosing the right pattern for your consistency and performance requirements. Event-driven sync with Redis Streams provides a good balance of consistency and decoupling, while dual-write offers stronger consistency at the cost of coupling. Always monitor sync health and have procedures for handling drift between systems.
