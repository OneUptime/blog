# Validation Summary: How to Use CLUSTER NODES in Redis to List All Cluster Nodes

## Status
validated

## Post Type
Reference / Command Guide

## Technologies Covered
- Redis Cluster
- `CLUSTER NODES` command
- `CLUSTER SHARDS` command (Redis 7.0+)
- redis-cli

## Sources Consulted
- Official Redis documentation for CLUSTER NODES (https://redis.io/commands/cluster-nodes/)
- Official Redis documentation for CLUSTER SHARDS (https://redis.io/commands/cluster-shards/)

## Issues Found

1. **Non-hex characters in sample node IDs**: Several example node IDs contained characters outside the hexadecimal range (g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z), contradicting the post's own description of node IDs as "40-character hex node identifier." Replaced `g7h8i9j0ef12`, `j1k2l3m4n5o6`, `p7q8r9s0t1u2`, and `v3w4x5y6z7a8` with valid hex IDs (`c7d8e9f0ef12`, `f1a2b3c4d5e6`, `a7b8c9d0e1f2`, `b3c4d5e6f7a8`) across all sections.

2. **Inaccurate `ping-sent` field description**: The post described `ping-sent` as "Timestamp of last PING sent." Per the Redis docs, it is the milliseconds unix time of the currently active (pending) ping, or 0 if no ping is pending. Updated to match the official definition.

3. **Field name `pong-received` should be `pong-recv`**: The Redis documentation uses `pong-recv`, not `pong-received`. Corrected the field name in the format template and the table.

4. **Missing `nofailover` flag**: The node flags table was missing the `nofailover` flag, which indicates a replica will not attempt automatic failover. Added it to the table.

## Review Notes
- The sample node IDs are shortened (12 characters) rather than the full 40 characters described. This is acceptable for readability in a blog post, and the table correctly documents the actual length.
- The `grep master | grep -v slave` pattern in the parsing example is functionally redundant since a node cannot have both `master` and `slave` flags, but it is not incorrect and serves as defensive filtering.
- The post correctly notes that `CLUSTER SHARDS` (Redis 7.0+) is the structured alternative for programmatic parsing.
