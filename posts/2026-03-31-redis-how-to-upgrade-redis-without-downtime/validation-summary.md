# Validation Summary: How to Upgrade Redis Without Downtime

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Redis (server and CLI)
- Redis Replication (primary/replica)
- Redis Sentinel (automated failover)
- Redis Cluster (mentioned in overview)
- systemd (service management)
- apt-get (package management)

## Sources Consulted
- Redis PING command documentation: https://redis.io/docs/latest/commands/ping/
- Redis DEBUG command documentation: https://redis.io/docs/latest/commands/debug/
- Redis REPLICAOF command documentation: https://redis.io/docs/latest/commands/replicaof/
- Redis SENTINEL FAILOVER documentation: https://redis.io/docs/latest/commands/sentinel-failover/
- Redis COMMAND DOCS documentation: https://redis.io/docs/latest/commands/command-docs/
- Redis CONFIG REWRITE documentation: https://redis.io/docs/latest/commands/config-rewrite/
- Redis BGSAVE documentation: https://redis.io/docs/latest/commands/bgsave/
- redis-server CLI --version flag behavior: https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/
- Redis 7.0 release notes (DEBUG command restrictions): https://github.com/redis/redis/blob/7.0/00-RELEASENOTES

## Issues Found

### Issue 1: `DEBUG SLEEP 0` used to check primary responsiveness (Method 1, Step 2)
- **What was wrong:** The post used `redis-cli -p 6379 DEBUG SLEEP 0` with the comment "Ensure primary is responsive." The `DEBUG` command is restricted by default in Redis 7.0+ (requires `enable-debug-command yes` in the config), so this command would fail on the versions the post targets (7.2). Additionally, `DEBUG SLEEP 0` is an unusual and inappropriate way to check responsiveness.
- **What was changed:** Replaced with `redis-cli -p 6379 PING` with the comment "Should return PONG," which is the standard, reliable way to verify a Redis instance is responsive.
- **Why:** `PING` is universally available across all Redis versions and is the canonical health check command.

### Issue 2: `redis-server --port 6399 --version` in Testing Compatibility section
- **What was wrong:** The `--version` flag causes `redis-server` to print its version string and exit immediately. It does not start a server. The comment said "Start new Redis version on a different port," which is incorrect — no server would be started by this command.
- **What was changed:** Removed the `--port 6399` flag and updated the comment to "Verify the new Redis version installed correctly," accurately reflecting what `redis-server --version` does. The server is actually started later in the section with `redis-server /tmp/canary/redis.conf --port 6399 --dir /tmp/canary/`.
- **Why:** The original command was misleading and would not accomplish what the comment described.

## Review Notes
- The `COMMAND DOCS` command used in the pre-upgrade checklist (Step 5) was introduced in Redis 7.0. If upgrading from Redis 6.x, this command will not be available on the source version. Users upgrading from pre-7.0 versions should use `COMMAND INFO <command-name>` instead to check command availability.
- The manual failover approach in Method 1 (using `REPLICAOF NO ONE`) requires application clients to be reconfigured to connect to the new primary. The post does not mention client-side connection updates, which is an important operational consideration for achieving true zero-downtime upgrades. The Sentinel-based approach (Method 2) handles this automatically if clients use Sentinel-aware drivers.
- The rollback section notes that data files may not be backward-compatible, which correctly warns users. However, if the new Redis version has modified the RDB format during the brief time it ran, downgrading and restarting with those files could fail. The pre-upgrade RDB backup is critical for rollback.
- The `slave_repl_offset` field in the monitoring grep pattern is valid (available since Redis 4.0 on replicas) but note that Redis has been moving toward non-"slave" terminology. In future versions this field may be renamed.
