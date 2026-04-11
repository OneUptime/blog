# Validation Summary: How to Use ACL LIST in Redis to View All ACL Rules

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis ACL system (ACL LIST, ACL GETUSER, ACL USERS, ACL SETUSER)
- Redis CLI (`redis-cli`)

## Sources Consulted
- Redis official documentation for ACL LIST: https://redis.io/docs/latest/commands/acl-list/
- Redis official documentation for ACL GETUSER: https://redis.io/docs/latest/commands/acl-getuser/
- Redis official documentation for ACL USERS: https://redis.io/docs/latest/commands/acl-users/
- Redis official documentation for ACL SETUSER: https://redis.io/docs/latest/commands/acl-setuser/

## Issues Found
1. **Shell command in wrong code block type (line 83-84)**: The `redis-cli ACL LIST | wc -l` command was inside a `` ```redis `` code block with a `--` Redis-style comment, but it is a shell/bash command, not a Redis command. Changed the code block to `` ```bash `` and updated the comment to use `#` (bash comment syntax).

## Review Notes
- All technical claims about ACL LIST behavior, output format, and usage patterns are accurate per the official Redis documentation.
- The output format description (`user <name> <flags> <passwords> <keys> <channels> <commands>`) is a reasonable simplification of the actual output structure.
- The use of `resetchannels` in example line 3 is valid — the official Redis docs confirm `resetchannels` appears in ACL LIST output for users with no channel permissions.
- The `@read` command category referenced in the examples is a valid Redis ACL category.
- The comparison tables (ACL LIST vs ACL GETUSER, ACL USERS vs ACL LIST) are accurate.
- The security hardening examples are correct and reflect real-world best practices.
- The claim about ACL LIST output being directly usable in an aclfile is confirmed by official docs. The mention of use "with ACL SETUSER" is slightly loose (the `user <name>` prefix would need to be stripped), but not materially incorrect.
