# How to Migrate from App Engine Memcache to Memorystore Redis for Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Memorystore, Redis, Caching, Migration

Description: A practical migration guide for moving from the deprecated App Engine Memcache service to Cloud Memorystore Redis with code examples and architecture tips.

---

If you have been running an application on App Engine for a while, there is a good chance you are using the built-in Memcache service. Google deprecated Memcache as part of the move away from the legacy App Engine bundled services. The recommended replacement is Cloud Memorystore for Redis, which gives you a fully managed Redis instance that works with both App Engine Standard and Flexible environments.

This migration is not just a search-and-replace of API calls. Memorystore runs on a separate instance in your VPC, so there is some networking setup involved. Let me walk through the entire migration process.

## Why Memorystore Over Memcache

The old App Engine Memcache had some significant limitations. The shared memcache was free but offered no guarantees - your cached data could be evicted at any time. Dedicated memcache cost money but still ran on Google-managed infrastructure you could not tune.

Memorystore Redis gives you a dedicated Redis instance with configurable memory, persistence options, and support for the full Redis command set. You get data structures like sorted sets, lists, and pub/sub that Memcache never supported. You can also connect to the same Redis instance from multiple services - Cloud Run, Compute Engine, GKE, and App Engine can all share the cache.

## Step 1: Create a Memorystore Redis Instance

First, create a Redis instance. A basic tier instance is fine for caching since you do not need replication:

```bash
# Create a basic tier Redis instance for caching
gcloud redis instances create app-cache \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic \
  --project=your-project-id
```

For production workloads where cache availability is critical, use the standard tier which provides automatic failover:

```bash
# Create a standard tier Redis instance with high availability
gcloud redis instances create app-cache \
  --size=2 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=standard \
  --project=your-project-id
```

After creation, note the host IP and port:

```bash
# Get the Redis instance connection details
gcloud redis instances describe app-cache --region=us-central1 \
  --format="value(host,port)"
```

This will output something like `10.0.0.3  6379`.

## Step 2: Set Up VPC Access Connector

Memorystore runs inside your VPC network, but App Engine Standard runs in a Google-managed environment. To bridge this gap, you need a Serverless VPC Access connector:

```bash
# Create a VPC Access connector
gcloud compute networks vpc-access connectors create cache-connector \
  --network=default \
  --region=us-central1 \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=3
```

The connector creates a small bridge between App Engine and your VPC. The IP range you specify should not overlap with any existing subnets.

## Step 3: Update app.yaml

Add the VPC connector to your App Engine configuration:

```yaml
# app.yaml - Updated with VPC access for Memorystore
runtime: python312

vpc_access_connector:
  name: "projects/your-project-id/locations/us-central1/connectors/cache-connector"
  egress_setting: private-ranges-only  # Only route VPC traffic through connector

env_variables:
  REDIS_HOST: "10.0.0.3"
  REDIS_PORT: "6379"
```

The `egress_setting: private-ranges-only` is important - it means only traffic destined for private IP ranges goes through the connector. Public internet traffic goes directly, which keeps latency low for external API calls.

## Step 4: Replace Memcache Code with Redis

Here is where the actual code migration happens. Let me show the before and after.

The old Memcache code typically looked like this:

```python
# OLD CODE - Using App Engine Memcache (deprecated)
from google.appengine.api import memcache

def get_user_profile(user_id):
    # Try to get from cache
    profile = memcache.get(f"user:{user_id}")
    if profile is not None:
        return profile

    # Cache miss - fetch from database
    profile = fetch_from_database(user_id)

    # Store in cache for 5 minutes
    memcache.set(f"user:{user_id}", profile, time=300)
    return profile
```

Here is the equivalent using Redis:

```python
# NEW CODE - Using Memorystore Redis
import redis
import json
import os

# Create a Redis connection pool (reuse across requests)
redis_pool = redis.ConnectionPool(
    host=os.environ.get("REDIS_HOST", "localhost"),
    port=int(os.environ.get("REDIS_PORT", 6379)),
    decode_responses=True,  # Return strings instead of bytes
    max_connections=10
)

def get_redis_client():
    # Get a client from the connection pool
    return redis.Redis(connection_pool=redis_pool)

def get_user_profile(user_id):
    r = get_redis_client()
    cache_key = f"user:{user_id}"

    # Try to get from cache
    cached = r.get(cache_key)
    if cached is not None:
        return json.loads(cached)

    # Cache miss - fetch from database
    profile = fetch_from_database(user_id)

    # Store in cache for 5 minutes (300 seconds)
    r.setex(cache_key, 300, json.dumps(profile))
    return profile
```

The main difference is that Redis stores strings, so you need to serialize and deserialize your data. JSON works for most cases. For complex Python objects, you might use pickle, but JSON is safer and more interoperable.

## Step 5: Handle Batch Operations

Memcache supported batch get and set operations. Redis has similar capabilities through pipelines:

```python
# OLD CODE - Memcache batch operations
values = memcache.get_multi(["key1", "key2", "key3"])
memcache.set_multi({"key1": "val1", "key2": "val2"})
```

```python
# NEW CODE - Redis pipeline for batch operations
def batch_get(keys):
    r = get_redis_client()
    # Use a pipeline to send all commands at once
    pipe = r.pipeline()
    for key in keys:
        pipe.get(key)
    # Execute all commands and get results
    results = pipe.execute()
    return {key: json.loads(val) if val else None for key, val in zip(keys, results)}

def batch_set(mapping, ttl=300):
    r = get_redis_client()
    pipe = r.pipeline()
    for key, value in mapping.items():
        pipe.setex(key, ttl, json.dumps(value))
    pipe.execute()
```

Pipelines reduce round trips to Redis, which is important when you are doing multiple operations.

## Step 6: Replace Memcache Increment/Decrement

If you were using Memcache for counters, Redis has native atomic increment operations:

```python
# OLD CODE - Memcache counters
memcache.incr("page_views", delta=1, initial_value=0)

# NEW CODE - Redis atomic increment
def increment_counter(key, delta=1):
    r = get_redis_client()
    # INCRBY is atomic - safe for concurrent access
    return r.incrby(key, delta)
```

Redis counters are actually better than Memcache counters because they persist across cache evictions (as long as your instance has memory).

## Step 7: Replace Memcache Compare-and-Set

The Memcache CAS (Compare-and-Set) operation prevented race conditions. Redis has an equivalent using WATCH and transactions:

```python
# Redis optimistic locking with WATCH
def safe_update(key, transform_func):
    r = get_redis_client()
    with r.pipeline() as pipe:
        while True:
            try:
                # Watch the key for changes
                pipe.watch(key)
                current_value = pipe.get(key)

                # Transform the value
                new_value = transform_func(json.loads(current_value) if current_value else None)

                # Start a transaction
                pipe.multi()
                pipe.set(key, json.dumps(new_value))
                pipe.execute()
                return new_value
            except redis.WatchError:
                # Another client modified the key - retry
                continue
```

## Testing the Migration

Before switching production traffic, test your Redis integration locally:

```bash
# Run a local Redis instance for testing
docker run -p 6379:6379 redis:7

# Set environment variables for local development
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

Write a simple test script to verify your caching layer works:

```python
# test_cache.py - Verify Redis caching works correctly
import time

def test_cache_operations():
    # Test basic set/get
    r = get_redis_client()
    r.setex("test:key", 60, json.dumps({"hello": "world"}))
    result = json.loads(r.get("test:key"))
    assert result["hello"] == "world", "Basic cache failed"

    # Test TTL expiration
    r.setex("test:expire", 1, "temporary")
    time.sleep(2)
    assert r.get("test:expire") is None, "TTL expiration failed"

    # Test batch operations
    batch_set({"test:a": "1", "test:b": "2"})
    results = batch_get(["test:a", "test:b"])
    assert results["test:a"] == "1", "Batch operations failed"

    print("All cache tests passed")
```

## Monitoring Redis Performance

Once you are running in production, monitor your Redis instance through Cloud Monitoring. Key metrics to watch:

- Memory usage percentage - if it hits 100%, Redis starts evicting keys
- Connected clients - watch for connection leaks
- Cache hit ratio - calculate this from `keyspace_hits / (keyspace_hits + keyspace_misses)`
- Command latency - should be sub-millisecond for most operations

You can view these in the Memorystore section of the Cloud Console or set up custom dashboards in Cloud Monitoring.

## Summary

Migrating from App Engine Memcache to Memorystore Redis involves setting up a Redis instance, configuring VPC connectivity, and updating your caching code. The code changes are straightforward - Redis supports all the same patterns as Memcache plus many more. The biggest win is getting a dedicated, reliable cache that you can monitor and tune, rather than the shared Memcache service that could evict your data without warning. Plan for about a day of development work for a typical application, plus testing time.
