# Validation Summary: How to Use phpredis C Extension for High Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- PHP
- phpredis C extension
- PECL

## Sources Consulted
- phpredis official GitHub README: https://github.com/phpredis/phpredis/blob/develop/README.md
- phpredis stub file (method signatures): https://github.com/phpredis/phpredis/blob/develop/redis.stub.php
- phpredis C source (library.c) for JSON serializer behavior

## Issues Found

### 1. Incorrect `scan()` method usage (lines 122-128)

**What was wrong:** The `scan()` example had three errors:
1. Used an associative array `['match' => 'user:*', 'count' => 100]` as the second parameter. The method takes positional parameters: `$pattern` (string) and `$count` (int).
2. Used array destructuring `[$cursor, $keys] = $redis->scan(...)` on the return value. The method returns only the keys array (or `false`); the cursor/iterator is updated via pass-by-reference on the first parameter.
3. Did not handle the `false` return value, which would cause a warning when iterating with `foreach`.

**What was changed:** Replaced with the correct phpredis `scan()` API usage — positional parameters (`$iterator, 'user:*', 100`), cursor passed by reference, return value is just the keys array, and added a `$keys !== false` check.

**Why:** The original code would produce a PHP fatal error at runtime because `scan()` does not accept an associative array, and array destructuring would fail on the return value.

## Review Notes
- The `pconnect()` example appears in the same code block as `connect()`. While not an error, readers might be confused into thinking both should be called sequentially. The comments make the intent clear enough.
- `Redis::SERIALIZER_JSON` requires phpredis to be compiled with JSON support. If not available, a warning is emitted. The post could mention this prerequisite but it's not an error.
- `hMSet()` is deprecated in Redis 4.0+ in favor of `hSet()` with multiple field-value pairs, but phpredis still supports it. Not an error in the current context.
- `Redis::COMPRESSION_LZF` requires LZF support compiled into the extension. The post could note this but it is not incorrect as stated.
