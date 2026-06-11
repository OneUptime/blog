# Validation Summary: How to Implement Redis ACL Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 6.0+ ACL system
- Redis 7.0 selectors (%R / %W key permissions)
- `ACL SETUSER`, `ACL GETUSER`, `ACL LIST`, `ACL CAT`, `ACL DRYRUN`, `ACL WHOAMI`, `ACL LOG`, `ACL LOAD`, `ACL SAVE` commands
- Redis ACL command categories (@read, @write, @admin, @dangerous, @pubsub, @scripting, @all, etc.)
- redis-py (Python client)
- ioredis (Node.js client)
- go-redis v9 (Go client)
- Redis configuration file (`redis.conf`, `aclfile`, `acllog-max-len`)

## Sources Consulted
- Redis ACL documentation: https://redis.io/docs/management/security/acl/
- Redis command reference (ACL family): https://redis.io/commands/?group=server (ACL SETUSER, ACL DRYRUN, ACL LOG, etc.)
- Redis 7.0 release notes (selectors / `%R` / `%W` introduction)
- redis-py exceptions module (`redis.exceptions.NoPermissionError`)
- ioredis README — `username`/`password` connection options
- go-redis v9 documentation — `redis.Options` struct (`Username`, `Password` fields)

## Issues Found
- **Troubleshooting bash loop**: The original snippet `ACL CAT | while read cat; do ... ACL DRYRUN appuser $(ACL CAT $cat | head -1) testkey ... done` mixed `redis-cli` interactive commands with a bash `while read` loop. Because `ACL CAT` and `ACL DRYRUN` are not shell commands, the loop would fail when executed from a shell. Fixed by prefixing each invocation inside the loop with `redis-cli` so the snippet works as a bash one-liner.

## Review Notes
- The ACL syntax (`on/off`, `>password`, `~pattern`, `%R~pattern`, `%W~pattern`, `&channel`, `+command`/`-command`, `+@category`/`-@category`, subcommands like `+DEBUG|SLEEP`) is all consistent with the official Redis ACL grammar.
- `ACL DRYRUN` is correctly used; readers running Redis 6.x should note it was added in Redis 7.0 — the post does not call this out explicitly, but this is minor since the post focuses on modern deployments.
- The sample `ACL GETUSER` output is a simplified illustrative example; real Redis 7.x output includes additional fields (e.g., `selectors`, `commands` as resolved string). This was kept as-is because the structure is representative and not technically wrong for Redis 6.x.
- The sample `ACL LOG` output structure (array of alternating key/value pairs per entry) matches the real Redis response shape, though field ordering can vary by version. Acceptable as an illustrative example.
- redis-py, ioredis, and go-redis v9 examples use the correct `username`/`password` connection parameters introduced for Redis 6 ACL support.
- The `ACL SETUSER replica ... +PSYNC +REPLCONF ...` pattern correctly uses real replication subcommands.
- Best-practice recommendations (disabling the default user, principle of least privilege, version-controlled ACL files, monitoring `ACL LOG`) align with Redis security guidance.
