# Redis OSS vs Redis Stack: Feature Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Stack, RediSearch, RedisBloom, RedisTimeSeries

Description: Compare Redis OSS and Redis Stack, covering the additional modules included in Redis Stack and when to use each distribution.

---

## Overview

Redis open source (OSS) is the core, classic Redis - strings, hashes, lists, sets, sorted sets, streams, and pub/sub. Redis Stack bundles Redis OSS with several powerful modules: RediSearch, RedisJSON, RedisTimeSeries, RedisBloom, and RedisGraph (deprecated). This post compares what each distribution offers.

## Core Redis OSS Data Structures

```bash
# Strings
SET user:123:name "Alice"
INCR user:123:views
APPEND user:123:log "login:2026-01-01"

# Hashes
HSET product:456 name "Widget" price 9.99 stock 100
HGETALL product:456

# Lists
LPUSH queue:jobs "job1" "job2"
RPOP queue:jobs
LRANGE queue:jobs 0 -1

# Sorted Sets
ZADD leaderboard 1500 "player:alice"
ZRANGE leaderboard 0 9 REV WITHSCORES

# Streams
XADD events * action "purchase" user "alice" amount "29.99"
XREAD COUNT 10 STREAMS events 0
```

## Redis Stack Modules

### RediSearch - Full-Text Search and Secondary Indexing

```bash
# Not available in Redis OSS - requires Redis Stack
FT.CREATE idx:products ON HASH PREFIX 1 "product:" \
  SCHEMA name TEXT description TEXT price NUMERIC category TAG

FT.SEARCH idx:products "@category:{electronics} @price:[10 100]"
FT.AGGREGATE idx:products "*" GROUPBY 1 @category REDUCE COUNT 0 AS count
```

### RedisJSON - Native JSON Storage

```bash
# Redis OSS: store JSON as a string (no query support)
SET config:app '{"theme":"dark","notifications":true}'

# Redis Stack: native JSON with path queries
JSON.SET user:123 $ '{"name":"Alice","address":{"city":"NYC"},"tags":["admin"],"score":0}'
JSON.GET user:123 $.address.city
JSON.ARRAPPEND user:123 $.tags '"moderator"'
JSON.NUMINCRBY user:123 $.score 10
```

```python
import redis

r = redis.Redis()

# Redis Stack JSON operations
r.json().set("user:123", "$", {
    "name": "Alice",
    "score": 100,
    "tags": ["admin"]
})

name = r.json().get("user:123", "$.name")
r.json().numincrby("user:123", "$.score", 50)
r.json().arrappend("user:123", "$.tags", "moderator")
```

### RedisTimeSeries - Time-Series Data

```bash
# Not in Redis OSS - requires Redis Stack
TS.CREATE metrics:cpu RETENTION 86400000 LABELS host server1
TS.ADD metrics:cpu * 72.5
TS.RANGE metrics:cpu - + AGGREGATION avg 60000  # avg per minute
TS.MRANGE - + FILTER host=server1              # multi-key range
```

### RedisBloom - Probabilistic Data Structures

```bash
# Bloom filter - membership testing
BF.RESERVE bf:emails 0.01 1000000  # 1% error, 1M capacity
BF.ADD bf:emails "user@example.com"
BF.EXISTS bf:emails "user@example.com"  # probably yes
BF.EXISTS bf:emails "other@example.com" # definitely no (if not added)

# Count-Min Sketch - frequency estimation
CMS.INITBYDIM cms:events 200 5
CMS.INCRBY cms:events "page_view" 1
CMS.QUERY cms:events "page_view"

# Top-K - track most frequent items
TOPK.RESERVE topk:queries 10 50 4 0.9
TOPK.ADD topk:queries "redis tutorial" "redis vs elasticsearch"
TOPK.LIST topk:queries WITHCOUNT

# HyperLogLog (available in OSS too)
PFADD unique:visitors "user1" "user2" "user3"
PFCOUNT unique:visitors
```

## Comparing Redis OSS and Redis Stack

```text
Feature                     | Redis OSS | Redis Stack
----------------------------|-----------|-------------
Strings, hashes, lists      | Yes       | Yes
Sets, sorted sets           | Yes       | Yes
Streams, pub/sub            | Yes       | Yes
HyperLogLog                 | Yes       | Yes
Full-text search (FT.*)     | No        | Yes (RediSearch)
Native JSON (JSON.*)        | No        | Yes (RedisJSON)
Time-series (TS.*)          | No        | Yes (RedisTimeSeries)
Bloom / CMS / TopK (BF.*)   | No        | Yes (RedisBloom)
Vector search (vector)      | No        | Yes (RediSearch)
Redis Insight UI included   | No        | Yes
```

## Running Redis Stack

```bash
# Docker
docker run -d --name redis-stack \
  -p 6379:6379 -p 8001:8001 \
  redis/redis-stack:latest

# Redis Insight UI at http://localhost:8001

# Or just the server without the UI
docker run -d --name redis-stack-server \
  -p 6379:6379 \
  redis/redis-stack-server:latest
```

## Loading Individual Modules on Redis OSS

```bash
# Load a specific module in redis.conf
loadmodule /path/to/redisearch.so
loadmodule /path/to/rejson.so

# Or at startup
redis-server --loadmodule /path/to/redisearch.so
```

## When to Use Redis OSS

- You only need core data structures (strings, hashes, sorted sets, streams)
- You want the most lightweight Redis with no extra dependencies
- You are deploying on a managed provider that does not offer Redis Stack
- You load specific modules individually rather than using the bundle

## When to Use Redis Stack

- You need full-text search, native JSON, time-series, or probabilistic structures
- You want a single bundle with all common modules pre-configured
- You want the bundled Redis Insight UI for visualization
- You are prototyping and want all capabilities available immediately

## Summary

Redis OSS provides the core in-memory data structures that Redis is famous for - fast, simple, and battle-tested. Redis Stack adds RediSearch, RedisJSON, RedisTimeSeries, and RedisBloom on top, making it a more capable platform for modern application development without running separate databases. Use Redis OSS for pure caching and core data structures; use Redis Stack when you need search, JSON querying, time-series, or probabilistic data structures in one deployment.
