# How to Implement Retry with Exponential Backoff in Spring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Retry, Resilience4j, Fault Tolerance, Microservices

Description: Learn how to implement retry logic with exponential backoff in Spring Boot applications using Spring Retry and Resilience4j. This guide covers configuration, jitter, and best practices for resilient services.

---

Transient failures happen in distributed systems. Network blips, temporary service unavailability, or resource contention can cause requests to fail even when the underlying service is healthy. Retry logic with exponential backoff helps your application recover gracefully from these temporary issues without overwhelming downstream services.

This guide shows you how to implement retry patterns in Spring Boot using both Spring Retry and Resilience4j, with practical examples you can use in production.

---

## Why Exponential Backoff?

Simple immediate retries can make problems worse. If a service is struggling under load and every client immediately retries failed requests, you create a thundering herd that prevents recovery.

| Retry Strategy | Behavior | Problem |
|----------------|----------|---------|
| Immediate retry | Retry instantly after failure | Overloads struggling service |
| Fixed delay | Wait same duration between retries | Synchronized retry storms |
| Exponential backoff | Double wait time each retry | Gradually reduces pressure |
| Exponential + jitter | Add randomness to backoff | Desynchronizes client retries |

Exponential backoff with jitter is the standard approach for production systems because it reduces load on failing services and spreads out retry attempts from multiple clients.

---

## Setting Up Spring Retry

Spring Retry provides annotation-based retry support that integrates cleanly with Spring Boot applications.

Add the dependency to your `pom.xml`:

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Spring Retry for annotation-based retry support -->
    <dependency>
        <groupId>org.springframework.retry</groupId>
        <artifactId>spring-retry</artifactId>
    </dependency>

    <!-- AOP support required for @Retryable annotation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-aop</artifactId>
    </dependency>
</dependencies>
```

Enable retry in your configuration:

```java
// RetryConfig.java
// Enable Spring Retry annotation processing
package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;

@Configuration
@EnableRetry  // This enables @Retryable annotation processing
public class RetryConfig {
}
```

---

## Basic Retry with Exponential Backoff

The `@Retryable` annotation makes it simple to add retry logic to any method. The `@Backoff` annotation configures exponential backoff behavior.

```java
// PaymentService.java
// Service that calls external payment API with retry protection
package com.example.service;

import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class PaymentService {

    private final RestTemplate restTemplate;

    public PaymentService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // Retry up to 4 times with exponential backoff
    // Initial delay: 1000ms, then 2000ms, 4000ms, 8000ms
    @Retryable(
        retryFor = {RestClientException.class},  // Only retry these exceptions
        maxAttempts = 4,
        backoff = @Backoff(
            delay = 1000,      // Initial delay in milliseconds
            multiplier = 2,    // Double the delay each retry
            maxDelay = 10000   // Cap delay at 10 seconds
        )
    )
    public PaymentResponse processPayment(PaymentRequest request) {
        log.info("Attempting payment for order: {}", request.getOrderId());

        return restTemplate.postForObject(
            "https://payment-api.example.com/process",
            request,
            PaymentResponse.class
        );
    }

    // Recovery method called after all retries are exhausted
    // Must have the same return type as the retryable method
    @Recover
    public PaymentResponse recoverPayment(RestClientException ex, PaymentRequest request) {
        log.warn("Payment failed after retries for order: {}. Error: {}",
            request.getOrderId(), ex.getMessage());

        // Return a response indicating the payment needs manual processing
        return PaymentResponse.builder()
            .orderId(request.getOrderId())
            .status(PaymentStatus.PENDING_MANUAL_REVIEW)
            .message("Payment temporarily unavailable, queued for processing")
            .build();
    }
}
```

---

## Adding Jitter to Prevent Thundering Herds

Jitter adds randomness to backoff delays. Without jitter, multiple clients that fail at the same time will retry at the same time, creating synchronized spikes.

```java
// JitterBackoffPolicy.java
// Custom backoff policy that adds randomness to exponential delays
package com.example.retry;

import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.backoff.Sleeper;

import java.util.Random;

public class JitterBackoffPolicy extends ExponentialBackOffPolicy {

    private final Random random = new Random();
    private final double jitterFactor;  // 0.0 to 1.0

    public JitterBackoffPolicy(double jitterFactor) {
        this.jitterFactor = jitterFactor;
    }

    @Override
    protected long getSleepAndIncrement() {
        long baseDelay = super.getSleepAndIncrement();

        // Add jitter: randomly reduce delay by up to jitterFactor percent
        // For example, with jitterFactor=0.25 and baseDelay=1000ms,
        // actual delay will be between 750ms and 1000ms
        double jitter = baseDelay * jitterFactor * random.nextDouble();
        return (long) (baseDelay - jitter);
    }
}
```

Configure the custom backoff policy in your retry template:

```java
// RetryTemplateConfig.java
// Configure a RetryTemplate with exponential backoff and jitter
package com.example.config;

import com.example.retry.JitterBackoffPolicy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.support.RetryTemplate;

@Configuration
public class RetryTemplateConfig {

    @Bean
    public RetryTemplate retryTemplate() {
        // Create custom backoff policy with 25% jitter
        JitterBackoffPolicy backoffPolicy = new JitterBackoffPolicy(0.25);
        backoffPolicy.setInitialInterval(1000);  // Start with 1 second
        backoffPolicy.setMultiplier(2.0);        // Double each time
        backoffPolicy.setMaxInterval(30000);     // Cap at 30 seconds

        // Build the retry template
        return RetryTemplate.builder()
            .maxAttempts(5)
            .customBackoff(backoffPolicy)
            .retryOn(Exception.class)
            .build();
    }
}
```

---

## Retry with Resilience4j

Resilience4j offers more advanced retry features including support for reactive applications and better integration with metrics.

Add the dependency:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
    <version>2.2.0</version>
</dependency>
```

Configure retry instances in `application.yml`:

```yaml
# application.yml
resilience4j:
  retry:
    instances:
      # Retry configuration for external API calls
      externalApi:
        maxAttempts: 4
        waitDuration: 1s                  # Initial wait
        enableExponentialBackoff: true
        exponentialBackoffMultiplier: 2   # Double each retry
        exponentialMaxWaitDuration: 30s   # Cap at 30 seconds
        enableRandomizedWait: true        # Add jitter
        randomizedWaitFactor: 0.5         # Up to 50% randomization
        retryExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
          - org.springframework.web.client.ResourceAccessException
        ignoreExceptions:
          - com.example.exception.BusinessValidationException

      # Different configuration for database operations
      database:
        maxAttempts: 3
        waitDuration: 500ms
        enableExponentialBackoff: true
        exponentialBackoffMultiplier: 2
        retryExceptions:
          - org.springframework.dao.TransientDataAccessException
          - java.sql.SQLTransientException
```

---

## Using Resilience4j Retry Annotation

Apply retry protection using the `@Retry` annotation:

```java
// InventoryService.java
// Service with Resilience4j retry protection
package com.example.service;

import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.stereotype.Service;

@Service
public class InventoryService {

    private final InventoryClient inventoryClient;

    public InventoryService(InventoryClient inventoryClient) {
        this.inventoryClient = inventoryClient;
    }

    // Apply the 'externalApi' retry configuration
    @Retry(name = "externalApi", fallbackMethod = "getInventoryFallback")
    public InventoryResponse checkInventory(String productId) {
        log.info("Checking inventory for product: {}", productId);
        return inventoryClient.getInventory(productId);
    }

    // Fallback method after all retries fail
    // Exception parameter is optional but useful for logging
    private InventoryResponse getInventoryFallback(String productId, Exception ex) {
        log.warn("Inventory check failed for product {}: {}", productId, ex.getMessage());

        // Return cached data or default response
        return InventoryResponse.builder()
            .productId(productId)
            .available(false)
            .message("Inventory service temporarily unavailable")
            .build();
    }
}
```

---

## Programmatic Retry with RetryRegistry

For more control over retry behavior, use the registry programmatically:

```java
// ResilientApiClient.java
// Programmatic retry usage with Resilience4j
package com.example.client;

import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import org.springframework.stereotype.Component;

import java.util.function.Supplier;

@Component
public class ResilientApiClient {

    private final Retry retry;
    private final RestTemplate restTemplate;

    public ResilientApiClient(RetryRegistry retryRegistry, RestTemplate restTemplate) {
        // Get retry instance from registry (configured in application.yml)
        this.retry = retryRegistry.retry("externalApi");
        this.restTemplate = restTemplate;

        // Register event listeners for monitoring
        this.retry.getEventPublisher()
            .onRetry(event -> log.info(
                "Retry attempt {} for {}: {}",
                event.getNumberOfRetryAttempts(),
                event.getName(),
                event.getLastThrowable().getMessage()
            ))
            .onSuccess(event -> log.info(
                "Call succeeded after {} retries",
                event.getNumberOfRetryAttempts()
            ))
            .onError(event -> log.error(
                "Call failed after {} retries: {}",
                event.getNumberOfRetryAttempts(),
                event.getLastThrowable().getMessage()
            ));
    }

    public <T> T executeWithRetry(Supplier<T> supplier) {
        // Wrap the supplier with retry logic
        Supplier<T> decoratedSupplier = Retry.decorateSupplier(retry, supplier);
        return decoratedSupplier.get();
    }

    public ApiResponse callApi(String endpoint) {
        return executeWithRetry(() ->
            restTemplate.getForObject(endpoint, ApiResponse.class)
        );
    }
}
```

---

## Selective Retry Based on Exception Type

Not all exceptions should be retried. Retrying a validation error wastes resources since it will fail the same way every time.

```java
// SmartRetryService.java
// Retry only transient failures, not business logic errors
package com.example.service;

import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeoutException;

@Service
public class SmartRetryService {

    private final Retry retry;

    public SmartRetryService() {
        // Build custom retry configuration
        RetryConfig config = RetryConfig.custom()
            .maxAttempts(3)
            .waitDuration(Duration.ofMillis(500))
            .exponentialBackoffMultiplier(2)
            // Only retry these specific transient failures
            .retryExceptions(
                IOException.class,
                TimeoutException.class,
                TransientException.class
            )
            // Never retry these - they indicate bugs or validation errors
            .ignoreExceptions(
                ValidationException.class,
                AuthorizationException.class,
                ResourceNotFoundException.class
            )
            // Custom predicate for more complex retry decisions
            .retryOnResult(response -> {
                if (response instanceof ApiResponse) {
                    // Retry if server returned a retryable status
                    int status = ((ApiResponse) response).getStatusCode();
                    return status == 503 || status == 429;
                }
                return false;
            })
            .build();

        this.retry = Retry.of("smartRetry", config);
    }

    public ApiResponse callWithSmartRetry(Supplier<ApiResponse> operation) {
        return Retry.decorateSupplier(retry, operation).get();
    }
}
```

---

## Combining Retry with Circuit Breaker

Retry and circuit breaker patterns complement each other. Retry handles transient failures, while circuit breaker prevents repeated calls to a service that is definitely down.

```java
// ResilientOrderService.java
// Combining retry with circuit breaker for comprehensive fault tolerance
package com.example.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.stereotype.Service;

@Service
public class ResilientOrderService {

    private final OrderClient orderClient;

    public ResilientOrderService(OrderClient orderClient) {
        this.orderClient = orderClient;
    }

    // Order of execution: Retry wraps CircuitBreaker
    // First, Retry attempts the call
    // If CircuitBreaker is open, Retry sees an exception and may retry
    // But when circuit is open, retries fail fast
    @Retry(name = "orderService")
    @CircuitBreaker(name = "orderService", fallbackMethod = "getOrderFallback")
    public Order getOrder(String orderId) {
        return orderClient.getOrder(orderId);
    }

    private Order getOrderFallback(String orderId, Exception ex) {
        log.warn("Order service unavailable for order {}: {}", orderId, ex.getMessage());

        // Return cached order or placeholder
        return orderCache.get(orderId)
            .orElse(Order.placeholder(orderId));
    }
}
```

Configure both in `application.yml`:

```yaml
# application.yml
resilience4j:
  retry:
    instances:
      orderService:
        maxAttempts: 3
        waitDuration: 500ms
        enableExponentialBackoff: true
        exponentialBackoffMultiplier: 2

  circuitbreaker:
    instances:
      orderService:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 30s
        permittedNumberOfCallsInHalfOpenState: 3
```

---

## Monitoring Retry Metrics

Track retry behavior to understand system health and tune configurations:

```java
// RetryMetricsConfig.java
// Register retry metrics with Micrometer for monitoring
package com.example.config;

import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class RetryMetricsConfig {

    private final RetryRegistry retryRegistry;
    private final MeterRegistry meterRegistry;

    public RetryMetricsConfig(RetryRegistry retryRegistry, MeterRegistry meterRegistry) {
        this.retryRegistry = retryRegistry;
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void registerMetrics() {
        retryRegistry.getAllRetries().forEach(this::registerRetryMetrics);
    }

    private void registerRetryMetrics(Retry retry) {
        Retry.Metrics metrics = retry.getMetrics();

        // Track successful calls without retry
        meterRegistry.gauge(
            "retry_calls_without_retry",
            retry,
            r -> r.getMetrics().getNumberOfSuccessfulCallsWithoutRetryAttempt()
        );

        // Track calls that succeeded after retry
        meterRegistry.gauge(
            "retry_calls_with_retry",
            retry,
            r -> r.getMetrics().getNumberOfSuccessfulCallsWithRetryAttempt()
        );

        // Track failed calls that exhausted all retries
        meterRegistry.gauge(
            "retry_calls_failed",
            retry,
            r -> r.getMetrics().getNumberOfFailedCallsWithRetryAttempt()
        );
    }
}
```

---

## Best Practices

1. **Retry only transient failures** - Do not retry validation errors or authorization failures
2. **Use exponential backoff** - Prevents overwhelming recovering services
3. **Add jitter** - Prevents synchronized retry storms from multiple clients
4. **Set maximum attempts** - Avoid infinite retry loops
5. **Cap maximum delay** - Prevent excessively long waits
6. **Combine with circuit breaker** - Fail fast when services are definitely down
7. **Monitor retry metrics** - High retry rates indicate underlying problems

---

## Conclusion

Retry with exponential backoff is essential for building resilient Spring Boot applications. Spring Retry provides simple annotation-based retries, while Resilience4j offers more advanced features and better metrics integration. Start with conservative retry limits and tune based on your specific traffic patterns and SLAs.

---

*Building resilient applications requires more than just retry logic. [OneUptime](https://oneuptime.com) provides comprehensive monitoring to help you detect when retry rates spike and investigate the root cause.*

**Related Reading:**
- [How to Implement Circuit Breakers with Resilience4j in Spring](https://oneuptime.com/blog/post/2026-01-25-circuit-breakers-resilience4j-spring/view)
- [How to Implement Retry Logic with Exponential Backoff in Node.js](https://oneuptime.com/blog/post/2026-01-06-nodejs-retry-exponential-backoff/view)
