# Validation Summary: How to Handle Redis Network Partitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server configuration, Sentinel, Cluster)
- Redis Sentinel (failover, event monitoring)
- Redis Cluster (slot coverage, node timeout)
- Python (redis-py client library)
- Node.js (ioredis client library)
- iptables (network partition simulation)

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/management/sentinel/
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis replication documentation (min-replicas-to-write): https://redis.io/docs/management/replication/
- redis-py documentation: https://redis-py.readthedocs.io/
- ioredis documentation: https://github.com/redis/ioredis

## Issues Found
1. **Missing `import json` in Read-Through with Fallback example**: The code called `json.loads(cached)` but did not import the `json` module. Added `import json` to the import block.

## Review Notes
- The section heading "min-slaves-to-write Configuration" uses the old deprecated name, while the actual config directives correctly use the newer `min-replicas-to-write` / `min-replicas-max-lag` names (renamed in Redis 5.0). This is a minor inconsistency in the heading only; the config itself is correct.
- The Sentinel monitoring Python example uses `StrictRedis` which is a legacy alias for `Redis` in current redis-py. It still works but modern code uses `Redis` directly. Not changed since it remains functional.
- The Sentinel quorum discussion simplifies slightly: technically, the quorum is configurable per monitored master and controls ODOWN detection, while a separate majority vote is required to authorize the actual failover. The practical guidance (use 3 sentinels, 2 must agree) is correct for standard deployments.
- The `CACHE_AVAILABLE = True` assignment inside the `if cached:` block (Read-Through example) is redundant since execution only reaches that point when `CACHE_AVAILABLE` is already `True`. Not harmful, but unnecessary.
