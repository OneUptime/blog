# Validation Summary: How to Disable Dangerous Redis Commands in Production

## Status
validated

## Post Type
Tutorial / Security Guide

## Technologies Covered
- Redis (server configuration, security)
- Redis ACL system (introduced in Redis 6.0, pub/sub channel patterns in 6.2)
- Redis `rename-command` directive (legacy approach)
- Redis CLI (`redis-cli`)

## Sources Consulted
- Redis Security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL SETUSER command: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL SAVE command: https://redis.io/docs/latest/commands/acl-save/
- Redis KEYS command: https://redis.io/docs/latest/commands/keys/
- Redis SCAN command: https://redis.io/docs/latest/commands/scan/
- Redis SLAVEOF command: https://redis.io/docs/latest/commands/slaveof/
- Redis REPLICAOF command: https://redis.io/docs/latest/commands/replicaof/
- Redis latency diagnostics: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/
- Redis 7.0 redis.conf on GitHub: https://github.com/redis/redis/blob/unstable/redis.conf

## Issues Found

### Issue 1: Incorrect `rename-command` deprecation claim
- **What was wrong:** The post stated "rename-command is deprecated in Redis 7.x and does not work with ACL files." Two problems: (1) the deprecation is not specific to Redis 7.x — `rename-command` has been marked deprecated in the `redis.conf` file since at least Redis 6.2; (2) the claim that it "does not work with ACL files" is not supported by official documentation. The docs recommend ACLs as the preferred approach but do not state that `rename-command` is incompatible with ACL files.
- **What was changed:** Updated the note to: "rename-command is deprecated as of Redis 6.2. Prefer ACL-based restrictions for Redis 6.2+."
- **Why:** Aligns with the actual Redis documentation and removes the unsupported incompatibility claim.

### Issue 2: Minimum Redis version for ACL examples
- **What was wrong:** The post stated "With Redis 6+, use ACL to deny dangerous commands per user" but the ACL SETUSER examples use `&*` (pub/sub channel pattern syntax), which was introduced in Redis 6.2, not 6.0. Running these commands on Redis 6.0 or 6.1 would produce a syntax error.
- **What was changed:** Updated "Redis 6+" to "Redis 6.2+" in the Method 2 heading text and in the Summary section.
- **Why:** The `&*` selector for pub/sub channels was introduced in Redis 6.2. The examples as written require Redis 6.2+ to work correctly.

## Review Notes
- The `&*` syntax in ACL SETUSER is not strictly necessary for the purpose of restricting dangerous commands, but it is good practice when creating users that need pub/sub access (especially on Redis 7.0+ where the default changed to `resetchannels`).
- `allcommands` and `+@all` are equivalent; the post's use of `allcommands` is valid.
- The `ACL SAVE` command only works when Redis is configured with the `aclfile` directive. The post could benefit from noting this caveat, but it is not an error.
- SLAVEOF was deprecated in Redis 5.0 in favor of REPLICAOF but still works for backward compatibility. The post correctly includes both in the deny list.
- The NOPERM error message format shown in the "Verify Restrictions" section matches the documented Redis error format.
