# Validation Summary: How to Use JSON.MERGE in Redis for Partial JSON Updates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisJSON (JSON module)
- JSON.MERGE command
- RFC 7396 JSON Merge Patch
- Python redis-py client

## Sources Consulted
- Redis official documentation for JSON.MERGE: https://redis.io/docs/latest/commands/json.merge/
- Redis official documentation for JSON.GET: https://redis.io/docs/latest/commands/json.get/
- RFC 7396 JSON Merge Patch: https://datatracker.ietf.org/doc/html/rfc7396
- redis-py source code for JSONCommands.merge() method

## Issues Found

1. **Incorrect Redis Stack version**: The post stated JSON.MERGE was introduced in "Redis Stack 6.2 / RedisJSON 2.6". The official documentation states it was introduced in RedisJSON 2.6.0, which shipped with Redis Stack 7.2, not 6.2. Fixed to: "RedisJSON 2.6 (included in Redis Stack 7.2)".

2. **JSON.GET output format without path argument**: Two instances of `JSON.GET user:1` (called without a JSONPath argument) showed array-wrapped output `[{...}]`. When JSON.GET is called without a path (or with the legacy `.` path), it returns the raw JSON value directly, not wrapped in an array. Array wrapping only occurs when using JSONPath syntax (e.g., `$`). Fixed both instances to show the unwrapped object output.

## Review Notes
- The examples using explicit JSONPath (e.g., `JSON.GET product:1 $.details`, `JSON.GET config:1 $.server`) correctly show array-wrapped output, which is the expected behavior for JSONPath queries.
- The Python example correctly uses `r.json().merge(key, path, obj)` which matches the redis-py `JSONCommands.merge()` method signature. The use of `None` to represent JSON `null` for key deletion is correct.
- The RFC 7396 merge semantics flowchart is accurate.
- The comparison table between JSON.MERGE, JSON.SET per field, and GET+modify+SET is accurate.
- The post does not mention that merging into an existing array replaces the entire array rather than merging element-by-element. This is a known RFC 7396 behavior that could be a useful addition in the future but is not an error.
