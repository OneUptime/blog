# What Is New in Redis 8.0 (Vector Sets, Integrated Modules)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Set, Module, AI, Search

Description: Redis 8.0 merged previously separate modules into the core and introduced native Vector Sets as a first-class data type for AI and similarity search workloads.

---

Redis 8.0, released in 2025, marked a major architectural shift: the modules that were previously sold separately (Search, JSON, Time Series, Probabilistic) were merged into the open-source Redis core, and a new native Vector Sets data type was introduced.

## Integrated Modules

Before 8.0, features like RediSearch, RedisJSON, RedisTimeSeries, and RedisBloom were separate modules:

- Installed with `MODULE LOAD`
- Available only in Redis Stack or Redis Enterprise
- Not part of the open-source distribution

Redis 8.0 includes all of these in the core binary:

```bash
redis-server --version
# Redis server v=8.0.0 ...

# These now work without loading any module:
redis-cli JSON.SET doc $ '{"name":"Alice"}'
redis-cli FT.CREATE idx ON JSON ...
redis-cli TS.CREATE temperature
redis-cli BF.ADD myfilter item1
```

## Native Vector Sets

Vector Sets are a new first-class Redis data type designed for storing and querying high-dimensional vectors, enabling similarity search for AI and ML applications.

Add vectors to a Vector Set:

```bash
redis-cli VADD products:embeddings VALUES 5 \
  0.1 0.2 0.3 0.4 0.5 \
  product:1001

redis-cli VADD products:embeddings VALUES 5 \
  0.15 0.25 0.35 0.45 0.55 \
  product:1002
```

Find similar vectors:

```bash
redis-cli VSIM products:embeddings VALUES 5 \
  0.12 0.22 0.32 0.42 0.52 \
  WITHSCORES COUNT 5
# 1) "product:1001"
# 2) "0.98"
# 3) "product:1002"
# 4) "0.95"
```

Get vector count:

```bash
redis-cli VCARD products:embeddings
# (integer) 2
```

Get vector dimension:

```bash
redis-cli VDIM products:embeddings
# (integer) 5
```

## Vector Set Commands Overview

| Command | Description |
|---------|-------------|
| VADD | Add a vector to a Vector Set |
| VREM | Remove a vector |
| VSIM | Find similar vectors |
| VCARD | Count vectors |
| VDIM | Get vector dimension |
| VINFO | Get Vector Set statistics |
| VRANDMEMBER | Get random members |

## JSON Module Improvements

Redis 8.0 improved JSON performance and added support for more JSONPath operators:

```bash
# Filter JSON array elements
redis-cli JSON.GET orders $.items[?(@.price > 50)]
```

## Search (FT) Improvements

Redis 8.0 added hybrid vector and text search:

```bash
FT.SEARCH idx "(laptop)=>[KNN 5 @embedding $vec AS score]" \
  PARAMS 2 vec <binary-vector> \
  DIALECT 2
```

## Upgrade Considerations

When upgrading from Redis 7.x with modules loaded:

- Remove `loadmodule` directives from your Redis config file (the modules are now built-in)
- The integrated versions use the same commands and data formats
- RDB files from Redis Stack are compatible

## Summary

Redis 8.0 consolidated the Redis ecosystem by merging Search, JSON, Time Series, and Probabilistic modules into the open-source core, making advanced features available to all users. The new native Vector Sets data type brings similarity search to Redis without external plugins, positioning Redis as a complete AI data platform.
