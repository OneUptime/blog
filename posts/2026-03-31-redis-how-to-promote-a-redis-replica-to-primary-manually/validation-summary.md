# Validation Summary: How to Promote a Redis Replica to Primary Manually

## Status
validated

## Post Type
Tutorial / Step-by-step operational guide

## Technologies Covered
- Redis (replication, failover, INFO replication, REPLICAOF, WAIT)
- redis-cli
- HAProxy (example client redirect)

## Sources Consulted
- Redis official documentation for the REPLICAOF command (https://redis.io/docs/latest/commands/replicaof/)
- Redis official documentation for CONFIG SET (https://redis.io/docs/latest/commands/config-set/)
- Redis official documentation for replica-read-only configuration (https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/)
- Redis official documentation for min-replicas-to-write configuration (https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- Redis official documentation for the WAIT command (https://redis.io/docs/latest/commands/wait/)
- Redis official documentation for INFO replication output fields (https://redis.io/docs/latest/commands/info/)

## Issues Found
1. **Step 1 - Incorrect command to stop writes on the primary**: The post used `CONFIG SET replica-read-only yes` on the primary host to make it reject writes. This is incorrect — `replica-read-only` is a configuration parameter that controls whether *replica* instances accept write commands. Setting it on a primary has no effect; the primary will continue to accept writes as normal. **Fix:** Replaced with `CONFIG SET min-replicas-to-write 99`, which causes the primary to reject write commands because the required minimum number of connected replicas (99) cannot be met. Updated the surrounding explanation accordingly.

## Review Notes
- All other commands (`REPLICAOF NO ONE`, `INFO replication`, `WAIT 1 1000`, `REPLICAOF <host> <port>`) are correct and current.
- The INFO replication field names (`slave_repl_offset`, `master_repl_offset`, `master_link_status`) use legacy "slave" terminology which is still present in Redis INFO output for backward compatibility, even in Redis 7.x. This is correct as documented.
- The `REPLICAOF` command (Redis 5.0+) is used throughout rather than the deprecated `SLAVEOF`, which is appropriate.
- For Redis 6.2+ environments, `CLIENT PAUSE <timeout> WRITE` is another valid option for Step 1 that the author could consider mentioning in a future update.
