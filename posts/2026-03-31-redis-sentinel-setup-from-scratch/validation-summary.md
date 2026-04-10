# Validation Summary: How to Set Up Redis Sentinel from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (server, CLI)
- Redis Sentinel (high availability / automatic failover)
- Redis replication (`replicaof`)

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/management/sentinel/
- Redis replication official documentation: https://redis.io/docs/management/replication/
- Redis configuration reference: https://redis.io/docs/management/config/

## Issues Found
1. **Shared `dir` across all instances on a single machine**: The primary and both replicas all used `dir /var/lib/redis`. Since this tutorial runs all instances on the same host (127.0.0.1), each Redis process would write its RDB dump file (`dump.rdb`) to the same directory, causing file conflicts and potential data corruption. Fixed by giving each instance its own subdirectory: `dir /var/lib/redis/primary`, `dir /var/lib/redis/replica-1`, and `dir /var/lib/redis/replica-2`.

## Review Notes
- The post states Sentinel processes "must be odd number for quorum." This is a strong recommendation rather than a strict requirement — what matters is the quorum value relative to the total count — but odd numbers are standard best practice, so this is acceptable advice for a tutorial.
- The `bind 0.0.0.0` directive without `protected-mode no` or a `requirepass` means connections from non-loopback interfaces will be rejected (Redis 3.2+). This is fine for the tutorial's localhost setup, but readers deploying across multiple machines should be aware they need to handle authentication or protected mode.
- The `DEBUG sleep 30` command for testing failover is valid but requires the `enable-debug-command` config option set to `yes` in Redis 7.0+. The post doesn't mention a specific Redis version, so this is a minor version-specific caveat.
- All Sentinel configuration directives (`sentinel monitor`, `sentinel down-after-milliseconds`, `sentinel failover-timeout`, `sentinel parallel-syncs`) are correct and use current syntax.
- The `replicaof` directive is the modern replacement for the deprecated `slaveof` (deprecated since Redis 5.0), which is correct.
