# Validation Summary: How to Write a Redis Health Check Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-cli, INFO command sections: memory, replication)
- Bash scripting
- Python 3 with redis-py library
- Cron scheduling
- Kubernetes liveness probes (mentioned)

## Sources Consulted
- Redis INFO command documentation: https://redis.io/commands/info/ — verified field names in memory and replication sections (used_memory, maxmemory, role, connected_slaves, blocked_clients, rejected_connections)
- redis-cli documentation: https://redis.io/docs/manual/cli/ — verified flags: -h, -p, -a, --no-auth-warning
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/ — verified Redis() constructor parameters (host, port, password, socket_connect_timeout, socket_timeout), ping(), and info() methods
- Crontab format reference: verified `* * * * *` as every-minute schedule

## Issues Found

### 1. grep patterns for memory fields matched multiple lines (Bug — Bash script)
**What was wrong:** `grep "used_memory:"` without a `^` anchor matches many fields in the `INFO memory` output: `used_memory:`, `used_memory_human:`, `used_memory_rss:`, `used_memory_peak:`, `used_memory_lua:`, `used_memory_overhead:`, `used_memory_startup:`, `used_memory_dataset:`, etc. This causes `cut -d: -f2` to return multiple values, breaking the subsequent arithmetic comparison. The same issue affected `grep "maxmemory:"` which also matches `maxmemory_human:` and `maxmemory_policy:`.
**What was changed:** Added `^` anchor to both grep patterns: `grep "^used_memory:"` and `grep "^maxmemory:"`.
**Why:** Without the anchor, the script would fail or produce incorrect results when performing integer arithmetic on multi-line output.

### 2. Unused variable MAX_CONNECTED_CLIENTS (Misleading — Bash script)
**What was wrong:** The variable `MAX_CONNECTED_CLIENTS=500` was defined at the top of the script but never referenced in any check. This implies a connected clients threshold check exists when it does not.
**What was changed:** Removed the unused variable definition.
**Why:** Leaving an unused threshold variable is misleading to readers who would expect a corresponding check in the script.

## Review Notes
- The Python script correctly uses `r.info()` which returns a parsed dictionary, avoiding the grep issues present in the Bash version.
- The post correctly notes that `maxmemory` of 0 means no limit is configured, and both scripts handle this case by skipping the percentage calculation.
- The cron entry is correct and the redirection pattern (`>> file 2>&1`) properly appends both stdout and stderr.
- The exit codes (0 = ok, 1 = warning, 2 = critical) in the Bash script follow Nagios/monitoring plugin conventions, which is a good practice.
