# How to Handle Cascading Failures with Dapr Resiliency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Cascading Failure, Circuit Breaker, Fault Tolerance

Description: Learn how to use Dapr resiliency policies, circuit breakers, and timeouts to prevent cascading failures from spreading across your microservices architecture.

---

## Overview

A cascading failure occurs when one service's failure causes dependent services to fail, which then cause their dependents to fail, collapsing large portions of the system. Dapr resiliency policies - especially circuit breakers and timeouts - are your primary tools for containing failures and preventing them from spreading.

## How Cascading Failures Happen

Consider a payment flow: Checkout - Payment - Bank API. If the Bank API slows down:

1. Payment service calls back slowly, holding threads
2. Checkout service waits for payment, exhausting its connection pool
3. User-facing API waits for checkout, becoming unresponsive
4. All services fail even though only the Bank API was originally slow

## Preventing Cascading Failures with Timeouts

Timeouts limit how long a service waits, preventing thread exhaustion:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: cascade-prevention
  namespace: default
spec:
  policies:
    timeouts:
      bankApiTimeout: 2s
      paymentTimeout: 3s
      checkoutTimeout: 5s
  targets:
    apps:
      bank-api-proxy:
        timeout: bankApiTimeout
      payment-service:
        timeout: paymentTimeout
```

With these timeouts, the checkout service gives up on payment after 3 seconds instead of waiting indefinitely.

## Circuit Breakers Stop the Cascade

Circuit breakers prevent calls to already-failing services from being attempted at all:

```yaml
policies:
  circuitBreakers:
    bankApiCB:
      maxRequests: 1
      interval: 10s
      timeout: 30s
      trip: consecutiveFailures >= 3
    paymentCB:
      maxRequests: 1
      interval: 10s
      timeout: 30s
      trip: consecutiveFailures >= 5

targets:
  apps:
    bank-api-proxy:
      timeout: bankApiTimeout
      circuitBreaker: bankApiCB
    payment-service:
      timeout: paymentTimeout
      circuitBreaker: paymentCB
```

When the Bank API circuit opens, payment-service calls fail fast. When payment-service circuit opens, checkout calls fail fast. The failure is contained.

## Fallback Strategies

When a circuit is open, your application should fall back gracefully:

```javascript
async function processPayment(orderId, amount) {
  try {
    return await daprClient.invoker.invoke(
      'payment-service', 'charge', HttpMethod.POST, { orderId, amount }
    );
  } catch (err) {
    if (isCircuitOpenError(err)) {
      // Queue for async processing when payment recovers
      await daprClient.pubsub.publish('orders-pubsub', 'pending-payments', {
        orderId, amount, reason: 'payment_service_unavailable'
      });
      return { status: 'queued', message: 'Payment will be processed shortly' };
    }
    throw err;
  }
}
```

## Bulkhead Pattern to Isolate Failures

Use separate connection pools (bulkheads) to prevent one failure domain from exhausting resources for another:

```yaml
# Separate resiliency policies for critical vs non-critical paths
targets:
  apps:
    payment-service:
      timeout: bankApiTimeout
      retry: criticalRetry
      circuitBreaker: bankApiCB
    analytics-service:
      timeout: analyticsTimeout
      # Analytics failures do not trigger same circuit as payment
```

## Monitoring for Cascade Risk

Monitor these metrics to detect early signs of cascading failure:

```bash
# High rate of circuit breaker trips
curl http://localhost:9090/metrics \
  | grep "dapr_resiliency_count.*circuitbreaker"

# Rising response times
curl http://localhost:9090/metrics \
  | grep "dapr_http_client_roundtrip_latency"

# Alert when circuit breaker opens
kubectl logs deployment/checkout -c daprd \
  | grep "circuit breaker.*open"
```

## Summary

Preventing cascading failures in Dapr requires short timeouts to prevent thread exhaustion, circuit breakers to stop calling failing services, and application-level fallbacks that degrade gracefully. Applied at each layer of the call chain, these resiliency policies contain failures at their source and prevent them from collapsing unrelated parts of your system.
