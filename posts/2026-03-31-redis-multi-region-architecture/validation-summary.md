# Validation Summary: How to Design a Multi-Region Redis Architecture

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (open-source) — replication, Sentinel, Lua scripting
- Redis Enterprise — CRDT-based active-active (mentioned)
- Python redis-py client library
- Redis Sentinel for automatic failover

## Sources Consulted
- Redis official documentation: REPLICAOF command and replication configuration (https://redis.io/docs/latest/commands/replicaof/)
- Redis official documentation: INFO replication output fields (https://redis.io/docs/latest/commands/info/)
- Redis official documentation: Sentinel configuration (https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- Redis Enterprise documentation: Active-Active Geo-Distribution with CRDTs (https://redis.io/docs/latest/operate/rs/databases/active-active/)
- redis-py documentation: Redis client API, eval(), info(), ping() (https://redis-py.readthedocs.io/)
- Valkey project documentation (https://valkey.io/)

## Issues Found

### Issue 1: Incorrect attribution of CRDT active-active to Valkey
- **What was wrong:** The post stated "Active-Active (Redis Enterprise / Valkey)" implying Valkey supports CRDT-based active-active replication. Valkey is an open-source fork of Redis and does not include CRDT-based active-active geo-distribution — that is a Redis Enterprise commercial feature.
- **What was changed:** Removed "/ Valkey" from the active-active description, leaving it as "Active-Active (Redis Enterprise)".
- **Why:** Attributing this capability to Valkey is factually incorrect and could mislead readers into choosing Valkey expecting active-active CRDT support.

### Issue 2: Replication lag monitoring function was incorrect
- **What was wrong:** The `get_replication_lag` function queried `master_repl_offset` and `slave_repl_offset` from a single Redis connection. On a replica, `master_repl_offset` reflects the replica's own replication offset, and `slave_repl_offset` is essentially the same value. Computing their difference from a single connection always yields approximately zero, making the function useless for detecting actual lag.
- **What was changed:** Rewrote the function to query `master_repl_offset` from both the primary (`WRITE_REGION`) and the replica (`REDIS_REGIONS[region]`), then compute the difference. This correctly measures how far behind the replica is relative to the master's current write position.
- **Why:** The original code would never detect replication lag, defeating the purpose of the monitoring section entirely.

## Review Notes
- The Sentinel configuration shown is minimal and appropriate for a blog post, but production deployments would need additional settings like `sentinel auth-pass`, `sentinel parallel-syncs`, and typically at least 3 Sentinel instances across different availability zones.
- The CRDT counter example using `INCR` is conceptually sound but oversimplified — in a true active-active setup, each region would need its own namespaced counter key (e.g., `counter:{region}`) to avoid conflicts, with a merge function to sum them. A bare `INCR` on the same key from multiple regions without CRDT infrastructure would still produce conflicts.
- The LWW Lua script is correct and a good pattern, though in production you'd want to register it with `SCRIPT LOAD` / `EVALSHA` to avoid retransmitting the script on every call.
- The health check using `ping()` is a minimal liveness check. Production systems would also want to verify replication status (`master_link_status`) and lag thresholds before routing traffic to a replica.
