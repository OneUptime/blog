# Validation Summary: What Does 'MISCONF Redis is configured to save RDB snapshots' Mean

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (RDB persistence, BGSAVE, stop-writes-on-bgsave-error)
- Linux system administration (vm.overcommit_memory, sysctl, file permissions)
- Prometheus monitoring (redis_exporter metrics, alerting rules)

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis official documentation on CONFIG SET / CONFIG GET: https://redis.io/docs/latest/commands/config-set/
- Redis source code for MISCONF error handling (server.c, rdb.c)
- oliver006/redis_exporter Prometheus metric names: https://github.com/oliver006/redis_exporter
- Linux kernel documentation on vm.overcommit_memory: https://www.kernel.org/doc/Documentation/vm/overcommit-accounting

## Issues Found
1. **Misleading SIGTERM log line in example**: The log example in the "Check the Redis Logs" section included `SIGTERM calling handler...` alongside BGSAVE failure messages. SIGTERM is about Redis receiving a termination signal and is unrelated to BGSAVE failures. Including it in this context implies a connection that doesn't exist, which could confuse readers diagnosing persistence issues. Removed the SIGTERM line from the log example.

2. **Incorrect Prometheus metric name**: The Prometheus alert rule used `redis_rdb_last_bgsave_status_code == 1`, but the standard redis_exporter exposes this metric as `redis_rdb_last_bgsave_status` (a gauge where 0 = ok and 1 = err). There is no `_code` suffix variant. Changed to `redis_rdb_last_bgsave_status == 1`.

## Review Notes
- The MISCONF error message text is accurate and matches the actual Redis error output.
- All `redis-cli` commands shown are correct and use proper syntax.
- The explanation of `stop-writes-on-bgsave-error` defaulting to `yes` is correct.
- The `CONFIG SET save ""` approach to disable RDB at runtime is correct.
- The vm.overcommit_memory guidance (set to 1) matches official Redis recommendations.
- The post correctly warns against disabling `stop-writes-on-bgsave-error` in production.
