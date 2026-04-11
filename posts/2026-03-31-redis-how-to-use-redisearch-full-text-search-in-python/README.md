# How to Use RediSearch Full-Text Search in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, RediSearch, Full-Text Search, redis-py

Description: Learn how to use RediSearch in Python to create search indexes, index documents, and perform full-text search queries with filters and aggregations.

---

## What Is RediSearch?

RediSearch is a Redis module that adds full-text search and secondary indexing to Redis. It supports:

- Full-text search with ranking and stemming
- Numeric and tag field filtering
- Geo filtering
- Aggregations and faceted search
- Auto-complete suggestions

## Installing the Client

```bash
pip install redis
```

RediSearch support is built into redis-py 4.0+. Ensure your Redis server has the RediSearch module (included in Redis Stack):

```bash
# Run Redis Stack with RediSearch
docker run -p 6379:6379 redis/redis-stack:latest
```

## Creating a Search Index

```python
from redis import Redis
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.index_definition import IndexDefinition, IndexType

r = Redis(host='localhost', port=6379, decode_responses=True)

# Define the index schema
schema = (
    TextField('title', weight=5.0),
    TextField('description'),
    NumericField('price', sortable=True),
    TagField('category'),
    NumericField('rating', sortable=True),
)

# Create the index on keys matching 'product:*'
index_def = IndexDefinition(
    prefix=['product:'],
    index_type=IndexType.HASH
)

try:
    r.ft('products').create_index(schema, definition=index_def)
    print("Index created successfully")
except Exception as e:
    print(f"Index may already exist: {e}")
```

## Indexing Documents

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

# Add product documents
products = [
    {
        'key': 'product:1',
        'title': 'Wireless Bluetooth Headphones',
        'description': 'Premium sound quality with noise cancellation',
        'price': 79.99,
        'category': 'electronics',
        'rating': 4.5
    },
    {
        'key': 'product:2',
        'title': 'Ergonomic Office Chair',
        'description': 'Lumbar support and adjustable height for comfort',
        'price': 299.00,
        'category': 'furniture',
        'rating': 4.2
    },
    {
        'key': 'product:3',
        'title': 'Bluetooth Speaker Portable',
        'description': 'Waterproof speaker with 20-hour battery life',
        'price': 49.99,
        'category': 'electronics',
        'rating': 4.7
    },
]

pipe = r.pipeline()
for product in products:
    pipe.hset(product['key'], mapping={
        'title': product['title'],
        'description': product['description'],
        'price': product['price'],
        'category': product['category'],
        'rating': product['rating'],
    })
pipe.execute()
print("Products indexed")
```

## Basic Search Queries

```python
from redis import Redis
from redis.commands.search.query import Query

r = Redis(host='localhost', port=6379, decode_responses=True)

# Simple full-text search
results = r.ft('products').search('bluetooth')
print(f"Found {results.total} results")
for doc in results.docs:
    print(f"  {doc.id}: {doc.title} - ${doc.price}")
```

## Advanced Queries with Filters

```python
from redis import Redis
from redis.commands.search.query import Query, NumericFilter

r = Redis(host='localhost', port=6379, decode_responses=True)

# Search with numeric filter (price range)
q = Query('bluetooth').add_filter(
    NumericFilter('price', 0, 100)
)
results = r.ft('products').search(q)
print("Bluetooth products under $100:")
for doc in results.docs:
    print(f"  {doc.title} - ${doc.price}")

# Search with tag filter
q = Query('@category:{electronics}')
results = r.ft('products').search(q)
print("\nElectronics:")
for doc in results.docs:
    print(f"  {doc.title}")

# Combined text and tag filter
q = Query('speaker @category:{electronics}')
results = r.ft('products').search(q)
```

## Sorting Results

```python
from redis import Redis
from redis.commands.search.query import Query

r = Redis(host='localhost', port=6379, decode_responses=True)

# Sort by price ascending
q = Query('*').sort_by('price', asc=True)
results = r.ft('products').search(q)

print("All products sorted by price:")
for doc in results.docs:
    print(f"  {doc.title}: ${doc.price}")

# Sort by rating descending, top 5
q = (Query('*')
     .sort_by('rating', asc=False)
     .paging(0, 5))
results = r.ft('products').search(q)
```

## Pagination

```python
from redis import Redis
from redis.commands.search.query import Query

r = Redis(host='localhost', port=6379, decode_responses=True)

page_size = 10
page = 0

while True:
    q = Query('*').paging(page * page_size, page_size)
    results = r.ft('products').search(q)

    if not results.docs:
        break

    for doc in results.docs:
        print(f"{doc.id}: {doc.title}")

    page += 1
    if page * page_size >= results.total:
        break
```

## Aggregations

```python
from redis import Redis
from redis.commands.search.aggregation import AggregateRequest, Desc
import redis.commands.search.reducers as reducers

r = Redis(host='localhost', port=6379, decode_responses=True)

# Count products per category and average price
req = (AggregateRequest('*')
       .group_by('@category', reducers.count().alias('count'),
                 reducers.avg('@price').alias('avg_price'))
       .sort_by(Desc('@count')))

result = r.ft('products').aggregate(req)
for row in result.rows:
    print(f"Category: {row[1]}, Count: {row[3]}, Avg Price: ${float(row[5]):.2f}")
```

## Dropping an Index

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

# Drop index only (keep documents)
r.ft('products').dropindex(delete_documents=False)

# Drop index and all indexed documents
r.ft('products').dropindex(delete_documents=True)
```

## Summary

RediSearch in Python with redis-py enables powerful full-text search, filtering, and aggregation over Redis hash or JSON documents. Create an index with `ft().create_index()`, define text, numeric, and tag fields, then query using the `Query` class with filters, sorting, and pagination. RediSearch is ideal for product catalogs, document search, and any application requiring fast, ranked text search without a separate search engine.
