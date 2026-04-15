# How to Implement Circuit Breaker with Consecutive Failures in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Circuit Breaker, Fault Tolerance, Microservice

Description: Learn how to configure a Dapr circuit breaker that opens after a threshold of consecutive failures, preventing cascading failures in microservice communication.

---

## Consecutive Failure Circuit Breaker

A circuit breaker trips open when a service experiences too many consecutive failures. Once open, requests fail immediately without hitting the failing service, giving it time to recover. After a configurable timeout, the circuit enters a half-open state and allows a test request through.

Dapr's resiliency API supports this natively through the `consecutiveFailures` trip condition.

## Resiliency Policy Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: order-service-resiliency
  namespace: default
spec:
  policies:
    circuitBreakers:
      # Circuit breaker that opens after 5 consecutive failures
      consecutiveFailureCB:
        maxRequests: 1          # How many requests allowed in half-open state
        interval: 0s            # Statistical window (0 = no rolling window)
        timeout: 30s            # How long circuit stays open before going half-open
        trip: consecutiveFailures >= 5  # Trip after 5 consecutive failures

  targets:
    apps:
      payment-service:
        circuitBreaker: consecutiveFailureCB
      inventory-service:
        circuitBreaker: consecutiveFailureCB
```

## Applying the Policy to Service Invocation

```yaml
spec:
  targets:
    apps:
      payment-service:
        circuitBreaker: consecutiveFailureCB
        retry: standardRetry
      inventory-service:
        circuitBreaker: consecutiveFailureCB
```

## Calling a Service with Circuit Breaker Protection

```javascript
const { DaprClient, HttpMethod } = require('@dapr/dapr');

const client = new DaprClient();

async function chargePayment(orderId, amount) {
  try {
    const response = await client.invoker.invoke(
      'payment-service',
      'charge',
      HttpMethod.POST,
      { orderId, amount }
    );
    return { success: true, transactionId: response.transactionId };
  } catch (err) {
    // Circuit is open - payment-service is unavailable
    if (err.message.includes('circuit breaker')) {
      console.warn('Payment service circuit breaker open, using fallback');
      return { success: false, reason: 'payment-service-unavailable', fallback: true };
    }
    throw err;
  }
}
```

## Combining with Retry Policy

Configure retry and circuit breaker together - each retry attempt is individually tracked by the circuit breaker:

```yaml
spec:
  policies:
    retries:
      standardRetry:
        policy: constant
        maxRetries: 3
        duration: 500ms

    circuitBreakers:
      consecutiveFailureCB:
        maxRequests: 1
        timeout: 30s
        trip: consecutiveFailures >= 5

  targets:
    apps:
      payment-service:
        retry: standardRetry
        circuitBreaker: consecutiveFailureCB
```

With this configuration, each failed request attempt (including retries) increments the circuit breaker's consecutive failure count. A single failing invocation with 3 retries produces 4 consecutive failures. The circuit trips once 5 consecutive failed attempts accumulate.

## Pub/Sub Circuit Breaker

Apply circuit breakers to pub/sub components as well:

```yaml
spec:
  targets:
    components:
      my-pubsub:
        outbound:
          circuitBreaker: consecutiveFailureCB
```

## Python Example: Handling Circuit Breaker State

```python
from dapr.clients import DaprClient
from dapr.clients.exceptions import DaprGrpcError

def invoke_with_circuit_breaker(app_id: str, method: str, data: dict) -> dict:
    try:
        with DaprClient() as client:
            response = client.invoke_method(
                app_id=app_id,
                method_name=method,
                data=data,
            )
            return response.json()
    except DaprGrpcError as e:
        if "circuit breaker" in str(e).lower():
            # Circuit is open - handle gracefully
            print(f"Circuit breaker open for {app_id}/{method}")
            return {"error": "service_unavailable", "circuit_open": True}
        raise
```

## Monitoring Circuit Breaker State

Check Dapr health and metrics for circuit breaker state:

```bash
# Dapr metrics endpoint (Prometheus format)
curl http://localhost:9090/metrics | grep circuit_breaker

# Example metrics
dapr_resiliency_cb_state{app_id="orders-service",name="consecutiveFailureCB",state="open"} 1
dapr_resiliency_cb_state{app_id="orders-service",name="consecutiveFailureCB",state="closed"} 0
```

## Summary

Dapr's consecutive failure circuit breaker uses the `trip: consecutiveFailures >= N` condition in a Resiliency policy. After N consecutive failures, the circuit opens and requests fail immediately for the configured `timeout` duration. The `maxRequests` parameter controls how many test requests are allowed through in the half-open state. Combine with a retry policy so transient errors are retried, keeping in mind that each individual attempt (including retries) counts toward the consecutive failure threshold.
