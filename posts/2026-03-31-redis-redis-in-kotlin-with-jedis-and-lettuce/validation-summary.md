# Validation Summary: How to Use Redis in Kotlin with Jedis and Lettuce

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Kotlin (JVM)
- Jedis 5.1.0 (synchronous Redis client)
- Lettuce 6.3.2.RELEASE (async/reactive Redis client)
- Kotlin Coroutines (kotlinx-coroutines)
- Gradle (Kotlin DSL)

## Sources Consulted
- Jedis GitHub repository and API docs (https://github.com/redis/jedis)
- Lettuce reference documentation (https://lettuce.io/core/release/reference/)
- Lettuce Maven Central POM for 6.3.2.RELEASE (to verify optional dependency declarations)
- kotlinx-coroutines documentation (https://github.com/Kotlin/kotlinx.coroutines)
- Lettuce Kotlin coroutines integration docs (https://lettuce.io/core/release/reference/#kotlin)

## Issues Found
1. **Missing `kotlinx-coroutines-reactive` dependency in Lettuce coroutines section.** The post listed only `kotlinx-coroutines-core` as a dependency for the Lettuce coroutines example. However, Lettuce's coroutine extensions internally bridge Reactor's `Mono`/`Flux` to Kotlin `suspend` functions and `Flow` via the `kotlinx-coroutines-reactive` module. This module is declared as an optional (non-transitive) dependency in Lettuce's POM, so it must be explicitly added by the user. Without it, the code would fail at runtime with `NoClassDefFoundError`. **Fix:** Added `implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactive:1.7.3")` to the dependency block.

## Review Notes
- The Jedis and Lettuce versions used (5.1.0 and 6.3.2.RELEASE respectively) are not the absolute latest but are stable and correct for the APIs demonstrated. The code examples remain fully compatible with newer versions.
- The `JedisPool` API shown is still valid in Jedis 5.x, though `JedisPooled` is a newer simplified alternative. This is not an error; `JedisPool` is not deprecated.
- The comparison table accurately reflects the state of both libraries, including Lettuce being the default client in Spring Data Redis.
- All code examples are syntactically correct Kotlin and use the correct API signatures for the stated library versions.
