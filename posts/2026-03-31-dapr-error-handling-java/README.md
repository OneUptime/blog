# How to Handle Errors in Dapr Java SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Error Handling, Java, Retry, Resilience

Description: Learn how to handle errors, timeouts, and retries in Dapr Java SDK applications for building resilient distributed microservices.

---

## Introduction

Distributed systems fail in unexpected ways. The Dapr Java SDK surfaces errors as exceptions that you can catch and handle with retries, fallbacks, and circuit-breaker patterns. Understanding common error types helps you build resilient services.

## Common Error Types

The Dapr Java SDK throws `DaprException` for runtime errors:

```java
import io.dapr.exceptions.DaprException;

try {
    Order order = daprClient.getState("statestore", "missing-key", Order.class)
        .block()
        .getValue();
} catch (DaprException e) {
    System.err.println("Error code: " + e.getErrorCode());
    System.err.println("Message: " + e.getMessage());
    System.err.println("HTTP status code: " + e.getHttpStatusCode());
}
```

## Handling State Store Errors

```java
public Optional<Order> getOrderSafely(String orderId) {
    try {
        State<Order> state = daprClient
            .getState("statestore", orderId, Order.class)
            .block();

        return Optional.ofNullable(state.getValue());
    } catch (DaprException e) {
        if (e.getErrorCode().equals("ERR_STATE_STORE_NOT_FOUND")) {
            System.err.println("State store not configured: " + e.getMessage());
        } else if (e.getErrorCode().equals("ERR_STATE_GET")) {
            System.err.println("Failed to get state: " + e.getMessage());
        }
        return Optional.empty();
    }
}
```

## Retry with Reactor

Use Reactor's `retryWhen` for automatic retries on transient failures:

```java
import reactor.util.retry.Retry;
import java.time.Duration;

public Order getOrderWithRetry(String orderId) {
    return daprClient.getState("statestore", orderId, Order.class)
        .retryWhen(Retry.backoff(3, Duration.ofMillis(200))
            .filter(throwable -> throwable instanceof DaprException)
            .onRetryExhaustedThrow((spec, signal) ->
                new RuntimeException("Failed after retries", signal.failure()))
        )
        .block()
        .getValue();
}
```

## Timeout Handling

Apply timeouts to Dapr calls to avoid hanging indefinitely:

```java
import java.time.Duration;

public Order getOrderWithTimeout(String orderId) {
    return daprClient.getState("statestore", orderId, Order.class)
        .timeout(Duration.ofSeconds(5))
        .onErrorReturn(java.util.concurrent.TimeoutException.class,
            new State<>(orderId, null, null, null))
        .block()
        .getValue();
}
```

## Fallback with onErrorReturn

Return a default value when the Dapr call fails:

```java
public String getConfigWithFallback(String key) {
    return daprClient.getConfiguration("configstore", key)
        .map(items -> items.get(key).getValue())
        .onErrorReturn("default-value")
        .block();
}
```

## Configuring Dapr Resilience Policies

Define retry and circuit-breaker policies in Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: my-resiliency
spec:
  policies:
    retries:
      default-retry:
        policy: constant
        duration: 500ms
        maxRetries: 3
    circuitBreakers:
      default-cb:
        maxRequests: 1
        interval: 10s
        timeout: 30s
  targets:
    components:
      statestore:
        outbound:
          retry: default-retry
          circuitBreaker: default-cb
```

## Summary

Handling errors in the Dapr Java SDK involves catching `DaprException`, applying Reactor retry operators for transient failures, and configuring Dapr resilience policies for infrastructure-level retries and circuit breaking. Combining application-level error handling with Dapr's built-in resilience policies produces robust, fault-tolerant microservices.
