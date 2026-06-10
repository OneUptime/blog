# Validation Summary: How to Build Conditional Beans in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Framework (`@Profile`, `@Conditional`, `Condition` interface)
- Spring Boot auto-configuration (`@ConditionalOnProperty`, `@ConditionalOnClass`, `@ConditionalOnMissingClass`, `@ConditionalOnBean`, `@ConditionalOnMissingBean`, `@ConditionalOnResource`, `@ConditionalOnWebApplication`, `@ConditionalOnExpression`, `@AutoConfigureAfter`, `@EnableConfigurationProperties`)
- Spring Boot Test (`ApplicationContextRunner`, `FilteredClassLoader`, `AutoConfigurations`, `@SpringBootTest`, `@ActiveProfiles`)
- Spring Data Redis (`RedisCacheManager`, `RedisCacheConfiguration`, `RedisSerializationContext`, `StringRedisSerializer`, `GenericJackson2JsonRedisSerializer`)
- Caffeine (`CaffeineCacheManager`, `Caffeine` builder)
- HikariCP (`HikariConfig`, `HikariDataSource`)
- Spring JDBC (`EmbeddedDatabaseBuilder`, `EmbeddedDatabaseType`)
- Jackson (`ObjectMapper`, `JavaTimeModule`)
- AssertJ (assertion APIs used in tests)

## Sources Consulted
- Spring Boot reference documentation — Condition Annotations: https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.condition-annotations
- Spring Boot API — `org.springframework.boot.autoconfigure.condition` package: https://docs.spring.io/spring-boot/api/java/org/springframework/boot/autoconfigure/condition/package-summary.html
- Spring Framework reference — `@Profile` and profile expressions: https://docs.spring.io/spring-framework/reference/core/beans/environment.html
- Spring Framework API — `Condition`, `ConditionContext`, `AnnotatedTypeMetadata`: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/context/annotation/Condition.html
- Spring Boot reference — Testing Auto-configurations with `ApplicationContextRunner`: https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.testing
- Spring Boot reference — AutoConfiguration.imports file location (`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`, Spring Boot 2.7+): https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html
- Spring Data Redis API — `RedisCacheManager`, `RedisCacheConfiguration`: https://docs.spring.io/spring-data/redis/docs/current/api/
- Caffeine API documentation: https://github.com/ben-manes/caffeine/wiki

## Issues Found
No technical issues found.

All conditional annotations are accurately described and demonstrated:
- `@ConditionalOnProperty` attributes (`name`, `havingValue`, `matchIfMissing`, `prefix`, multi-name array semantics requiring all to match) are correct.
- `@ConditionalOnClass(name = "...")` / `@ConditionalOnMissingClass("...")` correctly use string class names (the `value` attribute on `@ConditionalOnMissingClass` is `String[]`, since classes that may be absent cannot be referenced directly).
- Profile expressions using `|`, `&`, and `!` operators are supported (Spring Framework 5.1+).
- The `Condition` interface signature (`matches(ConditionContext, AnnotatedTypeMetadata)` returning `boolean`) is correct.
- The custom annotation pattern (meta-annotating with `@Conditional` and reading attributes via `metadata.getAnnotationAttributes(...)`) is the canonical approach.
- `ApplicationContextRunner` fluent API (`withConfiguration(AutoConfigurations.of(...))`, `withClassLoader(new FilteredClassLoader(...))`, `withPropertyValues(...)`, `run(...)`) and the AssertJ-based assertions (`hasSingleBean`, `doesNotHaveBean`) match current Spring Boot test APIs.
- The Spring Boot 2.7+/3.x auto-configuration registration file path `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` is correct.
- Redis cache builder API (`RedisCacheManager.builder(...).cacheDefaults(...).build()`, `RedisCacheConfiguration.defaultCacheConfig().entryTtl(...).serializeKeysWith(...).serializeValuesWith(...)`, `disableCachingNullValues()`) is accurate.
- Caffeine APIs (`Caffeine.newBuilder().maximumSize(...).expireAfterWrite(Duration.ofMinutes(...))` and `CaffeineCacheManager.setCaffeine(...)`) are accurate.

## Review Notes
- The `@ConditionalOnClass(name = "org.apache.http.client.HttpClient")` example references Apache HttpClient 4.x. In HttpClient 5.x the package changed to `org.apache.hc.client5.http.classic.HttpClient`. The post does not claim either version, and HttpClient 4.x is still widely deployed, so this is informational only.
- In the `HttpClientAutoConfigurationTest` example, the identifiers `OkHttpClient` and `ApacheHttpClient` are used inside `FilteredClassLoader(...)` calls. These are illustrative imports (Java does not support aliased imports), so readers should treat them as references to the relevant library classes (`okhttp3.OkHttpClient` and `org.apache.http.client.HttpClient`). This is a stylistic shorthand, not a technical error.
- `CacheStatisticsCollector` in the Redis auto-configuration example is a hypothetical user class rather than a Spring-provided type — context makes this clear and the post does not claim otherwise.
- The `DataSourceAutoConfiguration` example is illustrative; Spring Boot already ships its own `DataSourceAutoConfiguration`, so users adopting the pattern in their own starters should pick a different class name to avoid conflicts.
- The post targets Spring Boot 2.7+ / 3.x conventions (especially the `AutoConfiguration.imports` registration mechanism). Readers on older Spring Boot (≤ 2.6) would use `META-INF/spring.factories` with the `EnableAutoConfiguration` key instead. The post does not flag this version cut-off, but the modern approach shown is the recommended one going forward.
