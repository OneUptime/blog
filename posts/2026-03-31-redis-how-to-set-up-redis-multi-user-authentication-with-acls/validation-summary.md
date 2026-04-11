# Validation Summary: How to Set Up Redis Multi-User Authentication with ACLs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (6.0+ ACL system)
- Redis CLI
- Python redis-py client

## Sources Consulted
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL DRYRUN command reference: https://redis.io/docs/latest/commands/acl-dryrun/
- Redis ACL LOAD command reference: https://redis.io/docs/latest/commands/acl-load/
- Redis CONFIG REWRITE command reference: https://redis.io/docs/latest/commands/config-rewrite/
- Redis DEL command reference (ACL categories): https://redis.io/docs/latest/commands/del/

## Issues Found

1. **Incorrect reload instructions for redis.conf-defined users (was lines 91-96):** The post stated you could reload redis.conf ACL changes without restart using `CONFIG REWRITE` + `ACL LOAD`. This is wrong on two counts: `CONFIG REWRITE` writes in-memory config *to* disk (not the reverse), and `ACL LOAD` only works with external ACL files set via the `aclfile` directive — it returns an error if no `aclfile` is configured. Fixed by replacing with correct guidance: restart Redis after editing redis.conf, or use `ACL SETUSER` at runtime then `CONFIG REWRITE` to persist.

2. **Inconsistent ACL LIST sample output (was line 138):** The sample output showed `user appuser ... -DEL` (deny DEL), but appuser was defined with `+DEL` (allow DEL) in all earlier examples. Changed `-DEL` to `+DEL` for consistency.

3. **Inconsistent ACL GETUSER sample output (was line 156):** Same issue — showed `+@read +@write -DEL` but should be `+@read +@write +DEL` to match the user definition. Fixed.

4. **Missing version note for ACL DRYRUN (was line 163):** `ACL DRYRUN` was introduced in Redis 7.0.0, but the post only mentioned Redis 6.0 for the ACL system overall. Added a version note so Redis 6.x users aren't confused by a command that doesn't exist in their version.

5. **Missing version note for Pub/Sub channel patterns:** The `&channel` ACL syntax was introduced in Redis 6.2, not 6.0. Added "(Redis 6.2+)" annotation to the feature list.

## Review Notes
- The `+DEL` and `+EXPIRE` rules in the appuser definition are technically redundant since both commands are in the `@write` category (which is already granted). This isn't incorrect — explicit rules can serve as documentation — but readers should be aware they're already covered by `+@write`.
- The post uses example passwords in plaintext. While appropriate for a tutorial, a brief mention of using hashed passwords (`#hash` syntax) or environment variables in production would strengthen the security guidance.
