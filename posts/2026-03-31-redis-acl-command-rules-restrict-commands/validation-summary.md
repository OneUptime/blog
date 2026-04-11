# Validation Summary: How to Restrict Redis Commands with ACL Command Rules

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (6.2+, 7.0+)
- Redis ACL system (ACL SETUSER, ACL GETUSER, ACL SAVE)
- Redis command categories (@all, @read)
- Redis ACL subcommand rules (pipe syntax)

## Sources Consulted
- Redis official documentation for ACL SETUSER: https://redis.io/commands/acl-setuser/
- Redis official documentation for ACL GETUSER: https://redis.io/commands/acl-getuser/
- Redis official documentation for ACL SAVE: https://redis.io/commands/acl-save/
- Redis official documentation for ACL CAT (command categories): https://redis.io/commands/acl-cat/
- Previously validated blog post: `2026-03-31-redis-acl-getuser-view-permissions` (used as reference for ACL GETUSER output format)

## Issues Found

1. **ACL GETUSER output missing tilde prefix on keys field (line 86)**: The keys field showed `"cache:*"` but Redis returns key patterns with the `~` selector prefix, i.e., `"~cache:*"`. Fixed to match actual Redis output format.

2. **ACL GETUSER output missing channels and selectors fields (lines 85-88)**: The example output only showed flags, passwords, commands, and keys fields. Redis 6.2+ also returns `channels` and Redis 7.0+ returns `selectors` in the ACL GETUSER response. Added the missing `channels` (`"&*"`) and `selectors` (`(empty array)`) fields for accuracy and consistency with the validated ACL GETUSER blog post.

## Review Notes
- The `&*` syntax used in ACL SETUSER commands requires Redis 6.2+. The post does not specify a minimum Redis version, which is fine since 6.2+ is widely deployed.
- The `SLAVEOF` command in the "Block Dangerous Commands" example is deprecated in favor of `REPLICAOF` (since Redis 5.0), but including both `-REPLICAOF -SLAVEOF` is a valid defensive practice to cover both old and new command names.
- The backslash line continuation (`\`) in the "Block Dangerous Commands" example works when pasting into a shell but not in interactive redis-cli mode. This is a common convention in Redis tutorials and not flagged as an error.
- The ACL command rule syntax reference table is accurate and complete for the most commonly used rules.
- The `+CLIENT|GETNAME` subcommand syntax is correct for Redis 7.0+.
