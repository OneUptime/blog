# Validation Summary: How to Implement Redis Sentinel Automatic Failover

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Redis (server and replication)
- Redis Sentinel (high availability / failover)
- redis-py (Python client)
- ioredis (Node.js client)
- go-redis v9 (Go client)
- Prometheus / redis_exporter
- Bash scripting (operational tooling, chaos testing with iptables/tc)

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis `sentinel.conf` reference in upstream repo: https://raw.githubusercontent.com/redis/redis/unstable/sentinel.conf
- Redis configuration directives: https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/
- Redis replication / `min-replicas-to-write`, `min-replicas-max-lag`: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- redis-py Sentinel module: https://redis.readthedocs.io/en/stable/_modules/redis/sentinel.html
- ioredis Sentinel docs and events: https://github.com/redis/ioredis (README and issue #1314)
- go-redis v9 FailoverClient: https://pkg.go.dev/github.com/redis/go-redis/v9
- redis_exporter: https://github.com/oliver006/redis_exporter

## Issues Found
1. **Invalid Sentinel directive `sentinel log-level notice`** — The Redis Sentinel configuration uses the standard server directive `loglevel` (no `sentinel` prefix and no hyphen). The accompanying comment ("Minimum time between logging identical messages") also did not describe what the directive does. Replaced with `loglevel notice` and an accurate comment describing the valid levels (`debug, verbose, notice, warning`).

2. **Incorrect description of `SENTINEL ckquorum`** — The comment claimed this command checks whether the master is in ODOWN state. Per the official Redis docs, `SENTINEL ckquorum` checks whether the current Sentinel can reach the quorum needed to mark a master ODOWN *and* the majority needed to authorize failover — it does not report ODOWN status. Updated the comment to: "Check if Sentinels can reach quorum and majority for failover".

3. **Incorrect ioredis event listener for `+switch-master`** — The Node.js example registered `redis.on('+switch-master', ...)`. ioredis does not expose Sentinel pub/sub channels as client events; it only emits standard connection lifecycle events (`connect`, `ready`, `error`, `close`, `reconnecting`, `end`, `select`). The handler would never fire. Replaced with a `reconnecting` handler that accurately documents how ioredis discovers a new master after failover (by re-querying Sentinels on reconnect). Subscribing to `+switch-master` would require a separate pub/sub connection to a Sentinel node.

## Review Notes
- The `discover_slaves` and `slave_for` methods used in the redis-py example are still valid and present in current redis-py releases, though they internally send the legacy `SENTINEL SLAVES` command. redis-py has not (yet) shipped `discover_replicas` / `replica_for` equivalents (see redis-py issues #2246 and #3371). The current code works; no change needed, but readers may want to track that for future redis-py releases.
- The replica selection pseudo-code uses a simplified `lag_seconds < 10` heuristic. The actual Sentinel logic filters replicas whose INFO has not been received recently (roughly `5 * down-after-milliseconds`) plus a disconnect-time check. The code is labeled "pseudo-code" so the simplification is acceptable for explanatory purposes.
- The monitoring bash script uses `redis-cli ... $@` (unquoted). It works for the current usage but would be safer as `"$@"`. Not a correctness bug for the inputs shown.
- `sentinel resolve-hostnames` and `sentinel announce-hostnames` (Redis 6.2+) are correctly used.
- All other configuration directives (`min-replicas-to-write`, `min-replicas-max-lag`, `replica-priority`, `repl-diskless-sync`, `sentinel deny-scripts-reconfig`, `sentinel announce-ip`/`announce-port`, etc.) verified against current Redis docs.
