# Validation Summary: How to Use Redis JSON with Java (Jedis/Lettuce)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisJSON module)
- Java
- Jedis (`redis.clients:jedis:5.1.0`)
- Lettuce (`io.lettuce:lettuce-core`)
- Gson (Google JSON serialization library)

## Sources Consulted
- Jedis GitHub repository and source code (https://github.com/redis/jedis) — verified `UnifiedJedis`, `Path2`, `jsonSet`, `jsonGet`, `jsonArrAppend`, `jsonDel`, `jsonType` APIs against v5.1.0 tag
- Lettuce GitHub repository and source code (https://github.com/redis/lettuce) — verified `JsonPath`, `JsonSetArgs`, `jsonSet`, `jsonGet`, `jsonNumincrby` APIs and version requirements
- Lettuce `RedisJsonCommands` interface source — confirmed JSON support added in 6.5.0, String-accepting `jsonSet` overloads added in 6.8.0

## Issues Found
1. **Lettuce version incorrect (critical):** The post specified `io.lettuce:lettuce-core:6.3.2.RELEASE`, but this version has no RedisJSON support at all. The `io.lettuce.core.json` package was introduced in version 6.5.0.RELEASE, and the String-accepting `jsonSet(key, JsonPath, String, JsonSetArgs)` overload used in the blog's code examples requires version 6.8.0.RELEASE or later. **Fixed:** Changed the version from `6.3.2.RELEASE` to `6.8.0.RELEASE`.

## Review Notes
- The Jedis section (v5.1.0) is technically correct. All API signatures (`jsonSet`, `jsonGet`, `jsonArrAppend`, `jsonDel`, `jsonType` with `Path2`) match the actual Jedis source code. The `jsonArrAppend` call with `"\"moderator\""` is the correct encoding for the non-escape variant of the API.
- Jedis 5.1.0 is valid but not the latest stable (5.2.0 exists). This is acceptable for a tutorial.
- The POJO/Gson serialization pattern (`gson.toJson(user)` passed to `jsonSet` with `Path2`) is correct and matches official Jedis test patterns.
- Lettuce `jsonGet` returns `List<JsonValue>`, not a single value. The blog's comment `// [9.99]` correctly shows the list format, so this is not misleading.
- Lettuce 7.x is available but the blog stays in the 6.x line, which is still maintained and reasonable for a tutorial.
