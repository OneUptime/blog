# How to Implement Typeahead Search with RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Typeahead, Autocomplete, Search

Description: Learn how to build fast typeahead and autocomplete search using RediSearch full-text indexes with prefix queries and result ranking.

---

## What Is RediSearch

RediSearch is a Redis module (included in Redis Stack) that adds full-text search capabilities including inverted indexes, prefix/infix search, numeric filters, and result ranking. It enables millisecond-latency autocomplete at scale.

## Installing Redis Stack

```bash
# Using Docker
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack-server:latest

# Or install on Ubuntu
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
sudo apt-get install redis-stack-server
```

## Creating a Search Index

```bash
# Create an index on documents with title and category fields
FT.CREATE idx:products
  ON HASH
  PREFIX 1 product:
  SCHEMA
    title TEXT WEIGHT 5.0
    category TAG
    price NUMERIC
    description TEXT
```

## Adding Documents

```bash
HSET product:1 title "Apple iPhone 15" category "smartphones" price 999
HSET product:2 title "Apple MacBook Pro" category "laptops" price 2499
HSET product:3 title "Samsung Galaxy S24" category "smartphones" price 799
```

## Prefix Search for Typeahead

RediSearch supports prefix matching with the `*` wildcard:

```bash
# Search for products starting with "app"
FT.SEARCH idx:products "app*" RETURN 2 title category LIMIT 0 10
```

## Python Implementation with redis-py

```python
from redis import Redis
from redis.commands.search.field import TextField, TagField, NumericField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query

r = Redis(decode_responses=True)

def create_product_index():
    try:
        r.ft("idx:products").info()
    except Exception:
        r.ft("idx:products").create_index(
            [
                TextField("title", weight=5.0),
                TagField("category"),
                NumericField("price")
            ],
            definition=IndexDefinition(
                prefix=["product:"],
                index_type=IndexType.HASH
            )
        )

def add_product(product_id: int, title: str, category: str, price: float):
    r.hset(f"product:{product_id}", mapping={
        "title": title,
        "category": category,
        "price": price
    })

def typeahead(query_text: str, limit: int = 10) -> list:
    # Escape special characters except * for prefix search
    escaped = query_text.replace("-", "\\-").replace(":", "\\:")
    search_query = Query(f"{escaped}*") \
        .return_fields("title", "category", "price") \
        .paging(0, limit)
    results = r.ft("idx:products").search(search_query)
    return [
        {
            "id": doc.id.replace("product:", ""),
            "title": doc.title,
            "category": doc.category,
            "price": float(doc.price)
        }
        for doc in results.docs
    ]
```

## Adding Score Boosts for Popular Items

Store a popularity score and boost it during search:

```python
from redis.commands.search.field import NumericField

# Add popularity to schema
def create_index_with_popularity():
    r.ft("idx:products").create_index(
        [
            TextField("title", weight=5.0),
            TagField("category"),
            NumericField("price"),
            NumericField("popularity", sortable=True)
        ],
        definition=IndexDefinition(prefix=["product:"], index_type=IndexType.HASH)
    )

def typeahead_with_boost(query_text: str, limit: int = 10) -> list:
    escaped = query_text.strip().replace("-", "\\-")
    # Sort by popularity descending
    search_query = Query(f"{escaped}*") \
        .return_fields("title", "category", "price", "popularity") \
        .sort_by("popularity", asc=False) \
        .paging(0, limit)
    results = r.ft("idx:products").search(search_query)
    return [
        {"title": doc.title, "category": doc.category}
        for doc in results.docs
    ]
```

## FastAPI Typeahead Endpoint

```python
from fastapi import FastAPI, Query as QParam

app = FastAPI()

@app.on_event("startup")
def startup():
    create_product_index()
    # Seed data
    products = [
        (1, "Apple iPhone 15", "smartphones", 999),
        (2, "Apple MacBook Pro", "laptops", 2499),
        (3, "Samsung Galaxy S24", "smartphones", 799),
        (4, "Apple AirPods Pro", "audio", 249),
        (5, "Sony WH-1000XM5", "audio", 349),
    ]
    for pid, title, cat, price in products:
        add_product(pid, title, cat, price)

@app.get("/search/typeahead")
def search_typeahead(q: str = QParam(..., min_length=1), limit: int = 10):
    if len(q) < 1:
        return []
    return typeahead(q, limit)
```

## Summary

RediSearch enables millisecond-latency typeahead search by storing documents in Redis Hashes and querying them with prefix wildcards. Creating an index with weighted TEXT fields improves relevance, and sorting by a popularity score surfaces trending results first. The approach scales to millions of documents while maintaining response times under 10ms.
