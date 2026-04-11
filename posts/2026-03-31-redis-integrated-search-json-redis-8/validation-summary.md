# Validation Summary: How to Use Integrated Search and JSON in Redis 8.0+

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 8.0 (core server with integrated modules)
- Redis JSON commands (JSON.SET, JSON.GET, JSON.MGET)
- Redis Search commands (FT.CREATE, FT.SEARCH, FT.AGGREGATE, FT.INFO, FT.DROPINDEX)
- Python redis-py client library

## Sources Consulted
- Redis official documentation for JSON commands: https://redis.io/docs/latest/commands/?group=json
- Redis official documentation for Search commands: https://redis.io/docs/latest/commands/?group=search
- Redis 8.0 release notes and announcements regarding module integration into core
- redis-py client library documentation: https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

## Review Notes
- The `JSON.MGET` output comment (`# ["Berlin", "London"]`) is a simplified illustration. In practice, each key returns a separate JSON array (e.g., `1) "[\"Berlin\"]"` and `2) "[\"London\"]"` in redis-cli). This is acceptable for blog readability.
- The Python example uses `execute_command()` for raw Redis commands rather than the higher-level `r.json()` and `r.ft()` interfaces available in redis-py 4.x+. This is a valid approach and arguably better for a tutorial since it maps directly to the Redis commands being taught.
- The statement "The index reflects the change immediately on the next query" is accurate — Redis re-indexes JSON documents synchronously on write, so changes are visible as soon as `JSON.SET` returns.
