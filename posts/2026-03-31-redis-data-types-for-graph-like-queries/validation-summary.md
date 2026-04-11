# Validation Summary: How to Use Redis Data Types for Graph-Like Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Sets, Sorted Sets, Pipelining)
- Python (redis-py client library)
- Graph data modeling (adjacency list representation)

## Sources Consulted
- Redis SADD command documentation: https://redis.io/docs/latest/commands/sadd/
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis SMEMBERS command documentation: https://redis.io/docs/latest/commands/smembers/
- Redis SISMEMBER command documentation: https://redis.io/docs/latest/commands/sismember/
- Redis ZRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zrangebyscore/
- Redis SINTER / SUNION command documentation: https://redis.io/docs/latest/commands/sinter/ and https://redis.io/docs/latest/commands/sunion/
- Redis SCARD command documentation: https://redis.io/docs/latest/commands/scard/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- RedisGraph end-of-life announcement (confirming deprecation claim)

## Issues Found

### 1. SADD commands included spurious "friends" member
- **What was wrong:** The three `SADD` commands in the "Modeling Edges with Sets" section included the word `friends` as if it were a subcommand or field name (e.g., `SADD graph:node:alice friends bob charlie dave`). `SADD` syntax is `SADD key member [member ...]`, so "friends" was being added as an actual set member alongside the neighbor names. This would corrupt neighbor lookups (`SMEMBERS` would return "friends" as a neighbor, and `SISMEMBER graph:node:alice bob` might still return 1 but the set would contain an extraneous entry).
- **What was changed:** Removed the word `friends` from all three `SADD` commands so they correctly add only neighbor names as members.

### 2. Self-referencing ZADD entry for paris
- **What was wrong:** The line `ZADD road:paris 0 paris` added paris as its own neighbor with weight 0. In an adjacency list graph model, a node should not appear in its own neighbor set (unless modeling self-loops, which was not the intent here). This entry is inconsistent with the Python `add_weighted_edge` function shown later, which never creates self-edges, and would pollute `get_neighbors` results.
- **What was changed:** Removed the `ZADD road:paris 0 paris` line.

## Review Notes
- The `node_degree` function is labeled as "degree centrality" but actually returns the raw degree count (via `SCARD`). Formally, degree centrality is normalized as degree/(n-1). This is a common informal usage and not technically wrong, but could be made more precise in a future revision.
- The `friends_of_friends` function uses `r.sunion(fof_keys)` passing a list directly. This works because redis-py's `list_or_args` helper unpacks lists, but `r.sunion(*fof_keys)` would be more explicit and idiomatic.
- The BFS function uses `r.smembers()` which returns all members at once. For nodes with very large neighbor sets, `SSCAN` would be more memory-efficient, but for the "moderate-sized graphs" scope stated in the post this is appropriate.
- All Python code uses `redis.Redis()` with default connection parameters (localhost:6379), which is standard for tutorial code.
- The claim that RedisGraph was deprecated is accurate — Redis, Inc. announced end-of-life for RedisGraph in early 2024.
