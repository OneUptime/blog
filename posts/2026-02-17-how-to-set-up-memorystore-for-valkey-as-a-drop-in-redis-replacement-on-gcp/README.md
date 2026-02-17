# How to Set Up Memorystore for Valkey as a Drop-In Redis Replacement on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Memorystore, Valkey, Redis, In-Memory Database

Description: Learn how to set up Memorystore for Valkey on GCP as a drop-in replacement for Redis, covering migration steps, compatibility details, and configuration.

---

When Redis changed its licensing from BSD to a dual license model, the open-source community forked it into Valkey. Google followed by adding Memorystore for Valkey as a managed service on GCP. If you are running Memorystore for Redis and want to switch to the open-source alternative, or if you are starting fresh and prefer Valkey, the transition is straightforward.

Valkey is wire-compatible with Redis, which means your existing Redis client libraries, commands, and application code work without changes. I migrated a couple of production workloads from Memorystore for Redis to Memorystore for Valkey, and the applications did not notice the difference.

## What is Valkey

Valkey is a community-driven fork of Redis 7.2.4, maintained by the Linux Foundation. It is fully open source under the BSD license. The core data structures, commands, and protocol are identical to Redis, so existing tools, libraries, and monitoring solutions all work with it.

Google's Memorystore for Valkey is a fully managed service that handles provisioning, patching, monitoring, and failover. It supports both cluster mode and standalone mode, just like Memorystore for Redis.

## Creating a Memorystore for Valkey Instance

Set up a Valkey instance using the gcloud CLI:

```bash
# Enable the Memorystore API if not already enabled
gcloud services enable memorystore.googleapis.com

# Create a standalone Valkey instance for development or small workloads
gcloud memorystore instances create my-valkey-instance \
  --region=us-central1 \
  --node-type=standard-small \
  --engine-version=VALKEY_8_0 \
  --replica-count=1 \
  --shard-count=1 \
  --network=projects/my-project/global/networks/default \
  --transit-encryption-mode=SERVER_AUTHENTICATION
```

For a cluster mode setup with multiple shards for higher throughput:

```bash
# Create a clustered Valkey instance for production workloads
# Multiple shards distribute data across nodes for higher throughput
gcloud memorystore instances create my-valkey-cluster \
  --region=us-central1 \
  --node-type=standard-medium \
  --engine-version=VALKEY_8_0 \
  --replica-count=2 \
  --shard-count=3 \
  --network=projects/my-project/global/networks/default \
  --transit-encryption-mode=SERVER_AUTHENTICATION \
  --deletion-protection
```

## Getting Connection Details

Retrieve the connection information for your Valkey instance:

```bash
# Get instance details including endpoints
gcloud memorystore instances describe my-valkey-instance \
  --region=us-central1

# Extract just the discovery endpoints
gcloud memorystore instances describe my-valkey-instance \
  --region=us-central1 \
  --format="yaml(discoveryEndpoints)"
```

## Connecting from Your Application

Since Valkey is wire-compatible with Redis, you use the same Redis client libraries. No code changes are needed for the connection itself.

Using Python with the redis-py library:

```python
# app.py
# Connect to Memorystore for Valkey using the standard Redis client
# No special Valkey client library is needed
import redis

# Standalone instance connection
client = redis.Redis(
    host='10.128.0.3',  # Your Valkey instance IP
    port=6379,
    decode_responses=True,
    ssl=True,  # Required when transit encryption is enabled
    ssl_cert_reqs=None,  # Use None for server-only authentication
)

# Verify the connection
info = client.info("server")
print(f"Connected to: {info.get('redis_version', 'unknown')}")
# This will show the Valkey version even though the field is called redis_version

# All standard Redis commands work identically
client.set("greeting", "Hello from Valkey!")
value = client.get("greeting")
print(f"Value: {value}")
```

For cluster mode connections:

```python
# cluster_connection.py
# Connect to a Memorystore Valkey cluster
from redis.cluster import RedisCluster

# Cluster mode uses the RedisCluster class
# It automatically discovers all nodes from the initial endpoint
cluster = RedisCluster(
    host='10.128.0.3',
    port=6379,
    decode_responses=True,
    ssl=True,
    ssl_cert_reqs=None,
)

# Cluster commands work transparently
cluster.set("user:1001:name", "Alice")
cluster.set("user:1002:name", "Bob")

# Keys are automatically routed to the correct shard
name = cluster.get("user:1001:name")
print(f"User name: {name}")

# Multi-key operations work if keys are on the same shard
# Use hash tags to ensure related keys land on the same shard
cluster.set("{session:abc}:token", "xyz123")
cluster.set("{session:abc}:expires", "3600")
cluster.set("{session:abc}:user_id", "1001")
```

## Migrating from Memorystore for Redis

If you have an existing Memorystore for Redis instance, here is the migration process.

Step 1: Export data from your Redis instance:

```bash
# Export the Redis data to a Cloud Storage bucket
gcloud redis instances export gs://my-migration-bucket/redis-export.rdb \
  my-redis-instance \
  --region=us-central1
```

Step 2: Import the data into your Valkey instance:

```bash
# Import the RDB file into the Valkey instance
# The RDB format is compatible between Redis and Valkey
gcloud memorystore instances import gs://my-migration-bucket/redis-export.rdb \
  my-valkey-instance \
  --region=us-central1
```

Step 3: Update your application configuration:

```python
# config.py
# Update your connection configuration
# The only thing that changes is the host address
import os

CACHE_CONFIG = {
    # Old Redis config (commented out)
    # "host": "10.128.0.5",  # Redis instance

    # New Valkey config
    "host": os.environ.get("VALKEY_HOST", "10.128.0.3"),
    "port": int(os.environ.get("VALKEY_PORT", "6379")),
    "ssl": True,
    "decode_responses": True,
}
```

## Testing Compatibility

Run a compatibility check to make sure everything works:

```python
# compatibility_test.py
# Verify that all your Redis operations work on Valkey
import redis
import json
import time

client = redis.Redis(
    host='10.128.0.3',
    port=6379,
    decode_responses=True,
    ssl=True,
    ssl_cert_reqs=None,
)

def test_basic_operations():
    """Test string operations."""
    client.set("test:string", "hello")
    assert client.get("test:string") == "hello"
    client.setex("test:ttl", 60, "expires soon")
    assert client.ttl("test:ttl") > 0
    print("String operations: PASS")

def test_data_structures():
    """Test hash, list, set, and sorted set operations."""
    # Hash
    client.hset("test:hash", mapping={"name": "Alice", "age": "30"})
    assert client.hget("test:hash", "name") == "Alice"

    # List
    client.rpush("test:list", "a", "b", "c")
    assert client.lrange("test:list", 0, -1) == ["a", "b", "c"]

    # Set
    client.sadd("test:set", "x", "y", "z")
    assert client.scard("test:set") == 3

    # Sorted set
    client.zadd("test:zset", {"alice": 100, "bob": 200})
    assert client.zrange("test:zset", 0, -1) == ["alice", "bob"]

    print("Data structures: PASS")

def test_lua_scripts():
    """Test Lua script execution."""
    script = """
    local val = redis.call('GET', KEYS[1])
    if val then
        return val .. ' from lua'
    end
    return 'not found'
    """
    client.set("test:lua", "hello")
    result = client.eval(script, 1, "test:lua")
    assert result == "hello from lua"
    print("Lua scripts: PASS")

def test_pub_sub():
    """Test Pub/Sub functionality."""
    pubsub = client.pubsub()
    pubsub.subscribe("test:channel")

    # Publish a message
    client.publish("test:channel", "test message")

    # Read the subscription confirmation and message
    messages = []
    for _ in range(2):
        msg = pubsub.get_message(timeout=2)
        if msg:
            messages.append(msg)

    pubsub.unsubscribe("test:channel")
    print("Pub/Sub: PASS")

def test_pipelines():
    """Test pipeline (batch) operations."""
    pipe = client.pipeline()
    for i in range(100):
        pipe.set(f"test:pipe:{i}", f"value_{i}")
    pipe.execute()

    pipe = client.pipeline()
    for i in range(100):
        pipe.get(f"test:pipe:{i}")
    results = pipe.execute()
    assert len(results) == 100
    print("Pipelines: PASS")

# Run all tests
test_basic_operations()
test_data_structures()
test_lua_scripts()
test_pub_sub()
test_pipelines()

# Cleanup test keys
for key in client.scan_iter("test:*"):
    client.delete(key)

print("\nAll compatibility tests passed!")
```

## Monitoring Valkey

Use the same monitoring approaches you use for Redis:

```bash
# Check instance metrics through gcloud
gcloud memorystore instances describe my-valkey-instance \
  --region=us-central1 \
  --format="yaml(nodeConfig,state)"
```

```python
# monitoring.py
# Monitor Valkey instance health and performance
import redis

client = redis.Redis(host='10.128.0.3', port=6379, ssl=True, ssl_cert_reqs=None)

def print_health_report():
    """Print a summary of Valkey instance health."""
    info = client.info()

    print("=== Valkey Health Report ===")
    print(f"Version: {info.get('redis_version')}")
    print(f"Uptime (days): {info.get('uptime_in_days')}")
    print(f"Connected clients: {info.get('connected_clients')}")
    print(f"Used memory: {info.get('used_memory_human')}")
    print(f"Peak memory: {info.get('used_memory_peak_human')}")
    print(f"Hit rate: {info.get('keyspace_hits', 0) / max(info.get('keyspace_hits', 0) + info.get('keyspace_misses', 1), 1) * 100:.1f}%")
    print(f"Total commands: {info.get('total_commands_processed')}")
    print(f"Ops/sec: {info.get('instantaneous_ops_per_sec')}")

print_health_report()
```

## Summary

Memorystore for Valkey is a true drop-in replacement for Memorystore for Redis on GCP. The setup process is similar, the same Redis client libraries work without modification, and you can migrate data using RDB export and import. The main reason to switch is licensing - Valkey is BSD-licensed open source, while newer Redis versions use a more restrictive license. From a functionality standpoint, all standard Redis features including data structures, Lua scripts, Pub/Sub, pipelines, and cluster mode work identically on Valkey. If you are starting a new project or planning a migration, Valkey on Memorystore gives you the same performance with an open-source foundation.
