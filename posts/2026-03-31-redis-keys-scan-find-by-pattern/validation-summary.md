# Validation Summary: How to Use KEYS and SCAN in Redis to Find Keys by Pattern

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (KEYS and SCAN commands)
- Redis glob-style pattern matching
- redis-cli command-line tool
- Bash scripting (SCAN loop example)

## Sources Consulted
- Redis official documentation for KEYS command (https://redis.io/commands/keys)
- Redis official documentation for SCAN command (https://redis.io/commands/scan)
- Redis official documentation for pattern matching / glob-style patterns
- Redis 6.0 release notes for SCAN TYPE filter

## Issues Found
- **SCAN guarantees description was misleading**: In the KEYS vs SCAN comparison table, the Guarantees row for SCAN stated "May return duplicates, misses keys added/removed mid-scan." Per Redis documentation, SCAN guarantees that keys present for the entire duration of the iteration will be returned. Keys added or deleted during the scan may or may not appear — there is no guarantee either way. The word "misses" incorrectly implied they would definitely be absent. Changed to: "May return duplicates; keys added/removed mid-scan may or may not appear."

## Review Notes
- All Redis command syntax (KEYS, SCAN, SET, HSET) is correct.
- The glob-style pattern syntax table is accurate, including the `[^abc]` negation syntax.
- The SCAN TYPE filter is correctly noted as a Redis 6.0+ feature.
- The bash SCAN loop correctly parses redis-cli output (cursor on first line, keys on subsequent lines) and terminates when the cursor returns to 0.
- The `redis-cli --scan --pattern` usage is correct.
- The mermaid flowchart accurately represents the KEYS blocking behavior vs SCAN's incremental cursor-based iteration.
- The COUNT parameter is correctly described as a hint rather than a strict limit.
