# How to Use Redis Search (RediSearch) for Full-Text Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Full-Text Search, Search Engine, Indexing, Database

Description: A comprehensive guide to implementing full-text search with RediSearch, covering indexing, querying, aggregations, and advanced search features for building powerful search functionality in your applications.

---

Full-text search is a critical feature for modern applications. While databases like PostgreSQL and Elasticsearch offer full-text search capabilities, RediSearch brings the power of search directly to Redis with sub-millisecond query times. In this guide, we will explore how to implement full-text search using RediSearch.

## What is RediSearch?

RediSearch is a Redis module that enables full-text search, secondary indexing, and aggregations on Redis data. It provides:

- Full-text indexing with stemming and fuzzy matching
- Numeric, tag, and geo filtering
- Aggregations and grouping
- Autocomplete suggestions
- Query highlighting
- Extremely low latency (sub-millisecond queries)

## Installing RediSearch

### Using Docker (Recommended)

The easiest way to get started is with Redis Stack, which includes RediSearch:

```bash
docker run -d --name redis-stack \
  -p 6379:6379 \
  -p 8001:8001 \
  redis/redis-stack:latest
```

### Using Docker Compose

```yaml
version: '3.8'
services:
  redis:
    image: redis/redis-stack:latest
    ports:
      - "6379:6379"
      - "8001:8001"
    volumes:
      - redis-data:/data
    environment:
      - REDIS_ARGS=--save 60 1

volumes:
  redis-data:
```

### Verifying Installation

Connect to Redis and verify RediSearch is available:

```bash
redis-cli
127.0.0.1:6379> MODULE LIST
1) 1) "name"
   2) "search"
   3) "ver"
   4) (integer) 20809
```

## Creating Your First Search Index

Let's create a search index for a product catalog:

### Defining the Schema

```bash
FT.CREATE product_idx
  ON HASH
  PREFIX 1 product:
  SCHEMA
    name TEXT WEIGHT 5.0
    description TEXT
    category TAG
    price NUMERIC SORTABLE
    brand TAG
    in_stock TAG
```

This creates an index with:
- `name`: Text field with higher relevance weight (5x)
- `description`: Text field for full-text search
- `category`: Tag field for exact matching
- `price`: Numeric field that can be sorted
- `brand`: Tag field for filtering
- `in_stock`: Tag field for availability

### Adding Documents

Add products using regular Redis HSET commands:

```bash
HSET product:1 name "Wireless Bluetooth Headphones" \
  description "High-quality wireless headphones with active noise cancellation and 30-hour battery life" \
  category "electronics" \
  price 149.99 \
  brand "AudioTech" \
  in_stock "yes"

HSET product:2 name "Mechanical Gaming Keyboard" \
  description "RGB backlit mechanical keyboard with Cherry MX switches for gaming enthusiasts" \
  category "electronics" \
  price 129.99 \
  brand "GamerPro" \
  in_stock "yes"

HSET product:3 name "Running Shoes" \
  description "Lightweight running shoes with cushioned sole for marathon training" \
  category "sports" \
  price 89.99 \
  brand "SpeedRunner" \
  in_stock "no"
```

## Basic Search Queries

### Simple Text Search

```bash
# Search for "wireless"
FT.SEARCH product_idx "wireless"

# Search for "keyboard gaming"
FT.SEARCH product_idx "keyboard gaming"
```

### Field-Specific Search

```bash
# Search only in the name field
FT.SEARCH product_idx "@name:headphones"

# Search in description field
FT.SEARCH product_idx "@description:noise cancellation"
```

### Wildcard Search

```bash
# Prefix search
FT.SEARCH product_idx "wire*"

# Suffix search (requires SUFFIX support)
FT.SEARCH product_idx "*phones"
```

## Advanced Query Syntax

### Boolean Operators

```bash
# AND (implicit)
FT.SEARCH product_idx "wireless headphones"

# OR
FT.SEARCH product_idx "wireless|wired headphones"

# NOT
FT.SEARCH product_idx "headphones -bluetooth"

# Complex boolean
FT.SEARCH product_idx "(wireless|bluetooth) headphones -cheap"
```

### Tag Filtering

```bash
# Filter by category
FT.SEARCH product_idx "@category:{electronics}"

# Multiple tags (OR)
FT.SEARCH product_idx "@category:{electronics|sports}"

# Combine with text search
FT.SEARCH product_idx "headphones @category:{electronics} @in_stock:{yes}"
```

### Numeric Filtering

```bash
# Price range
FT.SEARCH product_idx "@price:[50 150]"

# Greater than
FT.SEARCH product_idx "@price:[(100 +inf]"

# Less than
FT.SEARCH product_idx "@price:[-inf (100]"

# Combine with text
FT.SEARCH product_idx "headphones @price:[0 200]"
```

### Sorting Results

```bash
# Sort by price ascending
FT.SEARCH product_idx "*" SORTBY price ASC

# Sort by price descending
FT.SEARCH product_idx "headphones" SORTBY price DESC

# Limit results
FT.SEARCH product_idx "*" SORTBY price ASC LIMIT 0 10
```

## Implementing in Python

Here's how to use RediSearch with Python:

```python
import redis
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Define the schema
schema = (
    TextField("name", weight=5.0),
    TextField("description"),
    TagField("category"),
    NumericField("price", sortable=True),
    TagField("brand"),
    TagField("in_stock")
)

# Create the index
try:
    r.ft("product_idx").create_index(
        schema,
        definition=IndexDefinition(
            prefix=["product:"],
            index_type=IndexType.HASH
        )
    )
    print("Index created successfully")
except Exception as e:
    print(f"Index might already exist: {e}")

# Add products
products = [
    {
        "id": "product:1",
        "name": "Wireless Bluetooth Headphones",
        "description": "High-quality wireless headphones with noise cancellation",
        "category": "electronics",
        "price": 149.99,
        "brand": "AudioTech",
        "in_stock": "yes"
    },
    {
        "id": "product:2",
        "name": "Mechanical Gaming Keyboard",
        "description": "RGB backlit mechanical keyboard with Cherry MX switches",
        "category": "electronics",
        "price": 129.99,
        "brand": "GamerPro",
        "in_stock": "yes"
    },
    {
        "id": "product:3",
        "name": "Running Shoes",
        "description": "Lightweight running shoes for marathon training",
        "category": "sports",
        "price": 89.99,
        "brand": "SpeedRunner",
        "in_stock": "no"
    }
]

for product in products:
    product_id = product.pop("id")
    r.hset(product_id, mapping=product)

# Search function
def search_products(query_string, filters=None, sort_by=None, limit=10):
    query = Query(query_string)

    if filters:
        for field, value in filters.items():
            if isinstance(value, tuple):
                query_string += f" @{field}:[{value[0]} {value[1]}]"
            else:
                query_string += f" @{field}:{{{value}}}"
        query = Query(query_string)

    if sort_by:
        query.sort_by(sort_by[0], asc=sort_by[1])

    query.paging(0, limit)

    results = r.ft("product_idx").search(query)
    return results

# Example searches
print("Search for 'headphones':")
results = search_products("headphones")
for doc in results.docs:
    print(f"  - {doc.name}: ${doc.price}")

print("\nSearch for electronics under $150:")
results = search_products("@category:{electronics} @price:[0 150]")
for doc in results.docs:
    print(f"  - {doc.name}: ${doc.price}")
```

## Implementing in Node.js

```javascript
const { createClient, SchemaFieldTypes, AggregateSteps } = require('redis');

async function main() {
    const client = createClient();
    await client.connect();

    // Create index
    try {
        await client.ft.create('product_idx', {
            name: {
                type: SchemaFieldTypes.TEXT,
                weight: 5.0
            },
            description: {
                type: SchemaFieldTypes.TEXT
            },
            category: {
                type: SchemaFieldTypes.TAG
            },
            price: {
                type: SchemaFieldTypes.NUMERIC,
                sortable: true
            },
            brand: {
                type: SchemaFieldTypes.TAG
            },
            in_stock: {
                type: SchemaFieldTypes.TAG
            }
        }, {
            ON: 'HASH',
            PREFIX: 'product:'
        });
        console.log('Index created');
    } catch (e) {
        console.log('Index might already exist');
    }

    // Add products
    await client.hSet('product:1', {
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        category: 'electronics',
        price: '149.99',
        brand: 'AudioTech',
        in_stock: 'yes'
    });

    await client.hSet('product:2', {
        name: 'Mechanical Gaming Keyboard',
        description: 'RGB backlit mechanical keyboard with Cherry MX switches',
        category: 'electronics',
        price: '129.99',
        brand: 'GamerPro',
        in_stock: 'yes'
    });

    // Search
    const results = await client.ft.search('product_idx', 'headphones', {
        LIMIT: { from: 0, size: 10 }
    });

    console.log('Search results:');
    results.documents.forEach(doc => {
        console.log(`  - ${doc.value.name}: $${doc.value.price}`);
    });

    // Search with filters
    const filteredResults = await client.ft.search(
        'product_idx',
        '@category:{electronics} @price:[0 150]',
        {
            SORTBY: { BY: 'price', DIRECTION: 'ASC' }
        }
    );

    console.log('\nFiltered results:');
    filteredResults.documents.forEach(doc => {
        console.log(`  - ${doc.value.name}: $${doc.value.price}`);
    });

    await client.quit();
}

main().catch(console.error);
```

## Aggregations

RediSearch supports powerful aggregations for analytics:

```bash
# Count products by category
FT.AGGREGATE product_idx "*"
  GROUPBY 1 @category
  REDUCE COUNT 0 AS count

# Average price by category
FT.AGGREGATE product_idx "*"
  GROUPBY 1 @category
  REDUCE AVG 1 @price AS avg_price

# Multiple aggregations
FT.AGGREGATE product_idx "*"
  GROUPBY 1 @category
  REDUCE COUNT 0 AS count
  REDUCE AVG 1 @price AS avg_price
  REDUCE MIN 1 @price AS min_price
  REDUCE MAX 1 @price AS max_price
  SORTBY 2 @count DESC
```

### Python Aggregation Example

```python
from redis.commands.search.aggregation import AggregateRequest
from redis.commands.search import reducers

# Category statistics
agg = AggregateRequest("*").group_by(
    "@category",
    reducers.count().alias("count"),
    reducers.avg("@price").alias("avg_price"),
    reducers.min("@price").alias("min_price"),
    reducers.max("@price").alias("max_price")
).sort_by("@count", asc=False)

results = r.ft("product_idx").aggregate(agg)

for row in results.rows:
    print(f"Category: {row[1]}")
    print(f"  Count: {row[3]}")
    print(f"  Avg Price: ${float(row[5]):.2f}")
```

## Fuzzy Matching and Phonetic Search

### Fuzzy Search

Find results even with typos:

```bash
# Single character difference
FT.SEARCH product_idx "%headphnes%"

# Two character difference
FT.SEARCH product_idx "%%hedphones%%"
```

### Phonetic Search

Enable phonetic matching for words that sound alike:

```bash
# Create index with phonetic matching
FT.CREATE product_phonetic_idx
  ON HASH
  PREFIX 1 product:
  SCHEMA
    name TEXT PHONETIC dm:en
    description TEXT PHONETIC dm:en

# Search will match "color" and "colour", "center" and "centre"
FT.SEARCH product_phonetic_idx "colour"
```

## Highlighting Search Results

Return highlighted matches in search results:

```bash
FT.SEARCH product_idx "wireless headphones"
  HIGHLIGHT FIELDS 1 description
  TAGS <b> </b>
```

Response will include highlighted text:
```
description: "High-quality <b>wireless</b> <b>headphones</b> with noise cancellation"
```

## Index Management

### Viewing Index Information

```bash
# Get index info
FT.INFO product_idx

# List all indexes
FT._LIST
```

### Updating the Schema

You can add new fields to an existing index:

```bash
FT.ALTER product_idx SCHEMA ADD rating NUMERIC SORTABLE
```

### Dropping an Index

```bash
# Drop index only (keep data)
FT.DROPINDEX product_idx

# Drop index and all associated documents
FT.DROPINDEX product_idx DD
```

## Performance Optimization

### 1. Use Appropriate Field Types

```bash
# Use TAG for exact matches (faster than TEXT)
# Use NUMERIC for range queries
# Use TEXT only when full-text search is needed
```

### 2. Index Only What You Need

```bash
# Don't index fields you won't search on
# Use NOINDEX for fields you only want to return
FT.CREATE idx ON HASH PREFIX 1 doc: SCHEMA
  title TEXT
  content TEXT
  metadata TEXT NOINDEX
```

### 3. Use SORTBY Fields Wisely

```bash
# Only mark fields as SORTABLE if you'll sort by them
# SORTABLE fields use more memory
```

### 4. Optimize Query Patterns

```python
# Bad: Searching everything
results = r.ft("idx").search("*")

# Good: Be specific
results = r.ft("idx").search("@category:{electronics} @in_stock:{yes}")

# Use LIMIT to reduce result size
query = Query("headphones").paging(0, 20)
```

## Monitoring RediSearch

### Key Metrics to Monitor

```bash
# Index statistics
FT.INFO product_idx

# Key metrics:
# - num_docs: Total documents indexed
# - num_terms: Unique terms in index
# - num_records: Total term occurrences
# - inverted_sz_mb: Inverted index size
# - offset_vectors_sz_mb: Offset vectors size
```

### Python Monitoring Script

```python
def get_index_stats(redis_client, index_name):
    info = redis_client.ft(index_name).info()

    stats = {
        "documents": info.get("num_docs", 0),
        "terms": info.get("num_terms", 0),
        "records": info.get("num_records", 0),
        "index_size_mb": float(info.get("inverted_sz_mb", 0)),
        "indexing": info.get("indexing", 0),
    }

    return stats

# Usage
stats = get_index_stats(r, "product_idx")
print(f"Documents: {stats['documents']}")
print(f"Index Size: {stats['index_size_mb']:.2f} MB")
```

## Conclusion

RediSearch provides a powerful, fast, and feature-rich full-text search solution that integrates seamlessly with Redis. Key takeaways:

1. **Sub-millisecond queries**: RediSearch delivers extremely fast search performance
2. **Rich query language**: Supports boolean operators, filters, ranges, and fuzzy matching
3. **Aggregations**: Built-in support for analytics and grouping
4. **Easy integration**: Works with existing Redis data structures
5. **Scalability**: Can handle millions of documents with proper configuration

Whether you're building product search, content discovery, or log analysis, RediSearch offers the performance and features needed for production search applications. Start with simple text search and gradually add more advanced features as your needs grow.
