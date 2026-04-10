# Validation Summary: Redis Production Readiness Checklist

## Status
validated

## Post Type
Reference / Checklist Guide

## Technologies Covered
- Redis (general, applicable to Redis 6+ and 7+)
- Redis CLI
- Redis Sentinel / Cluster
- Redis ACLs (Redis 6+)
- Linux kernel tuning (sysctl, THP, ulimit)
- Prometheus / Grafana (mentioned)

## Sources Consulted
- Redis CONFIG GET documentation: https://redis.io/docs/latest/commands/config-get/
- Redis rename-command directive documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/
- Redis ACL documentation: https://redis.io/docs/latest/commands/acl-list/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis SLOWLOG documentation: https://redis.io/docs/latest/commands/slowlog-get/
- Redis admin/latency guidance: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/

## Issues Found
1. **`CONFIG GET rename-command` does not work** (line 26): The `rename-command` directive is a config-file-only setting and cannot be retrieved via `CONFIG GET`. The command returns an empty result, making it useless for verifying whether dangerous commands have been renamed. Fixed by replacing with a note to inspect `redis.conf` directly or use `redis-cli ACL LIST` (Redis 6+), which is the modern and recommended approach.

## Review Notes
- The RDB save example values (`save 900 1, save 300 10`) are reasonable recommendations but omit the third common rule (`save 60 10000`). This is acceptable since the post frames them as checklist items, not exhaustive defaults.
- The `rename-command` directive is deprecated in Redis 7+ in favor of ACLs. The post already mentions ACLs in the security checklist, which is good.
- The `net.core.somaxconn` check recommends >= 511 (matching Redis's default `tcp-backlog`) while the applied sysctl value is 65535. This is not incorrect — a higher value is common practice — but the discrepancy may confuse readers.
- The slowlog values shown (10000 microseconds, max-len 128) are Redis defaults. Using `CONFIG SET` to apply defaults is harmless but could be noted as making them explicit rather than changing behavior.
