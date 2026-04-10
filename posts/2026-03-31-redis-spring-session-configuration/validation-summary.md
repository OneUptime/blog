# Validation Summary: How to Configure Spring Session with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Spring Boot 3.x
- Spring Session Data Redis
- Java / Spring MVC
- HTTP Sessions and Cookies

## Sources Consulted
- Spring Session official guide: https://docs.spring.io/spring-session/reference/guides/boot-redis.html
- Spring Boot 3.0 Configuration Changelog: https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Configuration-Changelog
- EnableRedisHttpSession API docs: https://docs.spring.io/spring-session/docs/current/api/org/springframework/session/data/redis/config/annotation/web/http/EnableRedisHttpSession.html
- RedisIndexedSessionRepository API docs: https://docs.spring.io/spring-session/docs/current/api/org/springframework/session/data/redis/RedisIndexedSessionRepository.html
- Spring Boot issue #27756 (removal of spring.session.store-type): https://github.com/spring-projects/spring-boot/issues/27756
- Spring Boot issue #28772 / PR #28784 (cookie property mapping for Spring Session): https://github.com/spring-projects/spring-boot/issues/28772

## Issues Found
1. **Removed property `spring.session.store-type: redis`**: This property was removed in Spring Boot 3.0 (milestone 3.0.0-M4). Spring Boot 3.x auto-detects the session store from the classpath dependency, so this line is invalid. **Fix:** Removed `store-type: redis` from the `application.yml` example and added a note that session store type is auto-detected from the classpath.

## Review Notes
- The `flush-mode: on-save` value works due to Spring Boot's relaxed binding, though the canonical documented form is `on_save` (underscore). Both are functionally equivalent.
- The `@EnableRedisHttpSession` annotation and the YAML auto-configuration approach are correctly presented as alternatives. Readers should be aware that using the annotation overrides Spring Boot's auto-configuration, meaning YAML properties like `spring.session.redis.namespace` and cookie settings from `server.servlet.session.cookie.*` may not take effect.
- The `maxInactiveIntervalInSeconds = 1800` example is technically the default value (30 minutes), so it's redundant as shown, but serves its purpose as an illustrative example.
- The namespace `myapp:sessions` results in Redis keys like `myapp:sessions:sessions:{id}` (double "sessions"), which is technically correct but may confuse readers. A simpler namespace like `myapp` would produce cleaner keys (`myapp:sessions:{id}`).
- There is a known issue in Spring Session 3.5.0 (GitHub #3423) where `spring.session.redis.namespace` may not take effect under certain auto-configuration conditions. The annotation-based approach (`@EnableRedisHttpSession(redisNamespace = "...")`) is a reliable workaround.
