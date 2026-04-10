# Validation Summary: How to Use RedisInsight for Key Browsing and Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis
- RedisInsight (Browser view)
- Redis commands: SCAN, KEYS, HSET, DEL, PERSIST, MEMORY USAGE

## Sources Consulted
- Redis official documentation for SCAN command: https://redis.io/docs/latest/commands/scan/
- Redis official documentation for MEMORY USAGE command: https://redis.io/docs/latest/commands/memory-usage/
- Redis official documentation for HSET command: https://redis.io/docs/latest/commands/hset/
- Redis official documentation for DEL command: https://redis.io/docs/latest/commands/del/
- Redis official documentation for PERSIST command: https://redis.io/docs/latest/commands/persist/
- RedisInsight documentation: https://redis.io/docs/latest/operate/redisinsight/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that SCAN is used internally instead of KEYS, which is the production-safe approach for key enumeration.
- Setting TTL to `-1` in RedisInsight's UI triggers a `PERSIST` command internally, which is the correct way to remove expiration. This is accurately described.
- The `MEMORY USAGE` command referenced requires Redis 4.0+. The post does not mention this version requirement, but this is a minor omission since Redis 4.0 has been available since 2017 and is well past end-of-life for earlier versions.
- The `Ctrl+R` shortcut for refreshing is mentioned; this works in the RedisInsight desktop app (Electron-based). Users on macOS would use `Cmd+R` instead, which the post does not mention.
- The bulk deletion warning about individual `DEL` commands is a useful and accurate caveat. For very large deletions, users might prefer `UNLINK` (async delete), but RedisInsight uses `DEL` by default.
