# Validation Summary: How to Implement Request/Response Logging in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide (hands-on implementation walkthrough with multiple approaches)

## Technologies Covered
- Java (17+, uses pattern matching for `instanceof` and `Matcher.replaceAll(Function)`)
- Spring Boot 3 / Spring Framework 6 (Jakarta EE `jakarta.servlet.*` namespace)
- Spring Web MVC (Servlet Filters, `OncePerRequestFilter`, `HandlerInterceptor`, `WebMvcConfigurer`)
- `ContentCachingRequestWrapper` / `ContentCachingResponseWrapper`
- `CommonsRequestLoggingFilter`
- SLF4J / MDC
- Logback + `logstash-logback-encoder` (structured JSON logging)
- Jackson (`ObjectMapper`, `JsonNode`, `ObjectNode`) for sensitive-data masking
- Lombok (`@Slf4j`, `@RequiredArgsConstructor`, `@Data`)
- Spring Boot `@ConfigurationProperties`
- JUnit 5 + Spring `MockMvc` / `MockHttpServletRequest` / `MockFilterChain`

## Sources Consulted
- Spring Framework API — `AbstractRequestLoggingFilter` / `CommonsRequestLoggingFilter` (`setIncludeHeaders`, `setIncludeClientInfo`, `setIncludePayload`, `setBeforeMessagePrefix`, `setAfterMessagePrefix`): https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/filter/CommonsRequestLoggingFilter.html
- Spring Framework API — `ContentCachingRequestWrapper` / `ContentCachingResponseWrapper`: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/util/ContentCachingResponseWrapper.html
- Spring Web MVC — `HandlerInterceptor` and `WebMvcConfigurer#addInterceptors`: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html
- Hibernate 6 ORM User Guide — SQL/parameter logging categories (`org.hibernate.SQL`, `org.hibernate.orm.jdbc.bind`): https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#best-practices-logging
- Logback documentation — `AsyncAppender` (`queueSize`, `discardingThreshold`, `neverBlock`, `includeCallerData`): https://logback.qos.ch/manual/appenders.html#AsyncAppender
- logstash-logback-encoder README — `LogstashEncoder`, `includeMdcKeyName`, `customFields`, `timestampPattern`, v7.4: https://github.com/logfellow/logstash-logback-encoder
- Java SE API — `Matcher.replaceAll(Function<MatchResult,String>)` (Java 9+): https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/regex/Matcher.html

## Issues Found
- **Outdated Hibernate logging category (fixed).** The `application.yml` example used `org.hibernate.type.descriptor.sql: TRACE` for bound-parameter logging. That category belongs to Hibernate 5. Since the entire post targets Spring Boot 3 (it uses the `jakarta.servlet.*` namespace, which ships with Hibernate 6), this logger no longer emits parameter bindings. Changed it to the Hibernate 6 equivalent `org.hibernate.orm.jdbc.bind: TRACE`. (`org.hibernate.SQL: DEBUG` is unchanged — still correct in Hibernate 6.)

## Review Notes
- The remaining code is technically sound and uses current, non-deprecated APIs: the Jakarta servlet namespace, `OncePerRequestFilter`, the content-caching wrappers, `CommonsRequestLoggingFilter` setters, `HandlerMethod` pattern matching (Java 16+), and `Matcher.replaceAll(Function)` (Java 9+) are all valid for Spring Boot 3 / Java 17.
- `logstash-logback-encoder` 7.4 is a valid release and is compatible with the Logback 1.4.x bundled by Spring Boot 3.x.
- Caveat worth noting (not an error): `ContentCachingRequestWrapper` only captures the request body *after* it has been consumed downstream (e.g., by the controller). If a handler never reads the body, `getContentAsByteArray()` returns empty — so the request-body log line may be blank for endpoints that don't bind the body. This is expected behavior of the wrapper, and the post's logging-in-`finally` approach handles the normal case correctly.
- Minor comment nuance (not changed): in the async Logback example, the comment on `discardingThreshold=0` ("Don't block when queue is full, drop events instead") is slightly imprecise — `discardingThreshold=0` actually disables preemptive discarding of lower-level events, while `neverBlock=true` is what guarantees the logging thread never blocks (dropping events instead). The configuration itself is functionally correct.
- `CommonsRequestLoggingFilter` logs only request data (before/after the request); the custom `setAfterMessagePrefix("RESPONSE: ")` prefix is cosmetic and does not cause the filter to log the response body. This matches the filter's documented behavior and the post does not claim otherwise.
