# Validation Summary: How to Use JSON.OBJKEYS in Redis to List JSON Object Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisJSON module (JSON.OBJKEYS command)
- Python (redis-py client library)
- JSONPath syntax

## Sources Consulted
- Official Redis documentation for JSON.OBJKEYS: https://redis.io/docs/latest/commands/json.objkeys/
- redis-py library source code for `json().objkeys()` method signature and default path behavior

## Issues Found
- **Default path value was incorrect**: The post stated the `path` parameter "defaults to `$`" but the official Redis documentation and redis-py source confirm the default is `.` (the legacy root path), not `$`. Fixed by changing the description to "defaults to `.`, the legacy root path".

## Review Notes
- The post uses JSONPath (`$`) syntax throughout its examples, which returns nested arrays (array of arrays). The "Basic Syntax" section description says "Returns an array of string field names, or nil if the path does not point to an object" — this is a slight simplification since JSONPath returns an array where each element is either an array of key strings or nil. However, the CLI output examples correctly display the nested array format (e.g., `1) 1) "name"`), so this is not misleading in practice.
- The flow diagram shows "Path not found → Return nil" which is accurate for legacy path syntax but not for JSONPath, where a non-matching path returns an empty array `[]`. Since the diagram is a high-level conceptual overview, this is acceptable but worth noting.
- The Python `safe_update` example correctly indexes `keys[0]` to unwrap the outer array from the JSONPath response, which is good practice.
- All Python code examples use correct redis-py API calls and would function as described.
