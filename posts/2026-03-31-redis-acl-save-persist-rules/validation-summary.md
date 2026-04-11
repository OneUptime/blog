# Validation Summary: How to Use ACL SAVE in Redis to Persist ACL Rules

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (6.0+ ACL system)
- Redis ACL commands: ACL SAVE, ACL SETUSER, ACL DELUSER, ACL LOAD, ACL LIST
- Redis configuration (`aclfile` directive in `redis.conf`)

## Sources Consulted
- Official Redis ACL SAVE documentation: https://redis.io/docs/latest/commands/acl-save/
- Official Redis ACL SETUSER documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Official Redis ACL LOAD documentation: https://redis.io/docs/latest/commands/acl-load/
- Official Redis ACL overview: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/

## Issues Found
No technical issues found.

## Review Notes
- All ACL SETUSER syntax examples (`on`, `>password`, `~pattern:*`, `+@read`) are correct and use valid ACL rule tokens.
- The default user ACL line `user default on nopass ~* &* +@all` is accurate for Redis 6.2+. The `&*` (allchannels) was introduced in Redis 6.2; on Redis 6.0.x the default line would not include `&*`. The post does not specify a version, but the format shown is current and correct.
- The error message shown when no `aclfile` is configured matches the actual Redis server error output.
- The ACL file format description (one rule per line, SHA-256 hashed passwords prefixed with `#`) is accurate.
- The explanation of the ACL SAVE / ACL LOAD relationship is correct: SAVE persists memory to disk, LOAD replaces in-memory ACLs from disk.
- The recommendation to use `CONFIG REWRITE` as an alternative when not using an external ACL file is accurate.
