# Validation Summary: How to Use RedisTemplate for Custom Operations in Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Spring Boot
- Spring Data Redis (`spring-boot-starter-data-redis`)
- `RedisTemplate` and its operations interfaces (`ValueOperations`, `HashOperations`, `ZSetOperations`)
- `Jackson2JsonRedisSerializer` / `StringRedisSerializer`
- Redis Lua scripting via `DefaultRedisScript`
- Redis pipelining via `executePipelined`
- Java / Maven

## Sources Consulted
- Spring Data Redis reference documentation (https://docs.spring.io/spring-data/redis/reference/)
- Spring Data Redis API Javadoc for `RedisTemplate`, `ValueOperations`, `Jackson2JsonRedisSerializer`, `DefaultRedisScript`, `DefaultScriptExecutor`
- Spring Data Redis source code for `DefaultScriptExecutor.execute()` to verify arg serialization behavior
- Spring Data Redis `DefaultedRedisConnection` Javadoc for deprecation status of `set(byte[], byte[])`

## Issues Found

### 1. Lua script argument serialization bug (fixed)
**What was wrong:** The `incrementWithExpiry` method passed `String.valueOf(ttlSeconds)` as an argument to `template.execute()`. Because the template's value serializer is `Jackson2JsonRedisSerializer`, this Java String `"30"` would be serialized as a JSON string literal -- producing the bytes `"30"` (with surrounding double-quote characters). When the Lua script then calls `redis.call('EXPIRE', KEYS[1], ARGV[1])`, Redis receives `"30"` (with quotes) instead of `30`, and EXPIRE fails with `ERR value is not an integer or out of range`.

**What was changed:** Changed `String.valueOf(ttlSeconds)` to `ttlSeconds` (passing the int directly). `Jackson2JsonRedisSerializer` serializes an `Integer` as a JSON number (`30`, no quotes), so ARGV[1] in Lua receives the string `30` without quote characters, which EXPIRE correctly parses as an integer.

**Why:** `DefaultScriptExecutor.execute(script, keys, args)` delegates to the overload that uses the template's value serializer for arg serialization. With `Jackson2JsonRedisSerializer`, Java Strings get JSON-quoted but Java Integers do not, making the integer form correct for passing numeric arguments to Lua scripts.

## Review Notes

1. **`conn.set(byte[], byte[])` in pipeline section is deprecated in Spring Data Redis 3.x.** The `set` method on `DefaultedRedisConnection` is deprecated in favor of `conn.stringCommands().set(...)`. The code still compiles and runs, but users on Spring Boot 3.x will see deprecation warnings. Since the post does not target a specific Spring Boot version, this was not changed.

2. **`Jackson2JsonRedisSerializer(Class<T>)` constructor and Spring Data Redis 4.0.** The single-arg constructor used in the post is valid and not deprecated in Spring Data Redis 3.x. However, the entire `Jackson2JsonRedisSerializer` class is deprecated in Spring Data Redis 4.0 (Spring Boot 4.x) in favor of `JacksonJsonRedisSerializer`. Users on future Spring Boot 4.x should migrate.

3. **Deserialization caveat with `Jackson2JsonRedisSerializer<>(Object.class)`.** When deserializing, stored POJOs come back as `LinkedHashMap` rather than the original type because no `@class` type information is included in the JSON. This is consistent with the post's `Object` return type but is a common pitfall. `GenericJackson2JsonRedisSerializer` embeds type information and preserves original types, at the cost of portability.

4. **`"1".getBytes()` in pipeline section uses platform default charset.** Best practice is `"1".getBytes(StandardCharsets.UTF_8)` for deterministic behavior across platforms. This is a minor style concern, not a functional bug.
