# Validation Summary: How to Use Redis CLI with ACL Authentication

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis 6.0+ (ACL system)
- Redis 7.0+ (ACL DRYRUN command)
- redis-cli
- ioredis (Node.js Redis client)
- Bash scripting

## Sources Consulted
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL SETUSER command: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL DRYRUN command: https://redis.io/docs/latest/commands/acl-dryrun/
- Redis ACL LOG command: https://redis.io/docs/latest/commands/acl-log/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis ACL CAT (categories): https://redis.io/docs/latest/commands/acl-cat/
- Redis TLS/encryption documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- ioredis GitHub repository and documentation

## Issues Found
1. **Incorrect `ACL LOG COUNT` syntax** (line 172): The blog used `redis-cli ACL LOG COUNT 10`, but `COUNT` is not a subcommand of `ACL LOG`. The correct syntax is `ACL LOG [count | RESET]` where `count` is a plain integer argument. Fixed to `redis-cli ACL LOG 10`.

## Review Notes
- The `ACL DRYRUN` command was introduced in Redis 7.0, but the post only mentions Redis 6.0 in the overview. This is not technically wrong (the overview correctly attributes ACL to 6.0), but readers should be aware that `ACL DRYRUN` requires Redis 7.0+.
- The `-@write` in `ACL SETUSER readuser on >readpass ~* &* +@read -@write` is redundant since new users start with no permissions and only `+@read` was granted. Not incorrect, but unnecessary.
- The ioredis example uses the `connect` event, which fires before authentication completes. Commands are queued by ioredis and execute after `ready`, so this works in practice, but using the `ready` event would be more semantically correct.
- The `&*` (Pub/Sub channel pattern) syntax requires Redis 6.2+. Earlier 6.x versions use `allchannels` instead.
