# How to Get Started with Redis Stack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Stack, RediSearch, RedisJSON, RedisTimeSeries, RedisGraph, RedisBloom

Description: A comprehensive guide to getting started with Redis Stack, the all-in-one package combining Redis with Search, JSON, TimeSeries, Graph, and Bloom filter modules.

---

Redis Stack is an extension of Redis that bundles powerful modules - RediSearch, RedisJSON, RedisTimeSeries, RedisGraph, and RedisBloom - into a single, easy-to-deploy package. This guide will help you get started with Redis Stack and explore its capabilities.

## What is Redis Stack?

Redis Stack combines:

- **Redis** - The core in-memory data store
- **RediSearch** - Full-text search and secondary indexing
- **RedisJSON** - Native JSON document support
- **RedisTimeSeries** - Time-series data storage and queries
- **RedisGraph** - Graph database with Cypher queries
- **RedisBloom** - Probabilistic data structures (Bloom filters, etc.)

## Installation

### Docker (Recommended for Development)

```bash
# Run Redis Stack
docker run -d --name redis-stack \
  -p 6379:6379 \
  -p 8001:8001 \
  -v redis-stack-data:/data \
  redis/redis-stack:latest

# Redis is on port 6379
# RedisInsight (GUI) is on port 8001
```

### Docker Compose

```yaml
version: '3.8'
services:
  redis-stack:
    image: redis/redis-stack:latest
    container_name: redis-stack
    ports:
      - "6379:6379"
      - "8001:8001"
    volumes:
      - redis-stack-data:/data
    environment:
      - REDIS_ARGS=--save 60 1 --appendonly yes
    restart: unless-stopped

volumes:
  redis-stack-data:
```

### Linux (Ubuntu/Debian)

```bash
# Add Redis repository
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

# Install Redis Stack
sudo apt-get update
sudo apt-get install redis-stack-server

# Start service
sudo systemctl start redis-stack-server
sudo systemctl enable redis-stack-server
```

### macOS

```bash
# Using Homebrew
brew tap redis-stack/redis-stack
brew install redis-stack

# Start service
redis-stack-server
```

### Verify Installation

```bash
# Connect to Redis Stack
redis-cli

# Check loaded modules
MODULE LIST

# Expected output includes:
# 1) "name" "search"
# 2) "name" "ReJSON"
# 3) "name" "timeseries"
# 4) "name" "graph"
# 5) "name" "bf"
```

## Python Client Setup

```bash
pip install redis
```

```python
import redis
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query

# Connect to Redis Stack
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Verify connection
print(r.ping())  # True
```

## RediSearch: Full-Text Search

### Creating an Index

```python
from redis.commands.search.field import TextField, NumericField, TagField, GeoField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

# Define schema for product index
schema = (
    TextField("name", weight=5.0),
    TextField("description"),
    NumericField("price", sortable=True),
    TagField("category"),
    NumericField("stock"),
)

# Create index on hash keys prefixed with "product:"
r.ft("idx:products").create_index(
    schema,
    definition=IndexDefinition(
        prefix=["product:"],
        index_type=IndexType.HASH
    )
)
```

### Adding Documents

```python
# Add products using hashes
products = [
    {
        "id": "1",
        "name": "Wireless Bluetooth Headphones",
        "description": "High-quality noise-canceling headphones with 30-hour battery",
        "price": 149.99,
        "category": "electronics",
        "stock": 50
    },
    {
        "id": "2",
        "name": "Ergonomic Office Chair",
        "description": "Comfortable mesh chair with lumbar support",
        "price": 299.99,
        "category": "furniture",
        "stock": 25
    },
    {
        "id": "3",
        "name": "Portable Bluetooth Speaker",
        "description": "Waterproof speaker with deep bass and 12-hour battery",
        "price": 79.99,
        "category": "electronics",
        "stock": 100
    }
]

for product in products:
    r.hset(f"product:{product['id']}", mapping=product)
```

### Searching

```python
from redis.commands.search.query import Query

# Simple text search
results = r.ft("idx:products").search("bluetooth")
print(f"Found {results.total} products")
for doc in results.docs:
    print(f"  - {doc.name}: ${doc.price}")

# Search with filters
query = Query("*").add_filter(
    NumericFilter("price", 50, 200)
).sort_by("price", asc=True)

results = r.ft("idx:products").search(query)

# Full-text search with fuzzy matching
results = r.ft("idx:products").search("headphons~")  # Fuzzy match

# Search by category tag
results = r.ft("idx:products").search("@category:{electronics}")

# Aggregations
from redis.commands.search import aggregation as agg

request = agg.AggregateRequest("*").group_by(
    "@category",
    agg.reducers.count().alias("count"),
    agg.reducers.avg("@price").alias("avg_price")
)

results = r.ft("idx:products").aggregate(request)
```

## RedisJSON: Document Storage

### Storing JSON Documents

```python
import json

# Store JSON document
user = {
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "address": {
        "street": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zip": "94102"
    },
    "orders": [
        {"id": "ord001", "total": 150.00, "status": "delivered"},
        {"id": "ord002", "total": 89.99, "status": "processing"}
    ]
}

# Set entire document
r.json().set("user:1", "$", user)

# Get entire document
user_data = r.json().get("user:1")
print(user_data)
```

### Querying JSON Paths

```python
# Get specific field
name = r.json().get("user:1", "$.name")
print(f"Name: {name}")  # ["Alice Johnson"]

# Get nested field
city = r.json().get("user:1", "$.address.city")
print(f"City: {city}")  # ["San Francisco"]

# Get array element
first_order = r.json().get("user:1", "$.orders[0]")
print(f"First order: {first_order}")

# Get all order totals
totals = r.json().get("user:1", "$.orders[*].total")
print(f"Order totals: {totals}")  # [150.0, 89.99]
```

### Updating JSON

```python
# Update a field
r.json().set("user:1", "$.email", "alice.j@example.com")

# Append to array
new_order = {"id": "ord003", "total": 200.00, "status": "pending"}
r.json().arrappend("user:1", "$.orders", new_order)

# Increment numeric value
r.json().numincrby("user:1", "$.orders[0].total", 10.00)

# Delete a field
r.json().delete("user:1", "$.address.zip")
```

### Indexing JSON for Search

```python
# Create index on JSON documents
schema = (
    TextField("$.name", as_name="name"),
    TextField("$.email", as_name="email"),
    TextField("$.address.city", as_name="city"),
    NumericField("$.orders[*].total", as_name="order_total"),
)

r.ft("idx:users").create_index(
    schema,
    definition=IndexDefinition(
        prefix=["user:"],
        index_type=IndexType.JSON
    )
)

# Search JSON documents
results = r.ft("idx:users").search("@city:Francisco")
```

## RedisTimeSeries: Time-Series Data

### Creating Time Series

```python
# Create a time series for CPU metrics
r.ts().create(
    "ts:cpu:server1",
    labels={"metric": "cpu", "server": "server1", "datacenter": "us-east"}
)

r.ts().create(
    "ts:memory:server1",
    labels={"metric": "memory", "server": "server1", "datacenter": "us-east"}
)

# With retention and duplicate policy
r.ts().create(
    "ts:cpu:server2",
    retention_msecs=86400000,  # 24 hours
    duplicate_policy="last",  # Keep last value on duplicate timestamp
    labels={"metric": "cpu", "server": "server2", "datacenter": "us-west"}
)
```

### Adding Data Points

```python
import time

# Add single point
timestamp = int(time.time() * 1000)  # Milliseconds
r.ts().add("ts:cpu:server1", timestamp, 45.5)

# Add with automatic timestamp
r.ts().add("ts:cpu:server1", "*", 48.2)

# Bulk add
data_points = [
    (timestamp - 10000, 42.0),
    (timestamp - 5000, 43.5),
    (timestamp, 45.0),
]
r.ts().madd([("ts:cpu:server1", ts, val) for ts, val in data_points])
```

### Querying Time Series

```python
# Get range of data
now = int(time.time() * 1000)
one_hour_ago = now - 3600000

results = r.ts().range(
    "ts:cpu:server1",
    one_hour_ago,
    now
)
print(f"Data points: {results}")

# Get range with aggregation
results = r.ts().range(
    "ts:cpu:server1",
    one_hour_ago,
    now,
    aggregation_type="avg",
    bucket_size_msec=60000  # 1-minute buckets
)

# Get latest value
latest = r.ts().get("ts:cpu:server1")
print(f"Latest: timestamp={latest[0]}, value={latest[1]}")

# Query multiple series by labels
results = r.ts().mrange(
    one_hour_ago,
    now,
    filters=["metric=cpu"],
    aggregation_type="avg",
    bucket_size_msec=300000  # 5-minute buckets
)
```

### Downsampling Rules

```python
# Create aggregated time series
r.ts().create(
    "ts:cpu:server1:hourly",
    labels={"metric": "cpu", "server": "server1", "aggregation": "hourly"}
)

# Create downsampling rule
r.ts().createrule(
    "ts:cpu:server1",
    "ts:cpu:server1:hourly",
    aggregation_type="avg",
    bucket_size_msec=3600000  # 1 hour
)
```

## RedisGraph: Graph Database

### Creating a Graph

```python
# Create nodes and relationships
r.graph("social").query("""
    CREATE
    (alice:Person {name: 'Alice', age: 30, city: 'SF'}),
    (bob:Person {name: 'Bob', age: 32, city: 'NYC'}),
    (charlie:Person {name: 'Charlie', age: 28, city: 'LA'}),
    (diana:Person {name: 'Diana', age: 35, city: 'SF'}),
    (alice)-[:FRIENDS_WITH {since: 2020}]->(bob),
    (alice)-[:FRIENDS_WITH {since: 2019}]->(charlie),
    (bob)-[:FRIENDS_WITH {since: 2021}]->(diana),
    (charlie)-[:WORKS_WITH]->(diana)
""")
```

### Querying the Graph

```python
# Find all friends of Alice
result = r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'})-[:FRIENDS_WITH]->(friend)
    RETURN friend.name, friend.city
""")

for record in result.result_set:
    print(f"Friend: {record[0]}, City: {record[1]}")

# Find friends of friends
result = r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'})-[:FRIENDS_WITH*2]->(fof)
    WHERE fof.name <> 'Alice'
    RETURN DISTINCT fof.name
""")

# Find shortest path
result = r.graph("social").query("""
    MATCH path = shortestPath(
        (a:Person {name: 'Alice'})-[*]-(d:Person {name: 'Diana'})
    )
    RETURN path
""")

# Aggregate queries
result = r.graph("social").query("""
    MATCH (p:Person)
    RETURN p.city, COUNT(p) as count
    ORDER BY count DESC
""")
```

## RedisBloom: Probabilistic Data Structures

### Bloom Filter

```python
# Create a Bloom filter
r.bf().create("bf:emails", 0.01, 1000000)  # 1% error rate, 1M capacity

# Add items
r.bf().add("bf:emails", "user1@example.com")
r.bf().madd("bf:emails", "user2@example.com", "user3@example.com")

# Check if exists (may have false positives, never false negatives)
exists = r.bf().exists("bf:emails", "user1@example.com")  # True
not_exists = r.bf().exists("bf:emails", "unknown@example.com")  # False

# Bulk check
results = r.bf().mexists("bf:emails", "user1@example.com", "user4@example.com")
```

### Cuckoo Filter

```python
# Cuckoo filter (supports deletion)
r.cf().create("cf:usernames", 1000000)

# Add items
r.cf().add("cf:usernames", "alice")
r.cf().addnx("cf:usernames", "bob")  # Add only if not exists

# Check
exists = r.cf().exists("cf:usernames", "alice")

# Delete (unlike Bloom filter)
r.cf().delete("cf:usernames", "alice")
```

### Count-Min Sketch

```python
# Create CMS for counting
r.cms().initbyprob("cms:pageviews", 0.01, 0.001)

# Increment counts
r.cms().incrby("cms:pageviews", ["page:/home", 1, "page:/about", 1, "page:/home", 1])

# Query counts
count = r.cms().query("cms:pageviews", "page:/home")
print(f"Approximate views for /home: {count}")
```

### Top-K

```python
# Track top-k items
r.topk().create("topk:searches", k=10)

# Add items
r.topk().add("topk:searches", "redis tutorial", "python redis", "redis stack")
r.topk().incrby("topk:searches", ["redis tutorial", 5, "python redis", 3])

# Get top items
top_items = r.topk().list("topk:searches")
print(f"Top searches: {top_items}")

# Check if item is in top-k
is_top = r.topk().query("topk:searches", "redis tutorial")
```

## Complete Example: E-Commerce Application

```python
import redis
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
import time
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# --- Product Catalog with Search ---
def setup_product_index():
    try:
        r.ft("idx:products").dropindex()
    except:
        pass

    schema = (
        TextField("name", weight=5.0),
        TextField("description"),
        NumericField("price", sortable=True),
        TagField("category"),
        TagField("brand"),
        NumericField("rating", sortable=True),
    )

    r.ft("idx:products").create_index(
        schema,
        definition=IndexDefinition(prefix=["product:"], index_type=IndexType.JSON)
    )

def add_product(product_id, data):
    r.json().set(f"product:{product_id}", "$", data)

def search_products(query, category=None, min_price=None, max_price=None):
    search_query = query

    if category:
        search_query += f" @category:{{{category}}}"

    q = Query(search_query)

    if min_price is not None and max_price is not None:
        q.add_filter(NumericFilter("price", min_price, max_price))

    return r.ft("idx:products").search(q)

# --- User Sessions with JSON ---
def create_session(user_id, session_data):
    session_id = f"sess_{int(time.time())}_{user_id}"
    r.json().set(f"session:{session_id}", "$", {
        "user_id": user_id,
        "created_at": int(time.time()),
        "cart": [],
        **session_data
    })
    r.expire(f"session:{session_id}", 3600)  # 1 hour
    return session_id

def add_to_cart(session_id, product_id, quantity):
    cart_item = {"product_id": product_id, "quantity": quantity}
    r.json().arrappend(f"session:{session_id}", "$.cart", cart_item)

# --- Analytics with TimeSeries ---
def track_pageview(page, user_id=None):
    timestamp = int(time.time() * 1000)
    r.ts().add(f"ts:pageviews:{page}", timestamp, 1)

    # Update daily counter
    r.incr(f"counter:pageviews:{page}:{time.strftime('%Y-%m-%d')}")

def get_page_analytics(page, hours=24):
    now = int(time.time() * 1000)
    start = now - (hours * 3600000)

    return r.ts().range(
        f"ts:pageviews:{page}",
        start, now,
        aggregation_type="sum",
        bucket_size_msec=3600000  # Hourly
    )

# --- Fraud Detection with Bloom Filter ---
def setup_fraud_detection():
    try:
        r.bf().create("bf:suspicious_ips", 0.001, 100000)
    except:
        pass

def is_suspicious_ip(ip):
    return r.bf().exists("bf:suspicious_ips", ip)

def flag_suspicious_ip(ip):
    r.bf().add("bf:suspicious_ips", ip)

# --- Social Features with Graph ---
def setup_social_graph():
    r.graph("social").query("MATCH (n) DETACH DELETE n")

def follow_user(follower_id, followee_id):
    r.graph("social").query(f"""
        MERGE (a:User {{id: '{follower_id}'}})
        MERGE (b:User {{id: '{followee_id}'}})
        MERGE (a)-[:FOLLOWS]->(b)
    """)

def get_followers(user_id):
    result = r.graph("social").query(f"""
        MATCH (follower:User)-[:FOLLOWS]->(u:User {{id: '{user_id}'}})
        RETURN follower.id
    """)
    return [record[0] for record in result.result_set]

def get_recommendations(user_id):
    result = r.graph("social").query(f"""
        MATCH (me:User {{id: '{user_id}'}})-[:FOLLOWS]->(friend)-[:FOLLOWS]->(recommendation)
        WHERE NOT (me)-[:FOLLOWS]->(recommendation) AND me <> recommendation
        RETURN DISTINCT recommendation.id, COUNT(*) as mutual
        ORDER BY mutual DESC
        LIMIT 5
    """)
    return result.result_set

# Demo usage
if __name__ == "__main__":
    # Setup
    setup_product_index()
    setup_fraud_detection()
    setup_social_graph()

    # Add products
    add_product("1", {
        "name": "Wireless Headphones",
        "description": "Premium noise-canceling headphones",
        "price": 199.99,
        "category": "electronics",
        "brand": "AudioPro",
        "rating": 4.5
    })

    # Search
    results = search_products("wireless", category="electronics")
    print(f"Search results: {results.total}")

    # Track analytics
    track_pageview("/products/1")

    # Social
    follow_user("user1", "user2")
    follow_user("user1", "user3")
    follow_user("user2", "user4")

    recommendations = get_recommendations("user1")
    print(f"Recommendations: {recommendations}")
```

## Conclusion

Redis Stack provides a powerful, all-in-one solution for modern application needs:

- **RediSearch**: Full-text search and secondary indexing
- **RedisJSON**: Native JSON document storage
- **RedisTimeSeries**: Time-series data with aggregations
- **RedisGraph**: Graph relationships with Cypher queries
- **RedisBloom**: Probabilistic data structures

With a single deployment, you get the functionality that would otherwise require multiple specialized databases.

## Related Resources

- [Redis Stack Documentation](https://redis.io/docs/stack/)
- [RediSearch Documentation](https://redis.io/docs/stack/search/)
- [RedisJSON Documentation](https://redis.io/docs/stack/json/)
- [RedisTimeSeries Documentation](https://redis.io/docs/stack/timeseries/)
- [RedisGraph Documentation](https://redis.io/docs/stack/graph/)
- [RedisBloom Documentation](https://redis.io/docs/stack/bloom/)
