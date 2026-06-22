# Validation Summary: How to Configure Redis ACLs for Fine-Grained Access Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Access Control Lists (ACLs)
- Redis ACL commands and ACL files
- Redis Pub/Sub channel ACLs
- redis-py Python client
- Python

## Sources Consulted
- Redis ACL overview: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL SETUSER command reference: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL CAT command reference: https://redis.io/docs/latest/commands/acl-cat/
- Redis ACL DRYRUN command reference: https://redis.io/docs/latest/commands/acl-dryrun/
- Redis ACL GETUSER command reference: https://redis.io/docs/latest/commands/acl-getuser/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- `ACL USERS` was described as a command to count users. It returns the list of usernames, so the comment was changed to "List usernames."
- The key-pattern examples included `~user:${username}:*` as a Redis 7+ dynamic pattern. Redis ACL key rules use glob-style patterns, and the official ACL documentation does not document `${username}` expansion, so the example was changed to a plain `~user:*` prefix pattern.
- Redis 7-only key-permission rules (`%R~`, `%W~`, `%RW~`) and Redis 6.2+ Pub/Sub channel rules were clarified with version notes.
- The Python examples used `redis.Redis.acl_setuser(username, *rules)` with raw ACL rule strings. Current redis-py documents `acl_setuser` as a keyword-oriented helper, so these calls were changed to `execute_command('ACL', 'SETUSER', ...)` for raw Redis ACL syntax.
- The ACL password hash examples used truncated or invalid SHA-256 hashes. They were replaced with full 64-character SHA-256 hashes.
- The Python ACL audit helper treated denied categories such as `-@dangerous` as if dangerous access were present. The logic was corrected to check positive grants and `+@all` without the matching denial.
- The Python `ACL DRYRUN` wrapper now uses redis-py's documented `acl_dryrun` method instead of manually assembling the subcommand through `execute_command`.

## Review Notes
The Redis command snippets are written in Redis CLI syntax. If copied directly into a Unix shell instead of the Redis CLI, password rules beginning with `>` must be quoted or escaped because `>` is also shell redirection.
