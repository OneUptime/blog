# Validation Summary: How to Configure Spring Boot Actuator Custom Health Indicators

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java (17+ — uses records and switch expressions)
- Spring Boot Actuator (health endpoints, health indicators, status aggregation)
- Spring Boot health groups, liveness/readiness probes, availability state
- Spring WebFlux / WebClient (reactive health indicators)
- Spring Data JPA / JdbcTemplate (PostgreSQL health checks)
- Spring Data Redis (cache health checks)
- Spring AMQP / RabbitTemplate (message queue health checks)
- Resilience4j (circuit breaker)
- Kubernetes (startup/liveness/readiness probes, deployment manifests)
- Lombok
- JUnit 5, Mockito, MockMvc (testing)

## Sources Consulted
- [SimpleHttpCodeStatusMapper (Spring Boot API)](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/actuate/health/SimpleHttpCodeStatusMapper.html) — constructor signature
- [SimpleStatusAggregator (Spring Boot 3.5.4 API)](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/actuate/health/SimpleStatusAggregator.html) — varargs constructors
- [HttpCodeStatusMapper (Spring Boot 3.5.5 API)](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/actuate/health/HttpCodeStatusMapper.html)
- [RabbitTemplate (Spring AMQP 4.0.3 API)](https://docs.spring.io/spring-amqp/docs/current/api/org/springframework/amqp/rabbit/core/RabbitTemplate.html) — `getExchange()`
- [Resilience4j CircuitBreaker / Reactor examples](https://resilience4j.readme.io/docs/examples-1) — `CircuitBreakerOperator` reactive usage
- Spring Boot Actuator reference (health, health groups, Kubernetes probes)

## Issues Found
1. **`CircuitBreakerHealthIndicator` — non-existent reactive decoration API.** The post used
   `.transform(mono -> circuitBreaker.decorateMono(() -> mono))`. The `CircuitBreaker` interface has no
   `decorateMono` method; reactive decoration in Resilience4j is done via the `CircuitBreakerOperator`
   from `resilience4j-reactor`. Changed to
   `.transformDeferred(CircuitBreakerOperator.of(circuitBreaker))` and added the corresponding import
   `io.github.resilience4j.reactor.circuitbreaker.operator.CircuitBreakerOperator`. The original code
   would not compile.

2. **`CachedHealthIndicator` — calling builder methods on an immutable `Health` instance.** The cached
   branch returned `cached.health().status(cached.health().getStatus()).withDetail(...)`. `Health` is
   immutable and exposes no instance `status(...)` or `withDetail(...)` methods (those belong to
   `Health.Builder`). Changed to start a fresh builder via the static factory:
   `Health.status(cached.health().getStatus()).withDetails(cached.health().getDetails()).withDetail(...)`,
   matching the pattern already used in the non-cached branch a few lines below. The original code would
   not compile.

3. **`HealthConfig` — wrong key type passed to `SimpleHttpCodeStatusMapper`.** The post passed
   `Map.of(Status.DOWN, 503, ...)` (a `Map<Status, Integer>`), but the constructor signature is
   `SimpleHttpCodeStatusMapper(Map<String, Integer>)` where keys are status *codes* (strings). Changed
   each key to its code, e.g. `Status.DOWN.getCode()`, `new Status("DEGRADED").getCode()`. The original
   code would not compile.

## Review Notes
- Status priority ("DOWN > OUT_OF_SERVICE > UP > UNKNOWN") matches Spring Boot's default
  `SimpleStatusAggregator` ordering — correct.
- `RabbitTemplate.getExchange()` was verified to be a real public method (since Spring AMQP 1.6), so the
  message-queue indicator is fine as written.
- Note for the future: in Spring Boot 4.1.0+, the `SimpleHttpCodeStatusMapper` constructor and
  `SimpleStatusAggregator` constructors are deprecated in favor of `HttpCodeStatusMapper.of(Map)` /
  `StatusAggregator.getDefault()`-style factories. They remain valid on the Spring Boot 3.x line this
  post targets, so no change was made.
- The `CachedHealthIndicator` and several timeout/circuit-breaker examples create per-instance
  `ExecutorService`/blocking calls; these are functionally correct but worth noting as patterns to tune
  for production (thread-pool sizing, `.block()` inside reactive chains). Left as-is since they are not
  technical errors.
- Config properties used (`management.endpoint.health.show-components`, `show-details`, `probes.enabled`,
  health `group`, `management.health.diskspace.threshold`) are all valid for Spring Boot 3.x.
