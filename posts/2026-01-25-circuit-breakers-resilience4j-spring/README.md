# How to Implement Circuit Breakers with Resilience4j in Spring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Resilience4j, Circuit Breaker, Spring Boot, Fault Tolerance

Description: Learn how to implement the circuit breaker pattern in Spring Boot applications using Resilience4j. This guide covers configuration, fallback strategies, and monitoring for building resilient microservices.

---

> When a downstream service fails, the worst thing your application can do is keep hammering it with requests. Circuit breakers prevent this cascade of failures by failing fast when a service is down. Resilience4j makes implementing this pattern in Spring Boot straightforward.

In distributed systems, service failures are inevitable. A slow or unresponsive downstream service can bring your entire application to its knees as threads pile up waiting for timeouts. The circuit breaker pattern solves this by wrapping calls to external services and monitoring for failures. When failures exceed a threshold, the circuit "opens" and subsequent calls fail immediately without attempting the operation.

---

## What is the Circuit Breaker Pattern?

Think of a circuit breaker like an electrical fuse. When too much current flows through, the fuse trips to protect the circuit. Similarly, a software circuit breaker trips when too many failures occur, protecting your system from cascading failures.

A circuit breaker has three states:

| State | Behavior | Transitions To |
|-------|----------|----------------|
| **Closed** | Requests pass through normally | Open (on failure threshold) |
| **Open** | Requests fail immediately | Half-Open (after wait duration) |
| **Half-Open** | Limited requests pass through | Closed (on success) or Open (on failure) |

---

## Setting Up Resilience4j in Spring Boot

First, add the Resilience4j dependencies to your `pom.xml`:

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Resilience4j Spring Boot starter -->
    <dependency>
        <groupId>io.github.resilience4j</groupId>
        <artifactId>resilience4j-spring-boot3</artifactId>
        <version>2.2.0</version>
    </dependency>

    <!-- AOP support for annotations -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-aop</artifactId>
    </dependency>

    <!-- Actuator for monitoring endpoints -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
</dependencies>
```

For Gradle users:

```groovy
// build.gradle
dependencies {
    implementation 'io.github.resilience4j:resilience4j-spring-boot3:2.2.0'
    implementation 'org.springframework.boot:spring-boot-starter-aop'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
}
```

---

## Basic Circuit Breaker Configuration

Configure your circuit breakers in `application.yml`. This configuration defines how many failures trigger the circuit to open and how long it stays open before attempting recovery.

```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      # Circuit breaker for the payment service
      paymentService:
        # Use a sliding window to track call outcomes
        slidingWindowType: COUNT_BASED
        slidingWindowSize: 10        # Track the last 10 calls
        minimumNumberOfCalls: 5      # Need at least 5 calls before evaluating
        failureRateThreshold: 50     # Open circuit if 50% of calls fail
        waitDurationInOpenState: 30s # Wait 30 seconds before trying again
        permittedNumberOfCallsInHalfOpenState: 3  # Allow 3 test calls
        automaticTransitionFromOpenToHalfOpenEnabled: true

      # Circuit breaker for the inventory service
      inventoryService:
        slidingWindowType: TIME_BASED
        slidingWindowSize: 60        # Track calls over 60 seconds
        minimumNumberOfCalls: 10
        failureRateThreshold: 60
        slowCallRateThreshold: 80    # Also open if 80% of calls are slow
        slowCallDurationThreshold: 2s # Calls taking > 2s are considered slow
        waitDurationInOpenState: 60s
        permittedNumberOfCallsInHalfOpenState: 5
```

---

## Implementing Circuit Breakers with Annotations

The simplest way to add circuit breaker protection is with the `@CircuitBreaker` annotation. Resilience4j intercepts calls to annotated methods and applies the configured protection.

```java
// PaymentService.java
// Service class that calls an external payment API
package com.example.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class PaymentService {

    private final RestTemplate restTemplate;

    public PaymentService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // Apply circuit breaker protection to this method
    // Falls back to handlePaymentFailure when circuit is open or call fails
    @CircuitBreaker(name = "paymentService", fallbackMethod = "handlePaymentFailure")
    public PaymentResponse processPayment(PaymentRequest request) {
        // This call is now protected by the circuit breaker
        // If the payment API is down, calls will fail fast
        return restTemplate.postForObject(
            "https://payment-api.example.com/process",
            request,
            PaymentResponse.class
        );
    }

    // Fallback method - must have the same return type
    // The exception parameter lets you handle different failures differently
    private PaymentResponse handlePaymentFailure(PaymentRequest request, Exception ex) {
        // Log the failure for debugging
        log.warn("Payment service unavailable, using fallback. Error: {}", ex.getMessage());

        // Return a response indicating the payment is pending
        // The actual processing can be retried later via a queue
        return PaymentResponse.builder()
            .status(PaymentStatus.PENDING)
            .message("Payment queued for processing")
            .transactionId(generatePendingId(request))
            .build();
    }
}
```

---

## Programmatic Circuit Breaker Usage

For more control, you can use the circuit breaker programmatically. This approach is useful when you need dynamic configuration or want to inspect the circuit breaker state.

```java
// InventoryService.java
// Programmatic circuit breaker usage with manual control
package com.example.service;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.vavr.control.Try;
import org.springframework.stereotype.Service;

import java.util.function.Supplier;

@Service
public class InventoryService {

    private final CircuitBreaker circuitBreaker;
    private final InventoryClient inventoryClient;

    public InventoryService(
            CircuitBreakerRegistry circuitBreakerRegistry,
            InventoryClient inventoryClient) {
        // Get the circuit breaker instance from the registry
        // Configuration comes from application.yml
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("inventoryService");
        this.inventoryClient = inventoryClient;
    }

    public InventoryResponse checkInventory(String productId) {
        // Create a supplier that wraps our API call
        Supplier<InventoryResponse> decoratedSupplier = CircuitBreaker
            .decorateSupplier(circuitBreaker, () -> inventoryClient.getInventory(productId));

        // Execute with Try monad for clean error handling
        return Try.ofSupplier(decoratedSupplier)
            .recover(throwable -> handleInventoryFailure(productId, throwable))
            .get();
    }

    // Check circuit breaker state before making calls
    public boolean isServiceAvailable() {
        CircuitBreaker.State state = circuitBreaker.getState();
        // Only CLOSED state means the service is fully available
        return state == CircuitBreaker.State.CLOSED;
    }

    // Get metrics for monitoring dashboards
    public CircuitBreakerMetrics getMetrics() {
        CircuitBreaker.Metrics metrics = circuitBreaker.getMetrics();
        return CircuitBreakerMetrics.builder()
            .failureRate(metrics.getFailureRate())
            .slowCallRate(metrics.getSlowCallRate())
            .numberOfBufferedCalls(metrics.getNumberOfBufferedCalls())
            .numberOfFailedCalls(metrics.getNumberOfFailedCalls())
            .numberOfSuccessfulCalls(metrics.getNumberOfSuccessfulCalls())
            .state(circuitBreaker.getState().name())
            .build();
    }

    private InventoryResponse handleInventoryFailure(String productId, Throwable ex) {
        log.warn("Inventory check failed for product {}: {}", productId, ex.getMessage());
        // Return cached or default inventory data
        return inventoryCache.getOrDefault(productId, InventoryResponse.unknown());
    }
}
```

---

## Combining Circuit Breaker with Retry and Timeout

Resilience4j provides multiple resilience patterns that work well together. The order of decorators matters - typically you want Retry on the outside, then Circuit Breaker, then Timeout.

```java
// ResilientApiClient.java
// Combining multiple resilience patterns for robust API calls
package com.example.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
public class ResilientApiClient {

    private final WebClient webClient;

    public ResilientApiClient(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
            .baseUrl("https://api.example.com")
            .build();
    }

    // Stack multiple resilience annotations
    // Order of execution: TimeLimiter -> CircuitBreaker -> Retry -> Actual call
    @TimeLimiter(name = "externalApi")       // Cancel if takes too long
    @CircuitBreaker(name = "externalApi", fallbackMethod = "fallback")
    @Retry(name = "externalApi")              // Retry transient failures
    public CompletableFuture<ApiResponse> callExternalApi(String requestId) {
        return webClient.get()
            .uri("/data/{id}", requestId)
            .retrieve()
            .bodyToMono(ApiResponse.class)
            .toFuture();
    }

    // Fallback must match the return type (CompletableFuture in this case)
    private CompletableFuture<ApiResponse> fallback(String requestId, Exception ex) {
        log.warn("External API call failed for request {}: {}", requestId, ex.getMessage());
        return CompletableFuture.completedFuture(ApiResponse.defaultResponse());
    }
}
```

Configure the additional patterns in `application.yml`:

```yaml
# application.yml - Additional resilience configuration
resilience4j:
  circuitbreaker:
    instances:
      externalApi:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 30s

  retry:
    instances:
      externalApi:
        maxAttempts: 3                    # Try up to 3 times
        waitDuration: 500ms               # Wait 500ms between retries
        enableExponentialBackoff: true    # Double wait time each retry
        exponentialBackoffMultiplier: 2
        retryExceptions:                  # Only retry these exceptions
          - java.io.IOException
          - java.util.concurrent.TimeoutException

  timelimiter:
    instances:
      externalApi:
        timeoutDuration: 3s               # Cancel calls after 3 seconds
        cancelRunningFuture: true         # Actually cancel the future
```

---

## Monitoring Circuit Breaker State

Resilience4j integrates with Spring Boot Actuator to expose circuit breaker metrics. Enable the endpoints in your configuration:

```yaml
# application.yml - Actuator configuration
management:
  endpoints:
    web:
      exposure:
        include: health,circuitbreakers,circuitbreakerevents
  endpoint:
    health:
      show-details: always
  health:
    circuitbreakers:
      enabled: true
```

You can also listen to circuit breaker events programmatically:

```java
// CircuitBreakerEventListener.java
// Listen to circuit breaker state changes and publish metrics
package com.example.monitoring;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.circuitbreaker.event.CircuitBreakerOnStateTransitionEvent;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class CircuitBreakerEventListener {

    private final CircuitBreakerRegistry registry;
    private final AlertService alertService;

    public CircuitBreakerEventListener(
            CircuitBreakerRegistry registry,
            AlertService alertService) {
        this.registry = registry;
        this.alertService = alertService;
    }

    @PostConstruct
    public void registerEventListeners() {
        // Register listeners for all circuit breakers
        registry.getAllCircuitBreakers().forEach(this::registerListener);

        // Also listen for newly created circuit breakers
        registry.getEventPublisher()
            .onEntryAdded(event -> registerListener(event.getAddedEntry()));
    }

    private void registerListener(CircuitBreaker circuitBreaker) {
        circuitBreaker.getEventPublisher()
            // Listen for state transitions
            .onStateTransition(this::onStateTransition)
            // Listen for failures
            .onError(event -> log.warn(
                "Circuit breaker {} recorded error: {}",
                event.getCircuitBreakerName(),
                event.getThrowable().getMessage()
            ))
            // Listen for slow calls
            .onSlowCallRateExceeded(event -> log.warn(
                "Circuit breaker {} slow call rate exceeded: {}%",
                event.getCircuitBreakerName(),
                event.getSlowCallRate()
            ));
    }

    private void onStateTransition(CircuitBreakerOnStateTransitionEvent event) {
        String name = event.getCircuitBreakerName();
        CircuitBreaker.StateTransition transition = event.getStateTransition();

        log.info("Circuit breaker {} transitioned from {} to {}",
            name, transition.getFromState(), transition.getToState());

        // Alert the team when a circuit breaker opens
        if (transition.getToState() == CircuitBreaker.State.OPEN) {
            alertService.sendAlert(
                AlertLevel.WARNING,
                String.format("Circuit breaker %s has opened - service degraded", name)
            );
        }
    }
}
```

---

## Best Practices

### 1. Choose the Right Window Type

```yaml
# COUNT_BASED: Good for consistent traffic
slidingWindowType: COUNT_BASED
slidingWindowSize: 10

# TIME_BASED: Good for variable traffic
slidingWindowType: TIME_BASED
slidingWindowSize: 60  # seconds
```

### 2. Set Appropriate Thresholds

Start with conservative settings and tune based on real traffic:

```yaml
failureRateThreshold: 50      # Open at 50% failure rate
minimumNumberOfCalls: 10      # Need enough samples before deciding
waitDurationInOpenState: 30s  # Give the service time to recover
```

### 3. Always Provide Fallbacks

Never let circuit breaker exceptions bubble up to users:

```java
@CircuitBreaker(name = "userService", fallbackMethod = "getUserFallback")
public User getUser(String userId) {
    return userServiceClient.getUser(userId);
}

// Fallback returns cached or default data
private User getUserFallback(String userId, Exception ex) {
    return userCache.get(userId)
        .orElse(User.anonymous());
}
```

### 4. Monitor and Alert

Track circuit breaker state changes and set up alerts:

```java
// Publish metrics to your monitoring system
registry.getAllCircuitBreakers().forEach(cb -> {
    Gauge.builder("circuit_breaker_state", cb,
        circuitBreaker -> circuitBreaker.getState().getOrder())
        .tag("name", cb.getName())
        .register(meterRegistry);
});
```

---

## Testing Circuit Breakers

Write tests to verify your circuit breakers behave correctly:

```java
// CircuitBreakerTest.java
// Integration test for circuit breaker behavior
@SpringBootTest
class CircuitBreakerTest {

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    @Autowired
    private PaymentService paymentService;

    @Test
    void shouldOpenCircuitAfterFailures() {
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("paymentService");

        // Force the circuit open
        cb.transitionToOpenState();

        // Verify calls fail fast
        PaymentResponse response = paymentService.processPayment(new PaymentRequest());

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(cb.getState()).isEqualTo(CircuitBreaker.State.OPEN);
    }
}
```

---

## Conclusion

Circuit breakers are essential for building resilient microservices. Resilience4j provides a clean, annotation-based approach that integrates well with Spring Boot. Start with sensible defaults, monitor your circuit breakers in production, and tune thresholds based on real traffic patterns.

Key takeaways:
- Use circuit breakers to fail fast when downstream services are unhealthy
- Always provide fallback methods for graceful degradation
- Combine with retry and timeout for comprehensive resilience
- Monitor circuit breaker state and alert on state changes

---

*Building resilient applications requires more than just circuit breakers. [OneUptime](https://oneuptime.com) provides comprehensive monitoring and alerting to help you detect and respond to service degradation before it impacts your users.*

**Related Reading:**
- [How to Build a Fault-Tolerant Service with Graceful Degradation in Go](https://oneuptime.com/blog/post/2026-01-25-fault-tolerant-graceful-degradation-go/view)
- [How to Build Health Checks and Readiness Probes in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
