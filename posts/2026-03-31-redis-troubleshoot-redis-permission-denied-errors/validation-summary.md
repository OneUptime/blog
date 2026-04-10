# Validation Summary: How to Troubleshoot Redis Permission Denied Errors

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (ACL system, introduced in Redis 6.0)
- Redis CLI (`redis-cli`)
- Redis ACL commands (`ACL WHOAMI`, `ACL LIST`, `ACL SETUSER`, `ACL DRYRUN`)
- Redis configuration (`requirepass`, `aclfile`)

## Sources Consulted
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- `ACL WHOAMI` command reference: https://redis.io/docs/latest/commands/acl-whoami/
- `ACL LIST` command reference: https://redis.io/docs/latest/commands/acl-list/
- `ACL SETUSER` command reference: https://redis.io/docs/latest/commands/acl-setuser/
- `ACL DRYRUN` command reference: https://redis.io/docs/latest/commands/acl-dryrun/
- `AUTH` command reference: https://redis.io/docs/latest/commands/auth/
- `CONFIG GET` command reference: https://redis.io/docs/latest/commands/config-get/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found
- **ACL LIST sample output showed `>password` instead of a hashed password**: The `ACL LIST` command displays stored passwords as SHA-256 hashes prefixed with `#` (e.g., `#5e884898da2804...`), not in the `>password` setter syntax. The `>` prefix is used in `ACL SETUSER` commands and ACL files to set a plaintext password, but `ACL LIST` output always shows the hashed form. Fixed the sample output to use `#5e884898da2804...` instead of `>password`.

## Review Notes
- `ACL DRYRUN` was introduced in Redis 7.0.0. The post does not mention this version requirement. Readers using Redis 6.x will not have access to this command. A minor note could be added in future revisions.
- The `AUTH` command section only shows the single-argument form (`AUTH password`), which authenticates as the `default` user. Redis 6.0+ also supports `AUTH username password` for ACL-based authentication. This could be a useful addition for completeness in a future update.
- All ACL command categories referenced (`@read`, `@write`, `@dangerous`, `@all`) are valid Redis ACL categories.
- The ACL file format, `aclfile` directive, and `redis-cli` flags (`-a`, `-u`, `-h`) are all correct.
