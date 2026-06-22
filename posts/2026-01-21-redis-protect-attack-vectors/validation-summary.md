# Validation Summary: How to Protect Redis from Common Attack Vectors

## Status
validated

## Post Type
Security hardening guide

## Technologies Covered
- Redis Open Source
- Redis ACLs and redis.conf configuration
- redis-cli commands
- Redis Lua scripting with EVAL/EVALSHA
- Redis replication commands
- redis-py Python client
- Linux iptables firewall rules
- Masscan and Shodan discovery examples

## Sources Consulted
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis SLAVEOF command documentation: https://redis.io/docs/latest/commands/slaveof/
- Redis ZADD command documentation and redis-py method signature: https://redis.io/docs/latest/commands/zadd/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/

## Issues Found
- The protection snippet mixed redis.conf directives, interactive ACL commands, and shell firewall commands in one bash block. I split the redis.conf and shell examples and changed the ACL lines to valid redis.conf `user` syntax.
- The article recommended `rename-command` without noting that Redis now deprecates that method in favor of ACL rules. I added short caveats where command shadowing is shown.
- The Lua injection example incorrectly implied that passing untrusted input through `KEYS` could inject Lua. Redis documentation states normal client-library argument passing is binary safe; the real risk is composing Lua source from untrusted strings. I rewrote the example to show unsafe script-string construction and the safe `KEYS` pattern.
- The key-name injection example implied that special characters in a key can manipulate Redis commands through a high-level client. I changed it to key namespace abuse and clarified that high-level clients encode keys as command arguments.
- The `SafeRedisClient` example used `hashlib` without importing it and used placeholder hashes that could not run as shown. I added the import, concrete approved script hashes, and `SCRIPT LOAD` before `EVALSHA` when needed.
- The replication section used only `SLAVEOF`, which Redis has deprecated since Redis 5.0. I updated the section to prefer `REPLICAOF` while keeping `SLAVEOF` as the legacy command.
- The replication ACL example used `>replica-pass` in a bash block, which would be interpreted as shell redirection. I quoted it in the `redis-cli` example and separated replica `redis.conf` settings from the master-side ACL command.
- The audit logging snippet used `datetime.utcnow()`, which is superseded by timezone-aware timestamps in current Python practice. I changed it to `datetime.now(timezone.utc)`.
- The hardening checker listed several dangerous commands but only tested `CONFIG` and `KEYS`. I changed it to use `COMMAND INFO` so it can check command availability without executing destructive commands such as `FLUSHALL` or `SHUTDOWN`.

## Review Notes
The article is technically relevant and useful after corrections. The security checker remains an illustrative script rather than a complete production audit tool; for example, it cannot prove internet exposure unless run from an appropriate network vantage point, and some checks depend on the authenticated user's own ACL permissions.
