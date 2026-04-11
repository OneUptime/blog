# How to Sync Redis Data with Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Elasticsearch, Data Sync, Search, Keyspace Notification, Python

Description: Learn patterns to keep Redis and Elasticsearch in sync, enabling fast caching with rich full-text search capabilities in your application.

---

## Why Sync Redis with Elasticsearch?

Redis excels at fast key-value lookups, counters, and caching. Elasticsearch excels at full-text search, faceting, and analytics. Combining both gives you the best of both worlds: blazing-fast reads from Redis and powerful search from Elasticsearch.

Common use cases:
- Product catalog: cache hot products in Redis, index all products in Elasticsearch
- User profiles: Redis for session data, Elasticsearch for user search
- Event logs: Redis as a write buffer, Elasticsearch as the persistent search store

## Architecture Overview

```text
Application
    |
    |--> Write --> Redis (cache + write-through)
    |                    |
    |                    +--> Sync worker --> Elasticsearch
    |
    |--> Read  --> Redis (cache hit)
    |          --> Elasticsearch (full-text search)
```

## Pattern 1 - Write-Through Sync

Write to Redis and Elasticsearch simultaneously from your application:

```python
import redis
import json
from elasticsearch import Elasticsearch

r = redis.Redis(host='localhost', port=6379)
es = Elasticsearch(['http://localhost:9200'])

def upsert_product(product: dict):
    product_id = product['id']

    # Write to Redis cache
    r.setex(
        f"product:{product_id}",
        3600,
        json.dumps(product)
    )

    # Write to Elasticsearch
    es.index(
        index='products',
        id=product_id,
        document=product
    )

def get_product(product_id: str):
    # Try Redis cache first
    cached = r.get(f"product:{product_id}")
    if cached:
        return json.loads(cached)

    # Fallback to Elasticsearch
    result = es.get(index='products', id=product_id)
    product = result['_source']

    # Re-populate cache
    r.setex(f"product:{product_id}", 3600, json.dumps(product))
    return product

def search_products(query: str):
    # Full-text search always goes to Elasticsearch
    result = es.search(index='products', query={
        "multi_match": {"query": query, "fields": ["name", "description"]}
    })
    return [hit['_source'] for hit in result['hits']['hits']]
```

## Pattern 2 - Redis Keyspace Notifications

Use Redis keyspace notifications to trigger sync whenever data changes:

```bash
# Enable keyspace notifications in redis.conf or at runtime
redis-cli CONFIG SET notify-keyspace-events KEA
```

```python
import redis
import json
import threading
from elasticsearch import Elasticsearch

r = redis.Redis(host='localhost', port=6379)
es = Elasticsearch(['http://localhost:9200'])

def sync_worker():
    pubsub = r.pubsub()
    # Subscribe to keyspace events for the 'product:*' pattern
    pubsub.psubscribe('__keyevent@0__:set', '__keyevent@0__:del')

    for message in pubsub.listen():
        if message['type'] not in ('pmessage', 'message'):
            continue

        event = message['data'].decode('utf-8')

        if message['channel'] == b'__keyevent@0__:set':
            key = event
            if key.startswith('product:'):
                product_id = key.split(':', 1)[1]
                raw = r.get(key)
                if raw:
                    product = json.loads(raw)
                    es.index(index='products', id=product_id, document=product)
                    print(f"Synced {key} to Elasticsearch")

        elif message['channel'] == b'__keyevent@0__:del':
            key = event
            if key.startswith('product:'):
                product_id = key.split(':', 1)[1]
                es.options(ignore_status=[404]).delete(index='products', id=product_id)
                print(f"Deleted {key} from Elasticsearch")

# Run sync worker in background thread
thread = threading.Thread(target=sync_worker, daemon=True)
thread.start()
```

## Pattern 3 - Redis Streams as Sync Queue

Use Redis Streams as a durable changelog for reliable sync:

```python
import redis
import json
from elasticsearch import Elasticsearch

r = redis.Redis(host='localhost', port=6379)
es = Elasticsearch(['http://localhost:9200'])

STREAM_KEY = 'product_changes'
CONSUMER_GROUP = 'es_sync'

# Create consumer group (once)
try:
    r.xgroup_create(STREAM_KEY, CONSUMER_GROUP, id='0', mkstream=True)
except redis.exceptions.ResponseError:
    pass  # Group already exists

def publish_change(action: str, product: dict):
    r.xadd(STREAM_KEY, {
        'action': action,
        'product_id': str(product['id']),
        'data': json.dumps(product),
    })

def consume_and_sync():
    while True:
        messages = r.xreadgroup(
            CONSUMER_GROUP, 'worker-1',
            {STREAM_KEY: '>'},
            count=10,
            block=5000
        )
        if not messages:
            continue

        for stream, entries in messages:
            for entry_id, fields in entries:
                action = fields[b'action'].decode()
                product_id = fields[b'product_id'].decode()
                data = json.loads(fields[b'data'])

                if action == 'upsert':
                    es.index(index='products', id=product_id, document=data)
                elif action == 'delete':
                    es.options(ignore_status=[404]).delete(index='products', id=product_id)

                # Acknowledge message after successful processing
                r.xack(STREAM_KEY, CONSUMER_GROUP, entry_id)
```

## Handling Sync Failures

Always implement dead-letter handling for failed sync messages:

```python
DEAD_LETTER_KEY = 'product_changes_dlq'

def process_with_dlq(stream_entry_id, fields):
    try:
        # ... process and sync ...
        r.xack(STREAM_KEY, CONSUMER_GROUP, stream_entry_id)
    except Exception as e:
        # Move to dead-letter queue
        r.xadd(DEAD_LETTER_KEY, {
            'original_id': stream_entry_id,
            'error': str(e),
            **fields
        })
        r.xack(STREAM_KEY, CONSUMER_GROUP, stream_entry_id)
```

## Summary

Syncing Redis with Elasticsearch can be done through write-through (synchronous), keyspace notifications (event-driven), or Redis Streams (reliable queue). Redis Streams is the most resilient approach for production because it provides durable delivery guarantees and supports consumer groups. Always design for failure by acknowledging messages only after successful Elasticsearch writes and routing failures to a dead-letter queue.
