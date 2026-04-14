# How to Handle Transient Errors with Dapr Retry Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Retry, Microservice, Error Handling

Description: Learn how to configure Dapr retry policies to automatically handle transient errors in service invocation and pub/sub message delivery.

---

## What Are Transient Errors

Transient errors are temporary failures caused by network blips, downstream service restarts, or short-lived resource contention. Unlike permanent errors, retrying after a brief delay usually succeeds. Dapr's resiliency API handles retries declaratively, removing boilerplate retry logic from application code.

## Configuring a Resiliency Policy

Define retry behavior in a Dapr `Resiliency` resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: order-service-resiliency
  namespace: orders
spec:
  policies:
    retries:
      retryTransient:
        policy: exponential
        maxInterval: 30s
        maxRetries: 5
        matching:
          httpStatusCodes: "408,429,500,502,503,504"
          gRPCStatusCodes: "4,14"
    timeouts:
      generalTimeout: 10s
  targets:
    apps:
      payment-service:
        timeout: generalTimeout
        retry: retryTransient
    components:
      orders-pubsub:
        outbound:
          retry: retryTransient
```

## Applying Resiliency to Service Invocation

When calling the payment service, Dapr applies the retry policy automatically. No changes are needed in your application code:

```python
from dapr.clients import DaprClient
import json

def charge_customer(order_id: str, amount: float):
    with DaprClient() as client:
        # Dapr retries on 503/timeout automatically
        response = client.invoke_method(
            app_id="payment-service",
            method_name="charge",
            data=json.dumps({"orderId": order_id, "amount": amount}),
            content_type="application/json"
        )
        return json.loads(response.data)
```

## Retry Policy Types

Dapr supports two retry policy shapes:

```yaml
policies:
  retries:
    constantRetry:
      policy: constant
      duration: 2s
      maxRetries: 3

    exponentialRetry:
      policy: exponential
      maxInterval: 60s
      maxRetries: 10
```

Use `constant` for predictable retry windows (e.g., database reconnects). Use `exponential` for cascading service failures where progressive backoff reduces load on recovering services.

## Testing Retry Behavior

Use Dapr's built-in fault injection to verify retry logic:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: test-faults
spec:
  policies:
    circuitBreakers:
      cb:
        maxRequests: 1
        timeout: 5s
        trip: consecutiveFailures >= 3
  targets:
    apps:
      payment-service:
        circuitBreaker: cb
```

Simulate failures by returning 503 from a test double and observe retry spans in your tracing backend:

```bash
dapr logs --app-id order-service --kubernetes | grep "retry"
```

## Circuit Breaker Integration

Combine retries with a circuit breaker to prevent retry storms:

```yaml
spec:
  policies:
    retries:
      retryTransient:
        policy: exponential
        maxRetries: 5
    circuitBreakers:
      paymentCB:
        maxRequests: 1
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      payment-service:
        retry: retryTransient
        circuitBreaker: paymentCB
```

## Summary

Dapr resiliency policies let you define exponential and constant retry strategies declaratively, targeting specific services and components without changing application code. Combining retries with circuit breakers prevents thundering herd problems when a downstream service recovers. Always scope retry policies to error codes that indicate transient conditions to avoid masking permanent failures.
