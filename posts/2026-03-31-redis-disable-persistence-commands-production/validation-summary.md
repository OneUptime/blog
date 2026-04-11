# Validation Summary: How to Disable Redis Persistence Commands in Production

## Status
validated

## Post Type
Tutorial / Security Hardening Guide

## Technologies Covered
- Redis (general, 6.x, 7.x)
- Redis ACLs (Redis 6.2+)
- Redis `rename-command` directive
- Docker (Redis container configuration)

## Sources Consulted
- Redis Configuration Documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis Security Guide — https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis ACL Documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL SETUSER Command Reference — https://redis.io/docs/latest/commands/acl-setuser/
- Redis SLAVEOF Command Reference — https://redis.io/docs/latest/commands/slaveof/
- Redis REPLICAOF Command Reference — https://redis.io/docs/latest/commands/replicaof/
- Redis rename-command documentation in redis.conf
- Redis GitHub PR #7993 (pub/sub channel ACL patterns, introduced in Redis 6.2)

## Issues Found
1. **MONITOR missing from commands table**: The "Commands to Disable or Rename" table listed 9 commands but omitted `MONITOR`, even though it was disabled in both the `rename-command` section and the ACL section. Added `MONITOR` to the table with the risk description: "Stream all commands received by the server, exposing sensitive data."

2. **REPLICAOF missing from ACL rule**: The ACL SETUSER example included `-SLAVEOF` but omitted `-REPLICAOF`. In Redis ACLs, SLAVEOF and REPLICAOF are separate commands — blocking one does not block the other. Added `-REPLICAOF` to the ACL rule for consistency with the `rename-command` section, which correctly disables both.

## Review Notes
- The `&*` pub/sub channel pattern syntax in the ACL example was introduced in Redis 6.2, not Redis 6.0. The section title says "Redis 6+" which is accurate for the core ACL system, but the specific `&*` pattern requires 6.2+. For Redis 6.0–6.1, omitting `&*` would still work (pub/sub channels are unrestricted by default in those versions). This is a minor version caveat, not an error.
- The `rename-command` directive is considered legacy in Redis 7+ in favor of ACLs. The post correctly recommends ACLs for Redis 6+ deployments but does not explicitly note that `rename-command` may be deprecated in future versions.
- The Docker `--rename-command` command-line syntax is correct — Redis's argv parser concatenates non-`--` arguments into multi-word config values, so `--rename-command CONFIG ""` produces the valid config line `rename-command "CONFIG" ""`.
- The error message formats shown for both renamed commands and ACL permission denials are accurate.
