# Validation Summary: What Does 'ERR invalid password' Mean in Redis

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (versions 5 and earlier, and 6+ with ACL)
- Redis CLI (`redis-cli`)
- Redis ACL system (AUTH, ACL LIST, ACL SETUSER)
- Python (`redis-py` library)
- Node.js (`ioredis` library)
- Kubernetes (`kubectl exec`)

## Sources Consulted
- Redis AUTH command documentation: https://redis.io/docs/latest/commands/auth/
- Redis ACL SETUSER documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL LIST documentation: https://redis.io/docs/latest/commands/acl-list/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- redis-py library source (redis/exceptions.py for AuthenticationError)
- ioredis documentation for constructor and event patterns

## Issues Found
1. **Missing ioredis import in Node.js code block** (line ~200): The Node.js example used `new Redis({...})` without importing the `ioredis` package first. Added `const Redis = require('ioredis');` at the top of the code block. Without this line, `Redis` would be undefined at runtime.

## Review Notes
- All Redis error messages (`ERR invalid password` for Redis 5, `WRONGPASS invalid username-password pair or user is disabled.` for Redis 6+) are accurate.
- AUTH command syntax for both single-argument (password only) and two-argument (username + password) forms is correct.
- ACL SETUSER syntax including `>password` prefix, key patterns (`~*`), and command categories (`+@all`) is correct.
- ACL LIST output format including `&*` channel pattern (Redis 6.2+) is accurate.
- `CONFIG GET requirepass` usage and caveats are correctly described.
- `requirepass` in redis.conf without quotes is correct per official config format.
- Python `redis.exceptions.AuthenticationError` is the correct exception class in redis-py.
- The Node.js code implicitly uses ioredis (not the official `node-redis` client which uses `createClient()`). The import fix makes this explicit.
