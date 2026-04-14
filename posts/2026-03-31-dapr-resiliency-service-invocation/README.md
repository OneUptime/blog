# How to Apply Resiliency Policies to Service Invocation in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Service Invocation, Retry, Circuit Breaker

Description: Learn how to apply Dapr resiliency policies specifically to service-to-service invocation calls, adding automatic retries and circuit breakers to microservice communication.

---

## Overview

Service invocation is one of the most common Dapr building blocks and one of the most critical places to apply resiliency policies. When service A calls service B via Dapr, network failures, temporary overload, or rolling deployments can cause transient errors. Resiliency policies on service invocation automatically handle these situations without any changes to application code.

## How Resiliency Applies to Service Invocation

Resiliency policies for service invocation are defined on the **caller's** `Resiliency` resource under `targets.apps`. The target app ID is the destination service's Dapr app ID.

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: checkout-resiliency
  namespace: default
spec:
  policies:
    timeouts:
      serviceTimeout: 5s
    retries:
      serviceRetry:
        policy: exponential
        initialInterval: 500ms
        multiplier: 2.0
        maxInterval: 10s
        maxRetries: 5
        randomizationFactor: 0.5
    circuitBreakers:
      serviceCB:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      payment-service:
        timeout: serviceTimeout
        retry: serviceRetry
        circuitBreaker: serviceCB
      inventory-service:
        timeout: serviceTimeout
        retry: serviceRetry
```

Apply this to the `checkout-service` deployment:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "checkout-service"
```

## Invoking Services with Resiliency Active

Your application code does not change. Call the service as usual:

```javascript
const { DaprClient, HttpMethod } = require('@dapr/dapr');
const client = new DaprClient();

async function processPayment(orderId, amount) {
  // Dapr automatically retries if payment-service returns 503
  const result = await client.invoker.invoke(
    'payment-service',
    'charge',
    HttpMethod.POST,
    { orderId, amount }
  );
  return result;
}
```

```python
import json
from dapr.clients import DaprClient

with DaprClient() as d:
    # Resiliency policy is applied transparently
    resp = d.invoke_method(
        'payment-service',
        'charge',
        data=json.dumps({"orderId": "123", "amount": 99.99}),
        content_type='application/json',
        http_verb='POST'
    )
```

## Behavior When the Circuit Opens

When the circuit breaker trips (after 5 consecutive failures), further calls to `payment-service` immediately return an error without attempting the network call. Your application code receives an error and should handle it:

```javascript
try {
  const result = await client.invoker.invoke('payment-service', 'charge', ...);
} catch (err) {
  if (err.message.includes('circuit breaker')) {
    // Fall back to async queue or return error to user
    await publishToQueue('pending-payments', { orderId, amount });
  }
}
```

## Testing the Resiliency Policy

Simulate a failing service with a mock that returns 503:

```bash
# Deploy a mock that always returns 503
kubectl apply -f failing-payment-mock.yaml

# Watch sidecar logs for retry attempts
kubectl logs deployment/checkout-service -c daprd -f \
  | grep -E "retry|circuit|resiliency"
```

## Resiliency Metrics

Monitor resiliency behavior via Prometheus metrics:

```bash
curl http://localhost:9090/metrics \
  | grep dapr_resiliency | grep payment-service
```

Key metrics:
- `dapr_resiliency_count{app_id="checkout-service",policy="retry"}` - total retry count
- `dapr_resiliency_count{app_id="checkout-service",policy="circuitbreaker"}` - circuit trips

## Summary

Applying Dapr resiliency policies to service invocation requires only a `Resiliency` resource on the calling service - no application code changes. Pairing timeout, retry, and circuit breaker policies on critical downstream services ensures your microservices degrade gracefully rather than failing with cascading errors.
