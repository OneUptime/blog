# Validation Summary: How to Integrate Redis with Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Spring Boot
- Spring Data Redis
- Spring Cache Abstraction
- Spring Session Data Redis
- Spring WebFlux / Reactive Redis
- Java
- Maven and Gradle

## Sources Consulted
- Spring Boot Common Application Properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Spring Boot Build Systems / Starters: https://docs.spring.io/spring-boot/reference/using/build-systems.html
- Spring Data Redis RedisTemplate reference: https://docs.spring.io/spring-data/redis/reference/redis/template.html
- Spring Data Redis Redis Cache reference: https://docs.spring.io/spring-data/redis/reference/redis/redis-cache.html
- Spring Data Redis Pub/Sub Messaging reference: https://docs.spring.io/spring-data/redis/reference/redis/pubsub.html
- Spring Data Redis Scripting reference: https://docs.spring.io/spring-data/redis/reference/redis/scripting.html
- Spring Data Redis serializer API / deprecated list: https://docs.spring.io/spring-data/redis/reference/api/java/deprecated-list.html
- Spring Session Redis configuration reference: https://docs.spring.io/spring-session/reference/configuration/redis.html
- Spring Session `EnableRedisHttpSession` API: https://docs.spring.io/spring-session/reference/3.5/api/java/org/springframework/session/data/redis/config/annotation/web/http/EnableRedisHttpSession.html

## Issues Found
1. **Incorrect Spring Boot Redis property prefix**: The application YAML used `spring.redis.*`, which is the older Spring Boot 2.x namespace. Current Spring Boot documentation lists Redis configuration under `spring.data.redis.*`. Updated the YAML to use `spring.data.redis.*`, including the Lettuce pool, cluster, and sentinel sections.

2. **Gradle dependency mismatch**: The Maven example included `spring-boot-starter-data-redis-reactive`, but the Gradle example omitted it. Added the reactive Redis starter to the Gradle snippet so it matches the reactive section later in the post.

3. **Custom `StringRedisTemplate` bean returned the wrong type**: The configuration method was named `stringRedisTemplate` but returned `RedisTemplate<String, String>`. That can conflict with Spring Boot's auto-configured `StringRedisTemplate` bean name and does not satisfy injection points typed as `StringRedisTemplate`. Changed the bean to return `StringRedisTemplate`.

4. **Deprecated Jackson serializer APIs for current Spring Data Redis**: The examples used `GenericJackson2JsonRedisSerializer` and `Jackson2JsonRedisSerializer`, which are deprecated in Spring Data Redis 4.x. Updated the snippets to use the stable `RedisSerializer.json()` factory method.

5. **Reactive service snippet missing repository and model references**: The reactive cache example used `User` and `userRepository` without declaring the imports or field. Added `User`, `ReactiveUserRepository`, and the repository field so the snippet is complete.

6. **Distributed lock snippet missing imports and used an imprecise template type**: The example referenced `DefaultRedisScript`, `Collections`, and `Callable` without imports, and used `RedisTemplate<String, String>` where `StringRedisTemplate` is clearer and matches the operations. Added the missing imports and changed the field type to `StringRedisTemplate`.

7. **Health check leaked Redis connections**: The health indicator obtained a Redis connection and called `ping()` without closing it. Updated the code to use try-with-resources with `RedisConnection`.

## Review Notes
The post is technically relevant and the corrected examples align with current Spring Boot and Spring Data Redis documentation. Some examples remain illustrative and assume application-specific types such as `User`, `LoginRequest`, `SessionUser`, `UnauthorizedException`, `UserRepository`, and `ReactiveUserRepository` exist in the reader's project.
