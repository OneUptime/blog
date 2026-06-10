# Validation Summary: How to Build Event Listeners in Spring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java (Spring Framework, Spring Boot)
- Spring `ApplicationEventPublisher` and `@EventListener`
- Spring `@TransactionalEventListener` and `TransactionPhase`
- Spring `@Async` with `@EnableAsync` and `ThreadPoolTaskExecutor`
- Spring Expression Language (SpEL) for conditional listeners
- `@Order` for listener execution ordering
- JUnit 5, Mockito, Spring Boot Test (`@SpringBootTest`, `@MockitoBean`)

## Sources Consulted
- Spring Framework reference: Events (https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html#context-functionality-events)
- Spring Framework reference: Annotation-based Event Listeners (https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html#context-functionality-events-annotation)
- Spring Framework reference: Transactional Event Listeners (https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html)
- Spring Framework Javadoc: `@TransactionalEventListener`, `TransactionPhase`
- Spring Framework Javadoc: `@EventListener` SpEL condition context (`#root.event`, `#root.args`, argument names)
- Spring Boot reference: Testing (Mocking and Spying Beans) (https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html)
- Spring Boot 3.4 release notes — deprecation of `@MockBean` / `@SpyBean` in favor of `@MockitoBean` / `@MockitoSpyBean`
- Mockito documentation: `verify(... , timeout(...))`, `MockitoExtension`

## Issues Found
- **`@MockBean` is deprecated.** The integration test example used `@MockBean` from `org.springframework.boot.test.mock.mockito`. This was deprecated for removal in Spring Boot 3.4 (November 2024) in favor of `@MockitoBean` from Spring Framework 6.2 (`org.springframework.test.context.bean.override.mockito.MockitoBean`). For a post dated 2026-01-30, using the modern annotation is appropriate. Updated to `@MockitoBean`.

## Review Notes
- The SpEL condition `"#event.username.startsWith('admin')"` relies on parameter-name preservation (`-parameters` compiler flag). Spring Boot enables this by default in its parent POM, so the example is correct for typical Spring Boot projects. Outside Spring Boot, readers may need to use `#root.args[0].username` or `#a0.username` instead. Not changed — the post implicitly targets Spring Boot.
- `executor.initialize()` is unnecessary when the executor is declared as a `@Bean` because Spring invokes `afterPropertiesSet()` (which calls `initialize()`) automatically. Calling it manually is harmless and appears in many official Spring tutorials, so it was left as-is.
- The code snippets use `log.warn(...)`, `auditLog.record(...)`, and `metrics.increment(...)` without showing the field declarations. These are illustrative snippets (commonly backed by Lombok's `@Slf4j` or autowired fields) — typical for a blog tutorial and not a technical error.
- The claim that "returning a non-null value from an `@EventListener` causes Spring to publish it as a new event" is accurate per the Spring reference docs; collections and arrays of events are also supported.
- Default `TransactionPhase` for `@TransactionalEventListener` is `AFTER_COMMIT`, matching the post.
