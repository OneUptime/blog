# Validation Summary: How to Implement Custom Actuator Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java (Spring Boot 3.x)
- Spring Boot Actuator (`@Endpoint`, `@WebEndpoint`, `@RestControllerEndpoint`, `@ReadOperation`, `@WriteOperation`, `@DeleteOperation`, `@Selector`, `@EndpointWebExtension`)
- Spring Boot Health system (`HealthIndicator`, `ReactiveHealthIndicator`, `CompositeHealthContributor`, `HealthEndpoint`)
- Spring Security (`SecurityFilterChain`, `@PreAuthorize`)
- Spring MVC (`@GetMapping`, `ResponseEntity`)
- Spring WebFlux (`WebClient`, `Mono`)
- Java JMX / `java.lang.management` (`RuntimeMXBean`, `MemoryMXBean`)
- Maven / Gradle
- JUnit 5, MockMvc, `@WithMockUser`

## Sources Consulted
- Spring Boot Endpoints reference: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- `@RestControllerEndpoint` Javadoc (deprecation): https://docs.spring.io/spring-boot/api/java/org/springframework/boot/actuate/endpoint/web/annotation/RestControllerEndpoint.html
- `CompositeHealthContributor` Javadoc: https://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/actuate/health/CompositeHealthContributor.html
- Spring Boot 2.2 release notes (JMX disabled by default): https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.2-Release-Notes
- Spring Boot Actuator source/javadocs for operation discovery and the `cache.time-to-live` property semantics

## Issues Found
1. **Duplicate `@ReadOperation` routes in `CacheStatisticsEndpoint`.** The original example declared three `@ReadOperation` methods: `allCacheStats()` (no params), `cacheStats(@Selector String cacheName)`, and `cacheStatsByRegion(@Nullable String region)`. The first and third both register the route `GET /actuator/cache-stats` (non-`@Selector` parameters are bound from the query string and do not differentiate routes), which causes endpoint discovery to fail with a duplicate-operation error at startup. Fix: merged the no-parameter and query-parameter cases into a single `allCacheStats(@Nullable String region)` method that handles both `GET /actuator/cache-stats` and `GET /actuator/cache-stats?region=...`, and kept the `@Selector` method for the path-variable case.
2. **`@WebEndpoint` introduced but `@RestControllerEndpoint` shown.** The "Web-Specific Endpoints" intro claimed the example uses `@WebEndpoint` while the code actually uses `@RestControllerEndpoint`. Rewrote the paragraph to distinguish the two: `@WebEndpoint` for HTTP-only operations using the standard operation annotations; `@RestControllerEndpoint` for full Spring MVC features. Also added a deprecation note: `@RestControllerEndpoint` was deprecated in Spring Boot 3.3.0 in favor of `@Endpoint` / `@WebEndpoint`.
3. **Inaccurate default-exposure claim.** The text said "By default, most endpoints are exposed over JMX but not over the web". In practice, only `health` is exposed over HTTP by default, and JMX has been disabled by default (`spring.jmx.enabled=false`) since Spring Boot 2.2 — so JMX endpoints are not exposed unless JMX is explicitly enabled. Reworded for accuracy.
4. **Missing imports in code samples.** Added `java.util.Map` (and `java.util.HashMap` where applicable) to the `TempFilesEndpoint`, `ApiDocumentationEndpoint`, and `ConfigManagerEndpoint` snippets, and added `org.springframework.web.reactive.function.client.WebClient` to the `ExternalApiHealthIndicator` snippet, all of which referenced the types without importing them. Also removed the unused `ReadOperation` import from `ApiDocumentationEndpoint` (which uses `@GetMapping`, not `@ReadOperation`).

## Review Notes
- `management.endpoint.<id>.cache.time-to-live` only caches operations with no parameters. The configuration sample sets a TTL on `cache-stats`, which would have no effect because the endpoint's read operations both take parameters (a `@Selector` and a `@Nullable` query arg). Left as-is since it is technically valid YAML and a benign no-op, but worth flagging if the author revisits.
- The `BuildInfoWebExtension` constructs a `WebEndpointResponse` with status `200`; the post does not show using a non-200 status, which would be the more compelling demonstration of why the extension exists.
- `@PreAuthorize` on `@WriteOperation`/`@ReadOperation` requires `@EnableMethodSecurity` (Spring Security 6) to be present in the application context. The post doesn't mention this prerequisite explicitly.
- The endpoint examples use `@Component` alongside `@Endpoint` / `@EndpointWebExtension`; this works, but Spring Boot 3.x can also register `@Endpoint`-annotated beans via `@Bean` factory methods without `@Component`. Stylistic only.
- The `formatBytes` helper uses `Math.log(bytes) / Math.log(1024)` and indexes `"KMGTPE"`. Correct for the labels used, but loses precision at very large sizes; acceptable for an observability dashboard.
