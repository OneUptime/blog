# Validation Summary: How to Build Asynchronous APIs with Spring Boot

## Status
validated

## Post Type
Tutorial / Guide (hands-on, code-heavy walkthrough)

## Technologies Covered
- Java (17+, as required by Spring Boot 3.2)
- Spring Boot 3.2.0 (Spring Web MVC + Spring WebFlux)
- `@Async` / `AsyncConfigurer` / `ThreadPoolTaskExecutor`
- `java.util.concurrent.CompletableFuture`
- `DeferredResult` (long-polling)
- `Callable` (MVC async thread offloading)
- `WebClient` + Reactor (`Mono`, `Flux`, `Retry`) over Reactor Netty
- Micrometer / Spring Boot Actuator / Prometheus
- Maven (pom.xml) and Gradle build configuration
- Lombok

## Sources Consulted
- Spring Framework reference — Asynchronous execution & `@Async` / `AsyncConfigurer`: https://docs.spring.io/spring-framework/reference/integration/scheduling.html
- Spring MVC async request processing (`Callable`, `DeferredResult`, returning `CompletableFuture`/reactive types): https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html
- Spring `WebClient` reference: https://docs.spring.io/spring-framework/reference/web/webflux-webclient.html
- Project Reactor reference (`Mono.zip`, `retryWhen`/`Retry.backoff`, `onErrorResume`, `timeout`): https://projectreactor.io/docs/core/release/reference/
- Java SE 17 `CompletableFuture` Javadoc (`supplyAsync`, `allOf`, `thenCompose`, `exceptionallyCompose`, `failedFuture`, `orTimeout`, `handle`): https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CompletableFuture.html
- Spring Boot 3.2 reference — task execution properties (`spring.task.execution.pool.*`) and `spring.mvc.async.request-timeout`: https://docs.spring.io/spring-boot/docs/3.2.0/reference/html/application-properties.html
- Spring Boot Actuator / Micrometer Prometheus — property `management.prometheus.metrics.export.enabled` (relocated in Boot 3.0) and executor metrics naming: https://docs.spring.io/spring-boot/docs/3.2.0/reference/html/actuator.html
- Micrometer naming conventions (dot→underscore, counter `_total` suffix for Prometheus): https://docs.micrometer.io/micrometer/reference/concepts/naming.html

## Issues Found
1. **`@Async` on a private, self-invoked method (`findOrderFromCacheAsync`)** — In `OrderService`, the fallback helper `findOrderFromCacheAsync` was annotated `@Async` while being both `private` and called from within the same class (`findOrderWithFallback`). Spring's `@Async` works via runtime proxies, so it cannot intercept private methods or intra-class self-invocations; the annotation was a silent no-op and directly contradicted the post's own "Common Pitfalls" section (which warns against exactly this). Fixed by removing the misleading `@Async` annotation and adding a short comment explaining why it is omitted. The method already returns `CompletableFuture.completedFuture(...)`, so behavior is unchanged and the code is now self-consistent.

## Review Notes
- All version-specific facts verified: Spring Boot 3.2.0 (Nov 2023) and Gradle plugins `org.springframework.boot:3.2.0` / `io.spring.dependency-management:1.1.4` are valid; Spring Boot 3.2 requires Java 17, so `CompletableFuture` methods used (`failedFuture`, `orTimeout`, `exceptionallyCompose`) are all available.
- Prometheus query names are correct: the Micrometer counter `async.tasks.total` becomes `async_tasks_total_total` (dots→underscores plus the counter `_total` suffix), so `rate(async_tasks_total_total[5m])` is accurate. Executor metric names (`executor_active_threads`, `executor_queued_tasks`, `executor_completed_tasks_total` with the `name` tag) match Spring Boot's auto-instrumentation of `@Bean` `ThreadPoolTaskExecutor`s.
- The Actuator property `management.prometheus.metrics.export.enabled` is correct for Spring Boot 3.x (it was relocated from `management.metrics.export.prometheus.*` in Boot 3.0).
- Configuration keys (`spring.task.execution.pool.core-size/max-size/queue-capacity`, `spring.mvc.async.request-timeout`) are valid Spring Boot properties.
- Minor (left as-is, not errors): `findOrderAsync` combines `@Async` with `CompletableFuture.supplyAsync(...)`, which is redundant (two layers of thread hand-off) but functionally correct. The pom includes both `spring-boot-starter-web` and `spring-boot-starter-webflux`; with both present Spring Boot starts as a servlet (MVC) app, which is consistent with the controllers shown (MVC supports returning `Mono`/`CompletableFuture`/`Callable`/`DeferredResult`). These are acceptable stylistic/illustrative choices, not technical defects.
