# Validation Summary: How to Scale Redis for 1 Million Concurrent Connections

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (server configuration, CLI, CLIENT LIST, INFO)
- Linux kernel tuning (sysctl, ulimit, file descriptors)
- Twemproxy (nutcracker) - Redis proxy
- Envoy Proxy - connection pooling / circuit breaking
- Python redis-py client library
- Prometheus / Redis Exporter for monitoring
- Docker

## Sources Consulted
- Redis official documentation for `maxclients`, `tcp-backlog`, `tcp-keepalive`, `timeout`, and `bind-source-addr` directives
- Redis `CLIENT LIST` command output format documentation
- Envoy Proxy cluster configuration reference (circuit_breakers.thresholds schema)
- Twemproxy (nutcracker) configuration format and `server_connections` parameter
- Linux kernel documentation for sysctl network parameters (`somaxconn`, `tcp_max_syn_backlog`, `ip_local_port_range`, `tcp_tw_reuse`, `tcp_fin_timeout`)
- Linux `limits.conf` file format for `nofile` settings
- redis-py (Python Redis client) `ConnectionPool` API reference

## Issues Found

### 1. Envoy cluster config: `max_connections` placement (Line ~83)
- **What was wrong:** `max_connections: 500` was placed as a top-level field directly under the cluster definition. This is not a valid Envoy cluster field at that level.
- **What was changed:** Moved `max_connections` under `circuit_breakers.thresholds[]`, which is the correct location in Envoy's configuration schema for limiting upstream connections.
- **Why:** Envoy enforces connection limits through its circuit breaker mechanism, not as a direct cluster-level setting. The original config would be rejected by Envoy's config validation.

### 2. CLIENT LIST awk command missing port strip (Line ~125)
- **What was wrong:** The command `redis-cli CLIENT LIST | awk -F'[= ]' '{print $4}' | sort | uniq -c | sort -rn | head -20` extracted the full `addr` field (e.g., `127.0.0.1:54321`) including the ephemeral client port. Since each connection has a unique ephemeral port, `uniq -c` would count 1 for every entry, making the command useless for identifying which IPs have the most connections.
- **What was changed:** Added `cut -d: -f1` after the awk to strip the port, so grouping and counting operates on IP addresses only.
- **Why:** The purpose of the command is to identify top clients by IP. Without stripping the port, every connection appears unique and the aggregation is meaningless.

## Review Notes
- The `bind-source-addr ""` directive in the Redis config section is valid (introduced in Redis 6.2) but controls outbound source address for replication/cluster traffic, not inbound client connections. It is not directly relevant to scaling inbound connections to 1 million, though it is not incorrect to include.
- The Twemproxy config comment mentions "200 backend connections" but the shown config does not set `server_connections` (defaults to 1 per server). The multiplexing concept is correct, but the specific number in the comment is not reflected in the configuration.
- The Twemproxy config block uses a `bash` language tag but the content is YAML. This is a minor formatting issue that does not affect technical accuracy.
