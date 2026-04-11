# Validation Summary: Redis ACL Commands Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Redis (6.0+, 6.2+, 7.0+)
- Redis ACL (Access Control Lists)

## Sources Consulted
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- ACL SETUSER command reference: https://redis.io/docs/latest/commands/acl-setuser/
- ACL WHOAMI command reference: https://redis.io/docs/latest/commands/acl-whoami/
- ACL LOG command reference: https://redis.io/docs/latest/commands/acl-log/
- ACL SAVE / ACL LOAD command references: https://redis.io/docs/latest/commands/acl-save/
- HEXPIRE command reference: https://redis.io/docs/latest/commands/hexpire/
- Redis ACL categories (ACL CAT output): https://redis.io/docs/latest/commands/acl-cat/

## Issues Found

1. **ACL WHOAMI description was incorrect.** The comment said "Get rules for current user" but `ACL WHOAMI` only returns the current authenticated username as a bulk string, not the user's ACL rules. To get rules, one would use `ACL GETUSER <username>`. Changed the comment to "Get current authenticated username".

2. **`%RW~logs:*` was missing a Redis 7.0+ version note.** The `%R~` and `%W~` key permission prefixes were correctly noted as Redis 7.0+, but `%RW~` was not annotated despite also being a Redis 7.0+ feature. Added the "(Redis 7.0+)" note for consistency.

3. **`HEXPIRE` command replaced with `HDEL`.** The `HEXPIRE` command was introduced in Redis 7.4.0, but the example presented it alongside basic commands (GET, SET, DEL, EXPIRE, TTL, HSET, HGET, HGETALL) that have been available since much earlier versions. Using it without a version note in a general-purpose app user example could cause confusion or errors on Redis < 7.4. Replaced with `HDEL`, which is a more commonly used hash command available in all Redis versions.

## Review Notes
- The `!sha256hash` syntax for removing hashed passwords is correct per the ACL SETUSER documentation, though less commonly documented than other password rules.
- All ACL command categories referenced (`@read`, `@write`, `@string`, `@dangerous`, `@hash`, `@list`, `@all`) are valid Redis ACL categories.
- The `acllog-max-len` configuration parameter name and default value (128) are correct.
- The post correctly distinguishes version-specific features (Redis 6.0 for ACLs, 6.2 for pub/sub channels, 7.0 for key read/write permissions).
