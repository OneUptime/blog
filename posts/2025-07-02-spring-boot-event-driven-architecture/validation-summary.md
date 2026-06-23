# Validation Summary: How to Build Event-Driven Architecture with Spring Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot (Spring Framework events)
- Spring `ApplicationEventPublisher` / `@EventListener`
- Spring `@Async` / `ThreadPoolTaskExecutor` / `AsyncConfigurer`
- Spring `@TransactionalEventListener` (transaction phases)
- Spring Expression Language (SpEL) conditions
- Spring `@Order` listener ordering
- Spring Retry (`@Retryable` / `@Backoff`)
- Spring Boot Test, JUnit 5, Mockito, AssertJ
- Lombok, JPA, H2

## Sources Consulted
- Spring Framework reference — Application Events: https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html#context-functionality-events
- Spring Framework reference — Transaction-bound events / `@TransactionalEventListener`: https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html
- Spring Boot 3.4 release notes / deprecation of `@MockBean` and `@SpyBean`: https://github.com/spring-projects/spring-boot/issues/39860
- `@MockitoSpyBean` (Spring Test bean override): https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/context/bean/override/mockito/MockitoSpyBean.html
- Spring Retry `@Retryable` API (`retryFor` vs deprecated `value`): https://docs.spring.io/spring-retry/docs/current/apidocs/org/springframework/retry/annotation/Retryable.html

## Issues Found
1. **Deprecated `@Retryable(value = ...)` attribute** — In `ResilientEventListener`, the retry annotation used `value = {RuntimeException.class}`. Spring Retry 2.0 deprecated the `value` attribute in favor of `retryFor`. Changed to `retryFor = {RuntimeException.class}`.
2. **Deprecated `@SpyBean` annotation** — The integration test (`OrderEventIntegrationTest`) used `org.springframework.boot.test.mock.mockito.SpyBean` / `@SpyBean`, which Spring Boot deprecated in 3.4.0 (scheduled for removal in 4.0) in favor of Spring Framework's `@MockitoSpyBean`. Updated the import to `org.springframework.test.context.bean.override.mockito.MockitoSpyBean` and the field annotation to `@MockitoSpyBean`.

## Review Notes
- The core technical content is accurate: `@TransactionalEventListener` defaulting to `AFTER_COMMIT`, the meaning of the four `TransactionPhase` values, `fallbackExecution`, synchronous-by-default listener behavior, `@Async` listener semantics, `@Order` (lowest value = highest priority), SpEL `condition` syntax (`#event.totalAmount > 1000`, `.startsWith(...)`, `&&`), event-hierarchy listening (a listener on a supertype receives subtype events), and `@EventListener(classes = {...})` with an `Object` parameter are all correct.
- Minor consistency note (not a code error, left as-is): the standalone `OrderCreatedEvent` class defined early in the post does **not** extend `BaseEvent`/`OrderEvent`, yet the "Event Hierarchy Processing" diagram and the `GenericEventListener` discussion imply it sits under `OrderEvent`. As written, `handleAllBaseEvents(BaseEvent)` / `handleAllOrderEvents(OrderEvent)` would catch `OrderShippedEvent` and `InventoryReservedEvent` but not the standalone `OrderCreatedEvent`. This is a narrative inconsistency rather than broken code; fixing it would require restructuring the central event class (whose constructor signature differs), so it was left untouched.
- `@MockitoSpyBean` is documented as not always a 1:1 drop-in for `@SpyBean` in complex bean-creation scenarios, but for the simple spy used here it is the correct current replacement.
- `@EnableAsync` appears on both `AsyncConfig` and the main `Application` class — redundant but harmless.
