# Validation Summary: How to Use Redis JSON with Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack / RedisJSON module
- Go (Golang)
- go-redis v9 (`github.com/redis/go-redis/v9`)
- Docker (for Redis Stack setup)
- JSONPath queries

## Sources Consulted
- Redis JSON.SET command documentation: https://redis.io/docs/latest/commands/json.set/
- Redis JSON.GET command documentation: https://redis.io/docs/latest/commands/json.get/
- Redis JSON.TYPE command documentation: https://redis.io/docs/latest/commands/json.type/
- Redis JSON.ARRAPPEND command documentation: https://redis.io/docs/latest/commands/json.arrappend/
- Redis JSON.NUMINCRBY command documentation: https://redis.io/docs/latest/commands/json.numincrby/
- Redis JSON.DEL command documentation: https://redis.io/docs/latest/commands/json.del/
- go-redis v9 documentation and source: https://github.com/redis/go-redis
- Redis Stack Docker image: https://hub.docker.com/r/redis/redis-stack

## Issues Found

1. **Intro text referenced wrong command names**: The introduction mentioned `JSONSet` and `JSONGet` in backticks (suggesting go-redis method names), but all code examples use raw Redis commands via `rdb.Do(ctx, "JSON.SET", ...)`. Changed to `JSON.SET` and `JSON.GET` to match the actual commands used in the code examples.

2. **JSON.TYPE with `.Text()` would fail for JSONPath responses**: The `JSON.TYPE` command with a JSONPath (`$.roles`) returns a RESP array response, not a bulk string. Calling `.Text()` on the `*redis.Cmd` result would return an error because it cannot convert an array to a string. Changed `.Text()` to `.StringSlice()` which correctly handles the array response, and updated the inline comment from `// ["array"]` to `// [array]` to reflect Go's `fmt.Println` output for a string slice.

## Review Notes
- go-redis v9 provides dedicated JSON helper methods (`JSONSet`, `JSONGet`, `JSONType`, etc.) that could simplify the code. The `Do`-based approach used in this post is valid and works, but a future update could show the typed helper methods as an alternative.
- The `getUser` function calls `JSON.GET` without a path argument, which defaults to the root path and returns the full document as a JSON string (not wrapped in an array). This correctly allows direct unmarshalling into a struct. If a JSONPath like `$` were used instead, the response would be wrapped in an array and require different handling.
- The User struct in the "Decode into a Struct" section omits the `address` field present in the stored document. This is fine because Go's `json.Unmarshal` silently ignores unknown fields, but readers should be aware of this behavior.
- Error handling is intentionally minimal in the snippet sections (using `_` for errors) for brevity, which is acceptable for a tutorial.
