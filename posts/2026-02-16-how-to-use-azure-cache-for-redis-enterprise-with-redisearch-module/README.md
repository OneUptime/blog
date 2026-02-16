# How to Use Azure Cache for Redis Enterprise with RediSearch Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Redis, RediSearch, Full-Text Search, Azure Cache for Redis, Enterprise Tier, Search Index

Description: Learn how to enable and use the RediSearch module on Azure Cache for Redis Enterprise for full-text search and secondary indexing.

---

Redis is known as a fast key-value store, but with the RediSearch module, it becomes a capable full-text search engine too. Azure Cache for Redis Enterprise tier supports RediSearch natively, which means you can run search queries, secondary indexes, and aggregations directly inside your cache layer - no separate Elasticsearch or Solr cluster needed. This guide covers how to set it up and put it to work.

## Why RediSearch on Azure?

Before jumping into the how, let me explain why this combination is interesting. Most teams running Redis also run a separate search engine. That means maintaining two systems, syncing data between them, and dealing with the inevitable consistency issues. RediSearch collapses this into one system. Your data lives in Redis, and your search index lives right next to it.

Some practical use cases:

- **Product catalog search**: Full-text search across product names, descriptions, and attributes with faceted filtering.
- **Autocomplete**: Prefix matching and suggestion scoring built into the module.
- **Real-time analytics**: Aggregation queries over structured data stored in Redis hashes.
- **Session search**: Finding user sessions by attributes like IP address, user agent, or custom metadata.
- **Log indexing**: Indexing structured log entries for fast querying without shipping logs to a separate system.

The Enterprise tier of Azure Cache for Redis includes RediSearch at no extra module cost - you are already paying for the Enterprise SKU.

## Prerequisites

You will need:

- An Azure subscription
- Azure CLI version 2.45 or later
- Familiarity with basic Redis commands
- A client library that supports RediSearch commands (we will use the `redis-py` library with its search module)

## Step 1: Create an Enterprise Tier Cache with RediSearch

RediSearch is only available on the Enterprise and Enterprise Flash tiers. You cannot use it on Basic, Standard, or Premium.

```bash
# Create a resource group
az group create --name rg-redis-search --location eastus

# Create an Enterprise E10 cache with the RediSearch module enabled
az redisenterprise create \
  --name redis-search-demo \
  --resource-group rg-redis-search \
  --location eastus \
  --sku Enterprise_E10 \
  --zones 1 2 3

# Create a database within the Enterprise cache with RediSearch enabled
az redisenterprise database create \
  --cluster-name redis-search-demo \
  --resource-group rg-redis-search \
  --modules name=RediSearch \
  --client-protocol Encrypted \
  --clustering-policy EnterpriseCluster \
  --eviction-policy NoEviction \
  --port 10000
```

A few notes about the configuration:

- `Enterprise_E10` is the smallest Enterprise SKU. For production workloads with large indexes, consider E20 or E50.
- `--modules name=RediSearch` enables the RediSearch module. You can also add `name=RedisJSON` if you want to index JSON documents.
- `--eviction-policy NoEviction` is important for search. If Redis evicts keys that are part of a search index, your index becomes inconsistent.
- The `--zones 1 2 3` flag distributes across availability zones for high availability.

## Step 2: Get the Connection Details

After the cache is provisioned (which can take 10-15 minutes), retrieve the connection information.

```bash
# Get the endpoint hostname
az redisenterprise database show \
  --cluster-name redis-search-demo \
  --resource-group rg-redis-search \
  --query "resourceState"

# Get the access keys
az redisenterprise database list-keys \
  --cluster-name redis-search-demo \
  --resource-group rg-redis-search
```

## Step 3: Create a Search Index

Now the interesting part. Let us create a search index over Redis hashes. Suppose we are building a product catalog search.

First, install the Python Redis client with search support:

```bash
# Install redis-py with the search extras
pip install redis[hiredis]
```

Now create the index and add some data:

```python
import redis
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

# Connect to the Enterprise cache
r = redis.Redis(
    host='redis-search-demo.eastus.redisenterprise.cache.azure.net',
    port=10000,
    password='<your-access-key>',
    ssl=True,
    decode_responses=True
)

# Define the search index schema
# TextField supports full-text search, NumericField supports range queries,
# TagField supports exact-match filtering
schema = (
    TextField("name", weight=5.0),       # Product name, higher relevance weight
    TextField("description"),              # Product description
    NumericField("price", sortable=True), # Price field for range queries
    TagField("category"),                  # Category for exact filtering
    TagField("brand"),                     # Brand for exact filtering
    NumericField("rating", sortable=True) # Rating for sorting and filtering
)

# Create the index on all hashes with the prefix "product:"
index_def = IndexDefinition(
    prefix=["product:"],
    index_type=IndexType.HASH
)

# Create the index (drop it first if it already exists)
try:
    r.ft("idx:products").dropindex(delete_documents=False)
except:
    pass

r.ft("idx:products").create_index(schema, definition=index_def)
print("Index created successfully")
```

## Step 4: Add Data to the Index

With the index in place, any hash that matches the prefix `product:` will be automatically indexed. You do not need to explicitly add documents to the index - just write hashes to Redis.

```python
# Add product data as Redis hashes
# Each hash matching the "product:" prefix is automatically indexed
products = [
    {
        "name": "Wireless Noise-Canceling Headphones",
        "description": "Premium over-ear headphones with active noise cancellation and 30-hour battery life",
        "price": 299.99,
        "category": "electronics",
        "brand": "AudioPro",
        "rating": 4.7
    },
    {
        "name": "Mechanical Keyboard RGB",
        "description": "Full-size mechanical keyboard with Cherry MX switches and per-key RGB lighting",
        "price": 149.99,
        "category": "electronics",
        "brand": "KeyMaster",
        "rating": 4.5
    },
    {
        "name": "Running Shoes Ultra Comfort",
        "description": "Lightweight running shoes with responsive cushioning and breathable mesh upper",
        "price": 129.99,
        "category": "footwear",
        "brand": "RunFast",
        "rating": 4.3
    },
    {
        "name": "Stainless Steel Water Bottle",
        "description": "Double-wall insulated water bottle keeps drinks cold for 24 hours or hot for 12 hours",
        "price": 34.99,
        "category": "accessories",
        "brand": "HydroKeep",
        "rating": 4.8
    }
]

# Write each product as a Redis hash
for i, product in enumerate(products, start=1):
    key = f"product:{i}"
    r.hset(key, mapping=product)
    print(f"Added {key}: {product['name']}")
```

## Step 5: Run Search Queries

Now you can search your product catalog with full-text queries, filters, and aggregations.

```python
from redis.commands.search.query import Query

# Simple full-text search for "headphones"
result = r.ft("idx:products").search(
    Query("headphones").return_fields("name", "price", "rating")
)
print(f"Found {result.total} result(s) for 'headphones':")
for doc in result.docs:
    print(f"  {doc.name} - ${doc.price} (rating: {doc.rating})")

# Search with a category filter
# The @category tag filter uses exact matching
result = r.ft("idx:products").search(
    Query("@category:{electronics}").return_fields("name", "price")
)
print(f"\nElectronics products ({result.total} found):")
for doc in result.docs:
    print(f"  {doc.name} - ${doc.price}")

# Price range query - find products under $100
result = r.ft("idx:products").search(
    Query("@price:[0 100]").return_fields("name", "price").sort_by("price")
)
print(f"\nProducts under $100 ({result.total} found):")
for doc in result.docs:
    print(f"  {doc.name} - ${doc.price}")

# Combined full-text and filter query
result = r.ft("idx:products").search(
    Query("lightweight comfortable @category:{footwear}")
    .return_fields("name", "description", "price")
)
print(f"\nLightweight comfortable footwear ({result.total} found):")
for doc in result.docs:
    print(f"  {doc.name} - {doc.description}")
```

## Step 6: Aggregation Queries

RediSearch also supports aggregation, which is useful for analytics dashboards and summary views.

```python
from redis.commands.search.aggregation import AggregateRequest, Asc, Desc
import redis.commands.search.reducers as reducers

# Average price per category
agg = AggregateRequest("*") \
    .group_by("@category", reducers.avg("@price").alias("avg_price")) \
    .sort_by(Desc("@avg_price"))

result = r.ft("idx:products").aggregate(agg)
print("Average price by category:")
for row in result.rows:
    print(f"  {row}")

# Count products by brand with average rating
agg = AggregateRequest("*") \
    .group_by("@brand",
              reducers.count().alias("product_count"),
              reducers.avg("@rating").alias("avg_rating")) \
    .sort_by(Desc("@avg_rating"))

result = r.ft("idx:products").aggregate(agg)
print("\nProducts by brand:")
for row in result.rows:
    print(f"  {row}")
```

## Performance Tuning Tips

RediSearch on Enterprise tier is fast out of the box, but there are ways to squeeze more performance:

**Index only what you search on**: Every indexed field adds memory overhead and slows down write operations. If you do not search or filter on a field, do not index it.

**Use TAG fields for exact matches**: Tag fields are much faster than text fields for categorical filtering. Use TextField only when you need full-text search with stemming and tokenization.

**Set field weights wisely**: The `weight` parameter on TextField controls relevance scoring. Give higher weights to fields that are more important for search relevance (like product names vs. descriptions).

**Batch your writes**: When loading large amounts of data, use Redis pipelines to batch hash writes. The indexing happens asynchronously, so bulk loading is efficient.

```python
# Use a pipeline for batch loading - much faster than individual writes
pipe = r.pipeline()
for i, product in enumerate(products):
    pipe.hset(f"product:{i}", mapping=product)
# Execute all writes in one round trip
pipe.execute()
```

**Monitor index stats**: Check your index health regularly.

```python
# Get index statistics including memory usage and document count
info = r.ft("idx:products").info()
print(f"Documents indexed: {info['num_docs']}")
print(f"Index size: {info['inverted_sz_mb']:.2f} MB")
print(f"Records per doc: {info['num_records']}")
```

## Limitations

A few things to keep in mind:

- RediSearch is only on Enterprise and Enterprise Flash tiers. No Premium tier support.
- The Enterprise tier starts at a higher price point than Premium, so factor that into your budget.
- Index creation and schema changes require rebuilding the index. Plan for this in your deployment process.
- RediSearch has its own query syntax. It is not SQL and it is not Elasticsearch query DSL. Your team will need to learn it.
- For very large datasets (hundreds of millions of documents), consider sharding and the EnterpriseCluster clustering policy.

## Wrapping Up

Azure Cache for Redis Enterprise with RediSearch gives you a powerful search engine that lives alongside your cache. You get full-text search, secondary indexes, range queries, and aggregations without managing a separate search infrastructure. The setup is a matter of creating an Enterprise cache with the RediSearch module enabled, defining your schema, and writing data as Redis hashes. For teams already invested in Redis, this is a natural way to add search capabilities without adding operational complexity.
