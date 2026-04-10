# Redis vs Valkey: Understanding the Fork

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Valkey, Open Source, Licensing, Fork

Description: Understand the Redis license change that led to the Valkey fork, the key differences between them, and how to decide which to use in 2025.

---

## Background: Why Valkey Exists

In March 2024, Redis Ltd. changed Redis's license from BSD to a dual-license model (RSALv2/SSPLv1). Redis 8.0 later added AGPLv3 as a third license option. The original RSAL/SSPL change meant Redis could no longer be used as-is by cloud providers to offer managed Redis services without a commercial agreement with Redis Ltd.

In response, the Linux Foundation, AWS, Google, Oracle, Ericsson, and others created **Valkey** - a true open-source fork of Redis 7.2.4 under the BSD 3-Clause license.

```text
Redis 7.2.x (BSD) -> License change -> Redis 8.x (RSALv2/SSPLv1/AGPLv3)
Redis 7.2.4 (BSD) -> Fork -> Valkey 7.2 / 8.x (BSD)
```

## License Differences

```text
Redis (8.x+):
- Redis Source Available License (RSALv2)
- Server-Side Public License (SSPLv1)
- GNU Affero General Public License v3 (AGPLv3) - added in Redis 8.0
- Free for most users and businesses
- Commercial license required under RSAL/SSPL for:
  - Cloud providers offering managed Redis
  - Competitive database products

Valkey:
- BSD 3-Clause License
- Fully open-source
- No restrictions on use, modification, distribution
- Same license as the original BSD Redis
```

## Technical Compatibility

Valkey is wire-protocol compatible with Redis. Existing Redis clients work unchanged:

```python
# Python - works with both Redis and Valkey without code changes
import redis

# Connecting to Redis
r_redis = redis.Redis(host="redis-server.example.com", port=6379)

# Connecting to Valkey (same client, different server)
r_valkey = redis.Redis(host="valkey-server.example.com", port=6379)

# Identical API
r_redis.set("key", "value")
r_valkey.set("key", "value")

result_redis = r_redis.get("key")
result_valkey = r_valkey.get("key")
```

```bash
# Redis CLI connects to Valkey identically
redis-cli -h valkey-server -p 6379 PING
# PONG

# Valkey also ships its own CLI
valkey-cli -h valkey-server -p 6379 PING
# PONG
```

## Data Migration

Because the protocols are identical, migrating from Redis to Valkey is straightforward:

```bash
# Method 1: RDB snapshot migration
# On Redis server
BGSAVE
# Copy dump.rdb to Valkey server's data directory
# Start Valkey - it loads the RDB file automatically

# Method 2: SLAVEOF / REPLICAOF
# Connect Valkey as a replica of Redis to sync data
REPLICAOF redis-master.example.com 6379
# Wait for sync, then promote Valkey to primary
REPLICAOF NO ONE
```

## Feature Differences in 2025

Valkey has been moving faster than Redis in some areas after the fork:

```text
Feature                    | Redis 8.x  | Valkey 8.x
---------------------------|------------|------------
Wire protocol compatibility| -          | Yes (with Redis)
Multi-threaded I/O         | Yes        | Yes (improved)
RESP3 protocol             | Yes        | Yes
Cluster support            | Yes        | Yes
Module API                 | Yes        | Yes (compatible)
License                    | RSALv2/SSPLv1/AGPLv3 | BSD
Cloud managed offering     | Redis Cloud| AWS MemoryDB, GCP Memorystore
Active development pace    | Moderate   | Fast (Linux Foundation)
```

## Configuration Compatibility

Most Redis configuration parameters work in Valkey:

```text
# redis.conf / valkey.conf
bind 0.0.0.0
port 6379
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
```

## Choosing Between Redis and Valkey

```python
def should_use_valkey() -> bool:
    """
    Decision guide for Redis vs Valkey
    """
    reasons_for_valkey = [
        "Require fully open-source (BSD) license",
        "Using AWS (MemoryDB for Valkey)",
        "Using GCP (Memorystore for Valkey)",
        "Concerned about future license changes",
        "Want to avoid vendor lock-in",
        "Contributing to Linux Foundation ecosystem"
    ]

    reasons_for_redis = [
        "Need Redis-specific modules (RedisSearch, RedisJSON, etc.)",
        "Using Redis Cloud managed service",
        "Existing Redis Ltd. commercial relationship",
        "Need Redis Stack features not yet in Valkey"
    ]

    # For most new projects, Valkey is the safe default
    # For existing Redis projects, Valkey is a drop-in replacement
    return True
```

## Cloud Provider Support

```text
Cloud Provider | Redis Offering      | Valkey Offering
---------------|---------------------|------------------
AWS            | ElastiCache (Redis) | MemoryDB for Valkey
               |                     | ElastiCache (Valkey)
GCP            | Memorystore (Redis) | Memorystore (Valkey)
Azure          | Azure Cache Redis   | No Valkey yet
DigitalOcean   | Managed Redis       | Managed Valkey
```

## Summary

Valkey is a BSD-licensed, fully open-source fork of Redis 7.2.4 created in response to Redis Ltd.'s license change. It is wire-protocol compatible with Redis, meaning existing applications and clients work without code changes. For new projects without specific requirements for Redis modules or Redis Cloud, Valkey is the recommended default due to its permissive license, active Linux Foundation governance, and strong cloud provider support from AWS and GCP.
