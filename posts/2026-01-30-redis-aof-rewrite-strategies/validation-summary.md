# Validation Summary: How to Build Redis AOF Rewrite Strategies

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Redis (AOF persistence, BGREWRITEAOF, multi-part AOF, Redis 7+ features)
- Redis CLI (`redis-cli`, `redis-check-aof`)
- Linux kernel memory tuning (`vm.overcommit_memory`)
- Bash scripting and cron
- Prometheus alerting rules

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/management/persistence/
- Redis sample `redis.conf` (AOF section), including `no-appendfsync-on-rewrite`, `aof-load-truncated`, `aof-rewrite-incremental-fsync`, `aof-use-rdb-preamble`, `aof-timestamp-enabled`, `appenddirname`
- Redis release notes for 4.0 (`aof-use-rdb-preamble` introduced) and 5.0 (made default), 7.0 (multi-part AOF, `aof-timestamp-enabled`, `appenddirname`)
- Redis command reference for `BGREWRITEAOF`, `INFO persistence`
- `redis-check-aof` CLI usage (Redis 7 multi-part AOF accepts the manifest file)

## Issues Found
1. **Incorrect comment on `no-appendfsync-on-rewrite yes`**: The original comment said "Don't rewrite if saving RDB would fail". That is not what this directive does. It instructs Redis to skip `fsync()` from the main thread while a background child (RDB save or AOF rewrite) is running, trading durability for lower latency. Comment rewritten to describe the actual behavior and the durability trade-off.
2. **Incorrect comment on `aof-load-truncated yes`**: The original comment said "Stop accepting writes if AOF rewrite fails", which is wrong. This setting controls startup behavior — whether Redis tolerates a truncated trailing command when loading the AOF file (typical after an unclean shutdown). Comment corrected.
3. **Misleading version annotation on `aof-rewrite-incremental-fsync yes`**: The original comment marked it as "(Redis 7+)". This directive has existed since Redis 2.4/3.0; it is not a Redis 7 addition. Comment updated to describe the behavior (32MB-chunk fsync during rewrite) instead of mislabeling its origin.
4. **Misleading version annotation on `aof-use-rdb-preamble yes`**: The original comment said "default in Redis 7". The directive was introduced in Redis 4.0 and became the default starting in Redis 5.0; it is still the default in Redis 7 but did not become default there. Comment corrected. The companion `aof-timestamp-enabled` was moved to carry the "(Redis 7+)" tag since that *is* the version it was introduced in.

## Review Notes
- The `appendfsync always` recommendation for low-write workloads is technically valid (it favors durability) but is an unusual production choice; most operators stay on `everysec` regardless of write volume. Not changed because it is a defensible recommendation, not an error.
- The Prometheus rule `redis_aof_last_bgrewrite_status == 0` assumes the `oliver006/redis_exporter` metric naming. The exporter does expose AOF metrics; depending on exporter version the exact metric names (e.g., `redis_aof_last_rewrite_duration_sec` vs `redis_aof_current_rewrite_duration_sec`) can drift, so operators should verify against their installed exporter before copying the rules verbatim.
- The wait-loop pattern `redis-cli INFO persistence | grep aof_rewrite_in_progress` will also match other lines containing that prefix only if Redis introduces them; today it returns a single line, so the script is safe.
- The diagram for the multi-part AOF layout shows `appendonly.aof.1.base.rdb` — that is the correct extension when the base file is in RDB format (the default with `aof-use-rdb-preamble yes`); it would be `.aof` only if RDB preamble were disabled. Worth noting for readers but not an error.
