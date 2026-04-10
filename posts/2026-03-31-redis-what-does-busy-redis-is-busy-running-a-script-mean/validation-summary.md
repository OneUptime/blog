# Validation Summary: What Does 'BUSY Redis is busy running a script' Mean

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Redis (server, CLI, configuration)
- Lua scripting in Redis (EVAL, redis.call, redis.log)
- Python redis-py client library
- Redis commands: SCRIPT KILL, SHUTDOWN NOSAVE, SLOWLOG, INFO, EVAL, SCAN, DEBUG SLEEP

## Sources Consulted
- Redis SCRIPT KILL documentation: https://redis.io/docs/latest/commands/script-kill/
- Redis EVAL documentation: https://redis.io/docs/latest/commands/eval/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis programmability (Lua scripting) documentation: https://redis.io/docs/latest/develop/programmability/
- Redis source code (src/script.c) for exact error messages: https://github.com/redis/redis/blob/unstable/src/script.c
- Redis configuration (redis.conf) for lua-time-limit defaults: https://github.com/redis/redis/blob/unstable/redis.conf

## Issues Found

1. **Incorrect UNKILLABLE error message**: The post showed `(error) UNKILLABLE Script attempted to write but took too long. You need to call SHUTDOWN NOSAVE.` which is not the actual Redis error message. Fixed to the real message: `(error) UNKILLABLE Sorry the script already executed write commands against the dataset. You can either wait the script termination or kill the server in a hard way using the SHUTDOWN NOSAVE command.`

2. **Wrong INFO section and irrelevant metrics for monitoring**: The post recommended `INFO stats` and looking for `used_cpu_sys_children` and `used_cpu_user_children`. These fields are actually in the `# CPU` section (not `# Stats`), and they measure CPU used by background child processes (BGSAVE, AOF rewrite), not Lua script execution. Fixed to use `INFO commandstats` which shows per-command statistics including `cmdstat_eval` and `cmdstat_evalsha` with call counts and microsecond timings — directly relevant to monitoring script execution.

## Review Notes
- The `lua-time-limit` configuration parameter has been renamed to `busy-reply-threshold` in newer Redis versions (7.0+), though `lua-time-limit` remains as an alias. The post does not mention this, but is not incorrect for current usage.
- The `DEBUG SLEEP` example for simulating slow scripts requires `enable-debug-command yes` in Redis 7.0+ configurations. This is a testing-only suggestion so it is acceptable, but readers on newer Redis versions may need the extra config step.
- All other technical claims (default 5000ms timeout, SCRIPT KILL behavior for read-only vs write scripts, SHUTDOWN NOSAVE behavior, SLOWLOG usage, Lua redis.log API, Python redis-py scan pattern) are accurate.
