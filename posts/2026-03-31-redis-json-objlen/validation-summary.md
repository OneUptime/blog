# Validation Summary: How to Use JSON.OBJLEN in Redis to Count JSON Object Keys

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- RedisJSON module (JSON.OBJLEN, JSON.OBJKEYS, JSON.SET commands)
- JSONPath query syntax
- Python redis-py client library

## Sources Consulted
- Redis official documentation for JSON.OBJLEN: https://redis.io/docs/latest/commands/json.objlen/
- Redis official documentation for JSON.OBJKEYS: https://redis.io/docs/latest/commands/json.objkeys/
- Redis official documentation for JSON.SET: https://redis.io/docs/latest/commands/json.set/
- redis-py client library documentation for JSON methods

## Issues Found
1. **Flow diagram: "Path not found" return value was incorrect for JSONPath.**
   - **What was wrong:** The Mermaid flow diagram stated that when a path is not found, the command returns nil. This is only true for legacy dot-notation paths. When using JSONPath (`$`-based paths, which the entire post uses), a non-existent path returns an empty array `[]`, not nil.
   - **What was changed:** Updated the flow diagram node from `"Return nil"` to `"Return empty array"` for the "Path not found" branch.
   - **Why:** The official Redis documentation distinguishes between JSONPath and legacy path behavior. Since the post exclusively uses JSONPath syntax, the diagram should reflect JSONPath semantics.

## Review Notes
- The introduction describes JSON.OBJLEN as "a scalar shortcut" compared to JSON.OBJKEYS. This is conceptually reasonable (count vs. list), though technically JSONPath queries return an array of integers, not a single scalar. The examples correctly show array-style output, so this is a minor wording nuance rather than an error.
- The Python code examples correctly handle the array return type by accessing `count[0]` and guarding with `if count` (which correctly handles the empty-array case for non-existent keys).
- All Redis command syntax, JSON structures, expected outputs, and Python API calls are accurate.
- The comparison table between JSON.OBJLEN and JSON.OBJKEYS is correct.
