# Validation Summary: What Does 'NOPERM' Mean in Redis ACL

## Status
validated

## Post Type
Reference / Troubleshooting Guide

## Technologies Covered
- Redis 6.0+ (ACL system)
- Redis ACL commands (ACL WHOAMI, ACL LIST, ACL GETUSER, ACL SETUSER, ACL LOAD, ACL SAVE, ACL LOG)
- Redis ACL file configuration

## Sources Consulted
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL command reference: https://redis.io/docs/latest/commands/acl-getuser/
- Redis ACL LIST command reference: https://redis.io/docs/latest/commands/acl-list/
- Redis ACL SETUSER command reference: https://redis.io/docs/latest/commands/acl-setuser/
- Redis AUTH command reference: https://redis.io/docs/latest/commands/auth/

## Issues Found
- **ACL GETUSER output missing "channels" field**: The `ACL LIST` output in the post included `&*` (pub/sub channel patterns), which is a Redis 6.2+ feature. However, the `ACL GETUSER` output was missing the corresponding `"channels"` and `"&*"` fields that Redis 6.2+ returns. This was an internal inconsistency — the two command outputs should reflect the same Redis version. Fixed by adding fields 9 (`"channels"`) and 10 (`"&*"`) to the `ACL GETUSER` example output.

## Review Notes
- The post correctly identifies all three causes of NOPERM: command restrictions, key pattern restrictions, and channel restrictions (pub/sub).
- All ACL SETUSER syntax examples are correct and use valid rule formats.
- The ACL file format example is accurate, including the use of `-@dangerous` to exclude a command category.
- The `ACL LOAD`, `ACL SAVE`, and `ACL LOG` commands are all correct.
- The error message format shown (`NOPERM this user has no permissions to run the 'set' command`) matches actual Redis output for command-level denials.
- The post uses uppercase command names in ACL rules (e.g., `+SET`). Redis ACL rules are case-insensitive, so this works correctly, though the Redis documentation convention uses lowercase. This is a stylistic preference, not an error.
