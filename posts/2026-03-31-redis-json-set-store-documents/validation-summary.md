# Validation Summary: How to Use JSON.SET in Redis to Store JSON Documents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisJSON module
- Redis Stack / Redis Cloud
- JSONPath syntax

## Sources Consulted
- Official Redis documentation for JSON.SET: https://redis.io/docs/latest/commands/json.set/
- Official Redis documentation for JSON.GET: https://redis.io/docs/latest/commands/json.get/
- RedisJSON JSONPath documentation: https://redis.io/docs/latest/develop/data-types/json/path/

## Issues Found

1. **NX/XX parameter descriptions were oversimplified.** The post described `NX` as "set only if the key does not exist" and `XX` as "set only if the key already exists." Per the official Redis docs, NX and XX operate on the *path*, not just the key. At the root path `$`, they check key existence, but at sub-paths (e.g., `$.name`) they check whether the specific path exists within the document. Updated the descriptions to clarify this distinction.

2. **JSON.GET output without a path was incorrect.** The post showed `JSON.GET user:1` (with no path argument) returning the value wrapped in an array: `[{...}]`. When no path is provided, `JSON.GET` defaults to the legacy path `.`, which returns the raw JSON value directly — not wrapped in an array. The array-wrapped format only occurs when using JSONPath syntax (e.g., `JSON.GET user:1 $`). Fixed the expected output to show the unwrapped JSON object.

## Review Notes
- The code examples are otherwise correct and use current RedisJSON v2 syntax with JSONPath (`$` prefix).
- The `JSON.SET` with wildcard `$.items[*].qty` is a valid operation but worth noting it only works in RedisJSON v2+ (included in Redis Stack 6.2+). This is the current standard so no change needed.
- The mermaid diagram is a reasonable simplification of the internal flow, though in practice the behavior for missing intermediate paths is more nuanced (JSON.SET will not create missing intermediate objects — only the final leaf can be created if its parent exists).
