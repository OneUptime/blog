# Validation Summary: How to Use Resilience4j for Circuit Breakers in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot 3
- Resilience4j 2.2.0 (`resilience4j-spring-boot3`)
- Spring Boot AOP starter
- Spring Boot Actuator
- RestTemplate
- Mockito / Spring Boot Test (`@SpringBootTest`, `@MockBean`)

## Sources Consulted
- Resilience4j Spring Boot Getting Started: https://resilience4j.readme.io/docs/getting-started-3
- Resilience4j Circuit Breaker docs: https://resilience4j.readme.io/docs/circuitbreaker
- Resilience4j Retry docs: https://resilience4j.readme.io/docs/retry
- Resilience4j Rate Limiter docs: https://resilience4j.readme.io/docs/ratelimiter
- Resilience4j Bulkhead docs: https://resilience4j.readme.io/docs/bulkhead
- Resilience4j GitHub releases / Maven Central for `io.github.resilience4j:resilience4j-spring-boot3:2.2.0`
- Spring Boot Actuator reference: https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html
- `CircuitBreakerEndpoint` source in `resilience4j-spring-boot3` (returns `{"circuitBreakers": [...]}`)

## Issues Found

1. **Reversed aspect execution order (Combining Multiple Patterns section).** The post originally claimed the order was `Bulkhead -> TimeLimiter -> RateLimiter -> CircuitBreaker -> Retry -> Method` and described Retry as wrapping "the method call first". The official Resilience4j aspect order is hardcoded as `Retry ( CircuitBreaker ( RateLimiter ( TimeLimiter ( Bulkhead ( Function ) ) ) ) )` — Retry is the outermost wrapper, Bulkhead is innermost. Rewrote the diagram and explanation to match.

2. **Wrong aspect ordering in the combined-annotations code comment.** The comment said `Retry -> CircuitBreaker -> Bulkhead -> RateLimiter`, swapping Bulkhead and RateLimiter. Corrected to `Retry -> CircuitBreaker -> RateLimiter -> Bulkhead -> Method` and clarified that the order is fixed by Resilience4j (not by annotation stacking).

3. **Incorrect retry-count arithmetic and CB failure-counting claim.** The post said a failing call would "retry 3 times with waits of 500ms, 1000ms, and 2000ms" and that "only after all retries fail does it count as a circuit breaker failure". With `max-attempts: 3` that is 1 initial call + 2 retries (not 3 retries), so the waits are 500ms and 1000ms. And because Retry is outermost with the default aspect order, every attempt passes through the CB and is counted as a separate call in the sliding window. Reworded.

4. **"Annotation order confusion" pitfall was misleading.** It claimed Spring runs annotations bottom-to-top and recommended placing `@Retry` below `@CircuitBreaker`. Resilience4j's aspect order is hardcoded regardless of annotation order on the method; reordering annotations does nothing. Rewrote the pitfall to call this out and to point at the `resilience4j.*.aspect-order` properties for customization.

5. **Incorrect `/actuator/circuitbreakers` response.** The post showed a detailed state object (failureRate, state, bufferedCalls, etc.) as the response. That endpoint actually returns just `{"circuitBreakers": ["..."]}` (a list of names). The detailed state object shown matches what `/actuator/health` exposes via the circuit breaker health indicator (which the config in the post enables). Split the example into two: a name-list response from `/actuator/circuitbreakers` and the detailed structure under `/actuator/health`.

## Review Notes
- Resilience4j 2.2.0 is a real released version on Maven Central for `resilience4j-spring-boot3`. Newer 2.x releases exist but 2.2.0 is still valid and works with Spring Boot 3.
- `@MockBean` (used in the test example) was deprecated in Spring Boot 3.4 in favor of `@MockitoBean`. It still works, so I did not change it — but readers on the newest Spring Boot may want to migrate.
- `RestTemplate` is in maintenance mode for new projects; Spring recommends `WebClient`/`RestClient` for new code. Not technically wrong for the post; just a forward-looking note.
- The YAML key `automatic-transition-from-open-to-half-open-enabled` requires a daemon thread to drive the transition, which is what Resilience4j's Spring Boot starter wires up — fine as written.
- The `getAllCircuitBreakers()` API on `CircuitBreakerRegistry` returns a Vavr `Seq` which supports `forEach`, so that snippet compiles against Resilience4j 2.x as written.
