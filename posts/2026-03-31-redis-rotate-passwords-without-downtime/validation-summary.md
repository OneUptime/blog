# Validation Summary: How to Rotate Redis Passwords Without Downtime

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Redis ACL system (ACL SETUSER, ACL GETUSER, ACL SAVE)
- redis-cli command-line tool
- Bash scripting

## Sources Consulted
- Redis ACL SETUSER documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL SAVE documentation: https://redis.io/docs/latest/commands/acl-save/
- Redis ACL GETUSER documentation: https://redis.io/docs/latest/commands/acl-getuser/
- Redis redis-cli documentation (URI format): https://redis.io/docs/latest/develop/connect/cli/

## Issues Found
No technical issues found.

## Review Notes
- The `ACL SAVE` command only works when Redis is configured with the `aclfile` directive. If ACLs are defined inline in `redis.conf`, `ACL SAVE` will return an error. The post could mention this caveat in a future update.
- The `redis-cli -u` URI example uses safe characters in the password. If passwords contain special characters (`@`, `:`, `/`, `#`, `?`), they must be percent-encoded. This is a minor edge case not critical for the tutorial.
- The bash automation script quoting (`">$NEW_PASS"`) is correct for typical passwords but could be slightly more robust for passwords containing `$`, backticks, or backslashes by using single-quote concatenation.
- The `ACL GETUSER` output format shown uses RESP2-style numbered fields, which is accurate for the default redis-cli output mode.
