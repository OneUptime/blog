# Validation Summary: How to Build Async Methods with CompletableFuture in Spring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java 17+
- Spring Boot 3.x
- Spring `@Async` and `@EnableAsync`
- `java.util.concurrent.CompletableFuture`
- `ThreadPoolTaskExecutor` (Spring `org.springframework.scheduling.concurrent`)
- `AsyncConfigurer` / `AsyncUncaughtExceptionHandler` (Spring)
- `SyncTaskExecutor` (Spring `org.springframework.core.task`)
- JUnit 5 / Spring Boot Test
- AssertJ
- Awaitility

## Sources Consulted
- Spring Framework reference — Task Execution & Scheduling: https://docs.spring.io/spring-framework/reference/integration/scheduling.html
- Spring `@EnableAsync` / `AsyncConfigurer` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/annotation/AsyncConfigurer.html
- Spring `ThreadPoolTaskExecutor` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/concurrent/ThreadPoolTaskExecutor.html
- Spring `AsyncUncaughtExceptionHandler` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/aop/interceptor/AsyncUncaughtExceptionHandler.html
- Java SE 17 `CompletableFuture` Javadoc: https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CompletableFuture.html
- JEP 266 (Java 9 CompletableFuture additions: `orTimeout`, `completeOnTimeout`, `failedFuture`)
- Java 12 release notes (`exceptionallyCompose` introduced)
- AssertJ `CompletableFutureAssert` Javadoc
- Awaitility documentation: http://www.awaitility.org/

## Issues Found
No technical issues found.

Detailed verification:
- All Spring class names, package paths, and annotations (`@EnableAsync`, `@Async`, `AsyncConfigurer`, `AsyncUncaughtExceptionHandler`, `ThreadPoolTaskExecutor`, `SyncTaskExecutor`) are correct.
- `ThreadPoolTaskExecutor` setters used (`setCorePoolSize`, `setMaxPoolSize`, `setQueueCapacity`, `setThreadNamePrefix`, `setWaitForTasksToCompleteOnShutdown`, `setAwaitTerminationSeconds`, `initialize`) all exist with the described semantics, including the documented behavior that threads scale beyond core size only once the queue is full.
- All `CompletableFuture` methods used (`thenApply`, `thenCompose`, `thenCombine`, `allOf`, `anyOf`, `exceptionally`, `handle`, `exceptionallyCompose`, `orTimeout`, `completeOnTimeout`, `applyToEither`, `failedFuture`, `supplyAsync`, `completedFuture`, `get`, `join`) exist in Java 17 with the described behavior. `exceptionallyCompose` (Java 12+) and `orTimeout`/`completeOnTimeout`/`failedFuture` (Java 9+) are all available given the stated Java 17 prerequisite.
- `@Async` rules (must be public, no self-invocation, return void or `Future`, class must be a Spring bean) are accurate for Spring's proxy-based async model.
- The default-executor warning is correct: when no `TaskExecutor`/`taskExecutor` bean is resolvable, Spring falls back to `SimpleAsyncTaskExecutor`, which does not pool threads and spawns one per submission.
- `orTimeout` exception handling correctly accesses `ex.getCause()` because `orTimeout` completes the future exceptionally with a `TimeoutException`, which `exceptionally` receives wrapped in a `CompletionException`.
- AssertJ usage (`assertThat(CompletableFuture).isCompleted()`, `assertThatThrownBy(...).hasCauseInstanceOf(...)`) and Awaitility fluent API (`await().atMost(...).pollInterval(...).untilAsserted(...)`) are correct.
- The `record UserStockPair(...)` requires Java 16+, which is satisfied by the Java 17 prerequisite.

## Review Notes
- The post does not list AssertJ or Awaitility as explicit dependencies, though `spring-boot-starter-test` already brings in AssertJ transitively. Awaitility is not included by default and would need to be added separately if a reader wants to run the Awaitility-based test; this is a minor omission rather than a technical error.
- `@ExtendWith(SpringExtension.class)` is redundant when `@SpringBootTest` is already present (since `@SpringBootTest` is meta-annotated with `SpringExtension`), but it is not incorrect.
- Several illustrative snippets reference fields or classes that are not fully defined in the post (e.g., `pricingServiceA`, `scheduler`, `backupUserService`, `UserRepository` shape). This is acceptable for a tutorial focused on async patterns and does not represent a technical inaccuracy.
- Spring Boot 3.2+ also offers built-in virtual-thread support (`spring.threads.virtual.enabled=true`) for Java 21 environments. The post (correctly) targets Java 17 + Spring Boot 3.x and stays scoped to platform-thread pools; readers on Java 21 may want to additionally consider virtual threads, but this is out of scope.
