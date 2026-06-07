# Validation Summary: How to Configure Redis Sentinel Automatic Failover

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server and replication)
- Redis Sentinel (monitoring, failover, quorum, election)
- redis-py (Python Redis client)
- ioredis (Node.js Redis client)
- go-redis v9 (Go Redis client)
- Bash shell scripting for operations
- Mermaid diagrams (flowchart, sequenceDiagram, timeline)

## Sources Consulted
- Official Redis Sentinel docs: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Official Redis INFO command reference: https://redis.io/docs/latest/commands/info/
- Redis Sentinel reference sentinel.conf (notification-script and client-reconfig-script arg contracts)
- redis-py Sentinel API: https://redis.readthedocs.io/en/stable/connections.html (Sentinel.slave_for, master_for, discover_master, discover_slaves)
- go-redis v9 source: https://github.com/redis/go-redis/blob/master/sentinel.go (FailoverOptions fields)
- ioredis README and SentinelConnector behavior: https://github.com/redis/ioredis

## Issues Found

1. **Sentinel notification-script argument count (FIXED)** — The bash script in the "Notification Scripts" section consumed `$1`–`$6` as event type, event description, master name, role, IP, and port. Per the official `sentinel.conf` comments and Redis Sentinel docs, `notification-script` receives **exactly two** arguments: the event type and the event description. The blog appears to have conflated this with `client-reconfig-script`, which does receive a longer positional argument list. I rewrote the script to use only `$1` (EVENT_TYPE) and `$2` (EVENT_DESCRIPTION), updated the log/webhook/Slack payloads to include the description instead of empty IP/port fields, and simplified the per-event messages so they no longer reference undefined variables. A short comment notes that the `+switch-master` description carries the new master address for callers who want to parse it.

2. **ioredis Sentinel-specific event handlers (FIXED)** — The Node.js example registered `redis.on('+switch-master', ...)`, `redis.on('+sentinel', ...)`, and `redis.on('-sentinel', ...)` on the main ioredis client. The ioredis Redis client does not re-emit these Sentinel pub/sub channel events; failover is handled internally by `SentinelConnector` and only the standard lifecycle events (`connect`, `ready`, `error`, `close`, `reconnecting`) are exposed. The three Sentinel-specific handlers were silent no-ops. I removed them and added a short comment explaining that observing raw Sentinel pub/sub messages requires a dedicated Sentinel connection with `PSUBSCRIBE`.

## Review Notes

- **Quorum framing**: The post presents `quorum = (N/2) + 1` as "the formula" for the Sentinel `quorum` parameter. Strictly speaking, the configurable `quorum` only governs ODOWN detection, while the failover authorization itself always requires a majority of *all* Sentinels regardless of `quorum`. In practice, the operator-set value of `quorum` *should* equal `(N/2)+1`, so the recommendation is sound — just slightly conflated with a separate Raft-style majority requirement. Not corrected because the operational advice is right.
- **Replica selection criteria**: The three listed criteria (replica-priority → replication offset → run ID) are in the correct order, but the post omits the preceding filter that excludes replicas disconnected longer than `(down-after-milliseconds * 10) + ms_since_master_SDOWN`. A minor completeness gap, not an error.
- **redis-py `retry_on_timeout`**: Still supported in current redis-py (5.x) but considered legacy; newer code uses the `retry=` parameter with a `Retry` object. The blog's usage works as written.
- **`slave_for` / `discover_slaves` naming**: Intentionally retained in redis-py for backward compatibility. The blog's method names are correct.
- **INFO replication field names**: The post relies on `role:master|slave` and `connected_slaves` in the INFO output. Redis intentionally preserves the legacy "slave" wording in this output for protocol compatibility, so the parsing remains correct on Redis 6.x and 7.x.
- **Go `contains` helper**: The hand-rolled `contains` in the go-redis example is functionally correct but reinvents `strings.Contains`. Stylistic only, no behavioral issue.
