# Validation Summary: How to Use Redis Hashes in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hash data structure commands)
- Go (Golang)
- go-redis v9 (`github.com/redis/go-redis/v9`)

## Sources Consulted
- go-redis v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- go-redis hash commands source: https://github.com/redis/go-redis/blob/master/hash_commands.go
- Redis hash commands documentation: https://redis.io/docs/latest/commands/?group=hash
- go-redis scanning hash fields guide: https://redis.uptrace.dev/guide/scanning-hash-fields.html

## Issues Found
- **HVals comment showed stale value for age**: The `HVals` output comment said `// [Alice alice@example.com 30]`, but earlier in the post the `HIncrBy` example increments the `age` field from 30 to 31 (and the comment there correctly shows `// 31`). Since the examples share the same `user:1` key and imply sequential execution, the `HVals` comment was inconsistent. Changed `30` to `31`.

## Review Notes
- The code snippets after the first complete `main()` function are presented as standalone fragments referencing `rdb` and `ctx` without redeclaration. This is a common tutorial convention and is clear enough in context.
- Redis does not guarantee ordering of hash fields, so comments like `// [name email age]` for `HKeys` output may not match actual runtime order. This is standard tutorial practice and not an error.
- All go-redis v9 API calls (`HSet`, `HGet`, `HMGet`, `HGetAll`, `HIncrBy`, `HIncrByFloat`, `HSetNX`, `HDel`, `HExists`, `HKeys`, `HVals`, `HLen`) are verified as correct with proper signatures and return types.
- The import path `github.com/redis/go-redis/v9` is the current official path.
- Struct scanning with `redis:"fieldname"` tags and `.Scan(&struct)` on `HGetAll` results is correctly demonstrated.
- The `HSet` usage with both variadic field-value pairs and `map[string]interface{}` is correctly shown.
