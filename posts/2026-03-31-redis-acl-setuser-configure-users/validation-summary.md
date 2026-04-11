# Validation Summary: How to Use ACL SETUSER in Redis to Create and Configure Users

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis (6.0+ ACL system)
- Redis ACL SETUSER command
- Redis ACL categories and rule syntax
- Redis 7.0+ read/write key patterns (%R~, %W~)

## Sources Consulted
- Redis official documentation for ACL SETUSER: https://redis.io/docs/latest/commands/acl-setuser/
- Redis official documentation for ACL CAT: https://redis.io/docs/latest/commands/acl-cat/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/

## Issues Found
1. **Broken `monitor` user example (line 86)**: The command `ACL SETUSER monitor on >monpass allkeys +INFO +MONITOR +CLIENT +COMMAND nocommands +INFO +MONITOR` was incorrect. Because Redis ACL rules are applied left to right, the `nocommands` rule in the middle wiped out all four previously granted commands (`+INFO`, `+MONITOR`, `+CLIENT`, `+COMMAND`), then only `+INFO` and `+MONITOR` were re-added — silently losing `+CLIENT` and `+COMMAND`. Fixed by moving `nocommands` before the command additions: `ACL SETUSER monitor on >monpass allkeys nocommands +INFO +MONITOR +CLIENT +COMMAND`.

## Review Notes
- The post uses `--` as a comment syntax in `redis` code blocks. Redis CLI has no comment syntax, but this is a standard documentation convention in blog posts and does not affect correctness.
- The NOPERM error message in the sequence diagram is simplified compared to the actual Redis error text, but this is acceptable for illustrative purposes.
- The `@read` and `@write` categories referenced throughout are valid Redis ACL categories available since Redis 6.0.
- The `%R~` and `%W~` read/write key pattern syntax is correctly noted as Redis 7.0+.
- The rule syntax reference table is accurate and comprehensive for common ACL rules.
