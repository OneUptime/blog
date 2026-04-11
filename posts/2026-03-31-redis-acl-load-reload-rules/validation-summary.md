# Validation Summary: How to Use ACL LOAD in Redis to Reload ACL Rules

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (ACL system, 6.0+)
- Redis CLI (`redis-cli`)
- Redis ACL commands (`ACL LOAD`, `ACL SAVE`, `ACL SETUSER`, `ACL GETUSER`, `ACL LIST`)
- Shell scripting (Bash deployment automation)

## Sources Consulted
- Redis official documentation for ACL LOAD: https://redis.io/docs/latest/commands/acl-load/
- Redis official documentation for ACL SAVE: https://redis.io/docs/latest/commands/acl-save/
- Redis official documentation for ACL SETUSER: https://redis.io/docs/latest/commands/acl-setuser/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found
1. **Incorrect `--pipe-mode` flag in automation script (line ~155):** The script contained `$REDIS_CLI --pipe-mode < /dev/null` with a comment claiming it validates ACL file syntax. This was wrong on two counts: (a) `--pipe-mode` is not a valid `redis-cli` flag (the actual flag is `--pipe`), and (b) even `--pipe` is for bulk data loading via raw Redis protocol, not for validating ACL files. There is no built-in `redis-cli` flag for ACL file syntax validation. **Fix:** Removed the bogus validation line and restructured the script to rely on `ACL LOAD`'s atomic error handling, checking its exit code and reporting success or failure.

## Review Notes
- All core technical claims about `ACL LOAD` behavior (atomic reload, error handling, relationship with `ACL SAVE`, `aclfile` prerequisite) are accurate per official Redis documentation.
- The ACL file format examples are correct, including `nopass`, `&*` (Pub/Sub channel patterns, Redis 6.2+), and `#<hash>` for hashed passwords.
- The hashed password examples (`#8a9bcdef1234...`, `#deadbeef...`) are clearly placeholder truncations; real hashed passwords must be 64-character lowercase hex SHA-256 strings. This is acceptable for illustrative purposes.
- The error message formats shown are consistent with Redis conventions, though exact wording may vary by Redis version.
