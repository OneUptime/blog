# Validation Summary: How to Implement Rate Limiting with Bucket4j in Spring Boot

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Java
- Spring Boot
- Spring MVC interceptors
- Spring AOP
- Bucket4j
- Redis
- Lettuce Redis client
- Maven and Gradle dependency configuration

## Sources Consulted
- Bucket4j current documentation landing page: https://bucket4j.com/
- Bucket4j 8.17.0 reference documentation for current builder-style examples and Redis/Lettuce integration shape: https://bucket4j.com/8.17.0/toc.html
- Bucket4j 8.11.1 release notes for artifact naming and Redis module split: https://bucket4j.com/8.11.1/release-notes.html
- Maven Central metadata and source artifacts for Bucket4j 8.19.0 core and Lettuce modules: https://repo1.maven.org/maven2/com/bucket4j/
- Spring Framework MVC interceptor documentation: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html
- Spring Framework `HandlerInterceptor` Javadocs: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/HandlerInterceptor.html
- Spring Framework `ResponseStatusException` Javadocs: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/server/ResponseStatusException.html
- Guava `RateLimiter` source/Javadocs: https://github.com/google/guava/blob/master/guava/src/com/google/common/util/concurrent/RateLimiter.java
- Resilience4j RateLimiter documentation: https://resilience4j.readme.io/docs/ratelimiter

## Issues Found
- The dependency snippets used the older `com.bucket4j:bucket4j-core:8.7.0` coordinate. Current Bucket4j releases use JDK-specific artifact names, so the snippets were updated to `com.bucket4j:bucket4j_jdk17-core:8.19.0`.
- The Redis dependency snippet used the older aggregate `bucket4j-redis` artifact. Current Bucket4j Redis support is split by Redis client, so the snippet was updated to `bucket4j_jdk17-redis-common` and `bucket4j_jdk17-lettuce` at `8.19.0`.
- The Java examples used deprecated `Bandwidth.classic(...)` and `Refill.greedy(...)` construction. These were replaced with the current `Bandwidth.builder().capacity(...).refillGreedy(...).build()` style.
- The Redis example used deprecated `LettuceBasedProxyManager.builderFor(...)` and the older `proxyManager.builder().build(...)` usage. It now uses `Bucket4jLettuce.casBasedBuilder(connection)` and `proxyManager.getProxy(...)`.
- The Redis section said Bucket4j integrates through Spring Data Redis, but the code uses Lettuce directly. The wording now says Redis clients such as Lettuce.
- The `Retry-After` calculation truncated nanoseconds to whole seconds, which could emit `0` for a positive sub-second wait. It now rounds up with `Math.ceil(...)`.
- The interceptor wrote the response body before setting the content type. The content type is now set before writing the JSON body.
- The multi-bandwidth explanation claimed clients cannot exceed 100 requests over any one-minute period. Token bucket limits can still allow boundary bursts, so the wording now describes the sustained average over time.

## Review Notes
- I could not compile the snippets locally because this environment does not have `java` or `mvn` installed. Validation was performed against official documentation, Maven Central metadata, and Bucket4j 8.19.0 source artifacts.
- The examples still use in-memory maps for non-distributed buckets. That is appropriate for a tutorial, but production systems should consider eviction for unbounded key growth.
- The `X-Forwarded-For` example is technically common, but production deployments should only trust forwarded headers from known proxies.
