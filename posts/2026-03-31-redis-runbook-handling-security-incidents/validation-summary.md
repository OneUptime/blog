# Validation Summary: Redis Runbook: Handling Security Incidents

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Redis (CLI, configuration, ACLs, security hardening)
- Linux firewall (UFW)
- Redis ACL system (Redis 6.0+)

## Sources Consulted
- Redis CLIENT KILL documentation: https://redis.io/docs/latest/commands/client-kill/
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/
- Redis ACL SETUSER documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL CAT documentation: https://redis.io/docs/latest/commands/acl-cat/
- Redis REPLICAOF documentation: https://redis.io/docs/latest/commands/replicaof/
- Redis configuration reference: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/

## Issues Found

1. **CONFIG SET bind is not supported at runtime** (Step 3): The `bind` directive cannot be changed dynamically with `CONFIG SET`. It requires editing `redis.conf` and restarting the Redis server. Changed to show editing the config file and restarting the service.

2. **CLIENT KILL ADDR with port 0 does not work as a wildcard** (Step 4): `CLIENT KILL ADDR <ip>:0` does not kill all connections from an IP. The `ADDR` filter requires an exact `ip:port` match from `CLIENT LIST` output. Corrected to show using `CLIENT LIST` first to get actual addresses, then killing with exact `ip:port`. Also removed `SKIPME no` which is unnecessary in this context.

3. **SLAVEOF is deprecated in favor of REPLICAOF** (Step 6): The `SLAVEOF` command has been deprecated since Redis 5.0. Updated `rename-command SLAVEOF ""` to `rename-command REPLICAOF ""` to reflect the modern command name.

4. **Summary wording adjusted**: Reordered the summary sentence to list blocking the port before binding to localhost, since binding requires a restart and is not an immediate runtime action.

## Review Notes
- The `KEYS` command used in Step 2 for detecting attack patterns will block Redis on large datasets. In production, `SCAN` with a pattern would be safer, but for incident response on a potentially compromised instance, `KEYS` is acceptable since performance is secondary to detection.
- The `rename-command` directive in Step 6 is a legacy approach. For Redis 7.0+, ACLs are the preferred mechanism for restricting dangerous commands. The post already covers ACLs in Step 5, so the rename-command section remains valid as defense-in-depth for older versions.
- The `ufw deny 6379` command blocks inbound traffic only (UFW default direction). This is correct for the use case of preventing external connections to Redis.
