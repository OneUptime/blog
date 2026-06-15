# Validation Summary: How to Secure Redis with ACLs and RBAC

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Redis Open Source ACLs
- Redis CLI ACL commands
- Redis ACL files and redis.conf
- redis-py Python client
- Role-based access control patterns

## Sources Consulted
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL SETUSER command documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL GETUSER command documentation: https://redis.io/docs/latest/commands/acl-getuser/
- Redis AUTH command documentation: https://redis.io/docs/latest/commands/auth/
- Redis redis-py connection documentation: https://redis.io/docs/latest/develop/clients/redis-py/connect/
- redis-py exceptions documentation: https://redis.readthedocs.io/en/stable/exceptions.html

## Issues Found
- The read-only user test used `SET cache:test` and said it should work, but the user only had `+@read`. Changed the successful test to `GET cache:test`.
- The application and cache writer examples granted `+@write` without denying dangerous or admin categories, despite describing scoped application access. Added `-@admin -@dangerous` where appropriate.
- The external ACL file example contained comment lines. Redis documentation notes ACL-file comments are only supported by `ACL LOAD` starting with Redis 8.8, so the example was changed to omit comments and a version caveat was added.
- The replica ACL example granted `~*`, but Redis documentation states replica users do not need key access and require only `+psync +replconf +ping` on the master. Removed the unnecessary all-key pattern.
- A Python comment implied ACLs could require a specific TTL value. Redis ACLs can allow TTL-related commands but cannot enforce the TTL value, so the comment was corrected.
- The RBAC writer role allowed all write-category commands without excluding admin or dangerous commands. Added `-@admin -@dangerous`.
- The default-user reset example used `resetkeys resetpass off`, which does not clear command permissions. Replaced it with `reset`, which Redis documents as removing all capabilities and setting the user off.
- Some Python snippets used `redis` without importing it in the same fenced block. Added `import redis` where needed.
- The audit code compared string values against byte responses from `ACL GETUSER` and `CONFIG GET`, which can miss issues when redis-py is not using `decode_responses=True`. Added byte-to-string normalization.

## Review Notes
The post is technically relevant and accurate after the fixes. Future improvements could mention Redis 7 selectors and read/write key pattern permissions (`%R~` / `%W~`) for more advanced ACL designs, but those are not required for the current tutorial.
