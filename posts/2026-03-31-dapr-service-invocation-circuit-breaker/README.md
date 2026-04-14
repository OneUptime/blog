# How to Use Dapr Service Invocation with Circuit Breakers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Circuit Breaker, Resiliency, Service Invocation, Fault Tolerance

Description: Learn how to configure circuit breakers for Dapr service invocation to automatically stop calling failing services and allow them time to recover.

---

## What Is a Circuit Breaker?

A circuit breaker monitors the health of service calls. When failures exceed a threshold, it "opens" the circuit and fails fast without calling the downstream service - protecting it from being overwhelmed and giving it time to recover.

Dapr implements circuit breakers as part of its Resiliency API.

## Circuit Breaker States

- **Closed** - requests flow normally
- **Open** - requests fail immediately without reaching the service
- **Half-open** - a probe request tests if the service has recovered

## Configuring a Circuit Breaker

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: payment-resiliency
  namespace: default
spec:
  policies:
    circuitBreakers:
      paymentCB:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 5

  targets:
    apps:
      payment-service:
        circuitBreaker: paymentCB
```

Apply it:

```bash
kubectl apply -f payment-resiliency.yaml
```

## Circuit Breaker Parameters

| Parameter | Description |
|-----------|-------------|
| `maxRequests` | Requests allowed when half-open |
| `interval` | Reset interval for counters |
| `timeout` | Duration circuit stays open |
| `trip` | Expression to trigger opening |

## Combining Circuit Breakers with Retries

```yaml
spec:
  policies:
    retries:
      retryThrice:
        policy: exponential
        maxRetries: 3
        duration: 500ms
    circuitBreakers:
      orderCB:
        maxRequests: 2
        timeout: 60s
        trip: consecutiveFailures >= 10
  targets:
    apps:
      order-service:
        retry: retryThrice
        circuitBreaker: orderCB
```

When a circuit is open, retries are not attempted - the failure is returned immediately.

## Handling Circuit Breaker Errors in Code

```javascript
try {
  const res = await axios.post(
    'http://localhost:3500/v1.0/invoke/payment-service/method/charge',
    payload
  );
} catch (err) {
  if (err.response?.status === 500) {
    // Circuit is open - implement fallback
    console.log('Payment service unavailable, queuing for later');
    await enqueueForRetry(payload);
  }
}
```

## Monitoring Circuit Breaker State

```bash
# Check Dapr metrics for circuit breaker state
curl http://localhost:9090/metrics | grep dapr_resiliency_cb
```

## Summary

Dapr circuit breakers stop cascading failures by automatically opening when a service exceeds a failure threshold. Configure them in a Resiliency resource with `trip` conditions, `timeout` for recovery waiting period, and `maxRequests` for half-open probing. Implement fallback logic in your application to handle the error response when a circuit is open.
