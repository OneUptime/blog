# Validation Summary: How to Use JSON.ARRLEN in Redis to Get JSON Array Length

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisJSON module / Redis Stack)
- JSON.ARRLEN command
- JSONPath syntax (`$`-based paths, wildcards)
- redis-py (Python Redis client with JSON module support)

## Sources Consulted
- Official Redis JSON.ARRLEN documentation: https://redis.io/docs/latest/commands/json.arrlen/
- redis-py source code and API for `json().arrlen()`, `json().arrappend()`, `json().set()`, `json().get()`: https://github.com/redis/redis-py
- Redis JSONPath documentation for `$`-based path behavior and return types

## Issues Found
1. **"Path Not Found" example output was incorrect.** The blog showed `JSON.ARRLEN post:1 $.nonexistent` returning `1) (nil)`, but with `$`-based JSONPath, when a path matches zero nodes in the document, Redis returns `(empty array)`, not a single-element array containing nil. The `(nil)` response within an array occurs when the path matches a node that is **not an array** (e.g., a string or number), which is a different scenario. Fixed the output to `(empty array)` and updated the explanatory text to distinguish between "path matches no nodes" (empty array) and "path matches a non-array node" (nil entry).

## Review Notes
- The flow diagram simplifies the distinction between "path not found" (returns empty array with `$` paths) and "not an array" (returns nil entry in the result array). This is acceptable for a high-level overview but readers should be aware of the difference.
- The Pagination Helper function has inconsistent return types: it returns `[]` when the array is empty/missing but a tuple `(items, total_pages)` on success. This is a code quality issue, not a Redis accuracy issue, so it was left as-is.
- The Python code examples use `$`-based paths, so `arrlen()` returns a list (e.g., `[3]`), not a bare integer. The code correctly handles this by accessing `length[0]`. This is a common source of confusion when mixing `$` and `.` path syntaxes.
- The `add_tag` function has a TOCTOU (time-of-check-time-of-use) race between `arrlen` and `arrappend`. This is acceptable for a tutorial but would need a Lua script or transaction in production.
- The redis-py default path for `arrlen()` when called without a path argument is `"."` (legacy root), not `"$"`. The blog correctly uses explicit `$` paths in all Python examples, avoiding this potential confusion.
