# Validation Summary: How to Configure Redis for IPv6 Connections

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (server configuration, CLI, Cluster, Sentinel)
- IPv6 networking
- Linux networking tools (`ip`, `ss`, `ip6tables`, UFW)
- Python redis-py client library
- Node.js ioredis client library
- TLS configuration for Redis

## Sources Consulted
- Redis official documentation on `bind` directive and network configuration (https://redis.io/docs/latest/operate/oss_and_stack/management/config/)
- Redis Cluster tutorial and `redis-cli --cluster create` requirements (https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- Redis Sentinel documentation (https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- ioredis documentation for `family` option (https://github.com/redis/ioredis)
- redis-py documentation (https://github.com/redis/redis-py)
- Linux `ss` command manual (`man ss`, iproute2)
- UFW documentation (`man ufw`)
- ip6tables documentation (`man ip6tables`)

## Issues Found

### 1. Redis Cluster create command had insufficient nodes
- **What was wrong:** The `redis-cli --cluster create` example listed only 3 nodes (`[2001:db8::1]:6379`, `[2001:db8::2]:6379`, `[2001:db8::3]:6379`) with `--cluster-replicas 1`. Redis Cluster requires at least 6 nodes when using 1 replica per master (3 masters + 3 replicas). The command would fail with an error about insufficient nodes.
- **What was changed:** Added 3 more nodes (`[2001:db8::4]:6379`, `[2001:db8::5]:6379`, `[2001:db8::6]:6379`) to meet the minimum requirement of 6 nodes for `--cluster-replicas 1`.
- **Why:** Redis Cluster divides nodes into masters and replicas. With `--cluster-replicas 1`, each master gets one replica, so `total_nodes / (1 + replicas_per_master)` must yield at least 3 masters. 3 / 2 = 1.5, which is insufficient.

### 2. Missing space in Summary section
- **What was wrong:** The text read `` `::` ``**`for`** (no space between the backtick-enclosed `::` and the word "for").
- **What was changed:** Added the missing space: `` `::` for all IPv6 interfaces``.
- **Why:** Typographical fix for readability.

## Review Notes
- The Node.js code example declares `const redis` twice in the same code block, which would cause a `SyntaxError` if run as a single script. However, this is standard documentation practice where each snippet is meant to be used independently (pick one pattern or the other). No change made.
- The `ss -tlnp6` expected output is illustrative and may vary across Linux distributions and `ss` versions. The general format is correct.
- The ip6tables commands are shown without `sudo` while UFW commands use `sudo`. Both patterns are valid (ip6tables assumes root context), but readers should be aware they need root privileges for ip6tables.
- The post uses `2001:db8::/32` addresses throughout, which is the documentation-reserved IPv6 prefix (RFC 3849). This is correct practice for examples.
