# Validation Summary: How to Use JSON.ARRINDEX in Redis to Search JSON Arrays

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisJSON module
- JSON.ARRINDEX command
- Python redis-py client library

## Sources Consulted
- Official Redis JSON.ARRINDEX documentation: https://redis.io/docs/latest/commands/json.arrindex/
- redis-py source code (arrindex method signature): https://github.com/redis/redis-py/blob/master/redis/commands/json/commands.py

## Issues Found

### 1. "Searching for Objects" section was incorrect
**What was wrong:** The post included a section demonstrating `JSON.ARRINDEX` searching for a JSON object (`'{"sku":"B2"}'`) within an array of objects, claiming it would return the matching index. The official Redis documentation explicitly states that JSON.ARRINDEX searches for "the first occurrence of a **JSON scalar value**" — it only supports scalar types (strings, numbers, booleans, null), not objects or arrays. The redis-py library also names the parameter `scalar`, confirming this restriction.

**What was changed:** Removed the entire "Searching for Objects" section, including the setup command, the ARRINDEX example, and the note about exact JSON representation matching.

### 2. Value parameter description was imprecise
**What was wrong:** The `value` parameter was described as "the JSON value to search for (must be valid JSON)", which implied any JSON value (including objects and arrays) would work.

**What was changed:** Updated to "the JSON scalar to search for (string, number, boolean, or null)" to accurately reflect the command's scalar-only restriction.

## Review Notes
- The Python deduplication example uses a non-atomic check-then-append pattern (arrindex followed by arrappend). This is fine for a tutorial but would need a transaction or Lua script for production use with concurrent clients.
- All other code examples (basic search, not-found, start offset, range search, wildcard path) were verified correct against the sample data.
- The mermaid flowchart accurately represents the search logic.
- The `stop` parameter behavior (exclusive, default 0 meaning end of array) matches the official documentation.
