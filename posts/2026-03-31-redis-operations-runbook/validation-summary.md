# Validation Summary: How to Create a Redis Runbook for Operations

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (CLI commands, INFO sections, CONFIG, SLOWLOG, MEMORY USAGE, REPLICAOF, BGSAVE, SHUTDOWN)
- Bash scripting
- systemd (service management)
- Redis Sentinel (referenced in contact template)

## Sources Consulted
- Redis official documentation for CLI commands: https://redis.io/docs/latest/commands/
- Redis INFO command fields: https://redis.io/docs/latest/commands/info/
- Redis MEMORY USAGE command: https://redis.io/docs/latest/commands/memory-usage/
- Redis SHUTDOWN command: https://redis.io/docs/latest/commands/shutdown/
- Redis CONFIG SET/GET/REWRITE commands: https://redis.io/docs/latest/commands/config-set/
- Redis REPLICAOF command: https://redis.io/docs/latest/commands/replicaof/
- Redis DEBUG SLEEP command: https://redis.io/docs/latest/commands/debug-sleep/
- Redis SLOWLOG command: https://redis.io/docs/latest/commands/slowlog-get/
- Redis BGSAVE command: https://redis.io/docs/latest/commands/bgsave/

## Issues Found

1. **Memory usage script lost key name association** (lines 88-90): The script `redis-cli MEMORY USAGE "$key"` outputs only the byte count in non-interactive mode. Piping through `sort -n | tail -20` showed the top 20 memory sizes but without indicating which keys they belonged to, defeating the stated purpose of identifying top keys by memory. Fixed by wrapping the command in `echo "$(redis-cli MEMORY USAGE "$key") $key"` so each line includes both the byte count and key name.

2. **Incorrect use of `DEBUG SLEEP 0` for forcing replication resync** (line 110): `DEBUG SLEEP 0` causes the Redis server to sleep for 0 seconds, which is effectively a no-op. It does not trigger a replication resync. The `REPLICAOF master-ip 6379` command on the following line is what actually forces the replica to disconnect and reconnect to the master, triggering a resync. Removed the misleading `DEBUG SLEEP 0` line.

## Review Notes
- The `systemctl restart redis` command uses the service name `redis`, but on some Linux distributions (e.g., Debian/Ubuntu), the service is named `redis-server`. The post could note this variation, but it's not incorrect as-is since service names are distro-dependent.
- The `--bigkeys` scan can block the server briefly on very large datasets. For production use, the `--i` (interval) flag can throttle the scan. This is a best-practice consideration, not an error.
- All Redis INFO section field names (`used_memory_human`, `maxmemory_human`, `mem_fragmentation_ratio`, `rdb_last_bgsave_status`, `aof_last_rewrite_status`, `rdb_last_save_time`, `connected_clients`, `master_repl_offset`, `slave_repl_offset`, `master_link_status`, `role`, `connected_slaves`) are correct and current.
