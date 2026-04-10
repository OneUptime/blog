# How to Build a Real-Time Search Index with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Real-Time

Description: Learn how to build a real-time search index with Redis using RediSearch, with live indexing on writes and sub-millisecond query responses.

---

RediSearch turns Redis into a real-time search engine. Unlike Elasticsearch, which is eventually consistent, RediSearch indexes data synchronously on write - the document is searchable within the same transaction.

## Create a RediSearch Index

```bash
FT.CREATE products:idx
  ON HASH
  PREFIX 1 "product:"
  SCHEMA
    title TEXT WEIGHT 3.0
    description TEXT
    brand TAG
    price NUMERIC SORTABLE
    tags TAG
    created_at NUMERIC SORTABLE
```

```python
import redis
from redis.commands.search.field import TextField, TagField, NumericField
from redis.commands.search.index_definition import IndexDefinition, IndexType

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

schema = (
    TextField("title", weight=3.0),
    TextField("description"),
    TagField("brand"),
    NumericField("price", sortable=True),
    TagField("tags"),
    NumericField("created_at", sortable=True),
)

client.ft("products:idx").create_index(
    schema,
    definition=IndexDefinition(prefix=["product:"], index_type=IndexType.HASH),
)
```

## Index a Document in Real Time

```python
import time

def index_product(product_id: str, data: dict):
    """Write to Redis Hash - RediSearch indexes it immediately."""
    key = f"product:{product_id}"
    client.hset(key, mapping={
        "title": data["title"],
        "description": data.get("description", ""),
        "brand": data["brand"],
        "price": float(data["price"]),
        "tags": ",".join(data.get("tags", [])),
        "created_at": int(time.time()),
    })
    # The document is now searchable - no async pipeline needed

index_product("P001", {
    "title": "Wireless Noise Cancelling Headphones",
    "description": "Premium audio with 30-hour battery",
    "brand": "AudioTech",
    "price": 299.99,
    "tags": ["wireless", "noise-cancelling", "bluetooth"],
})
```

## Search the Live Index

```python
from redis.commands.search.query import Query

def search_products(query_str: str, price_min: float = 0, price_max: float = 9999):
    q = Query(f"@title|description:({query_str}) @price:[{price_min} {price_max}]")
    q.paging(0, 20)
    q.sort_by("price")

    result = client.ft("products:idx").search(q)
    return [doc.__dict__ for doc in result.docs]

# Results are real-time - includes documents written milliseconds ago
results = search_products("headphones", price_max=500)
```

## Handle Updates and Deletes

```python
def update_product_price(product_id: str, new_price: float):
    """Partial update - only changed field is re-indexed."""
    client.hset(f"product:{product_id}", "price", new_price)

def delete_product(product_id: str):
    """Delete the Hash - RediSearch removes it from the index automatically."""
    client.delete(f"product:{product_id}")
```

## Monitor Index Health

```bash
# Check index stats
FT.INFO products:idx

# Key fields to watch:
# num_docs - total indexed documents
# indexing - 1 if still background indexing
# percent_indexed - progress
```

```python
info = client.ft("products:idx").info()
print(f"Indexed docs: {info['num_docs']}")
print(f"Index size: {info['inverted_sz_mb']} MB")
```

## Summary

RediSearch provides real-time indexing where documents become searchable immediately upon write, with no async pipeline delay. Define your schema upfront with appropriate field weights and sortable fields, write documents as Redis Hashes using the index prefix, and use the Python `redis.commands.search` interface for structured queries combining full-text search with numeric range filters.
