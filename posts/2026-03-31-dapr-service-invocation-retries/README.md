# How to Handle Retries in Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Retry, Resiliency, Service Invocation, Fault Tolerance

Description: Learn how to configure automatic retry policies for Dapr service invocation using resiliency policies with exponential backoff, jitter, and max attempt limits.

---

## Why Retries Matter in Distributed Systems

Transient network failures, service restarts, and overloaded targets are common in distributed systems. Without retries, a temporary glitch causes permanent request failure. Dapr's resiliency API lets you define retry policies declaratively without changing application code.

## Defining a Retry Policy

Create a resiliency resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: order-resiliency
  namespace: default
spec:
  policies:
    retries:
      retryThrice:
        policy: exponential
        maxRetries: 3
        maxInterval: 10s
        duration: 1s
      retryLinear:
        policy: constant
        maxRetries: 5
        duration: 2s

  targets:
    apps:
      order-service:
        retry: retryThrice
```

Apply it:

```bash
kubectl apply -f order-resiliency.yaml
```

## Retry Policy Options

| Parameter | Description | Example |
|-----------|-------------|---------|
| `policy` | `constant` or `exponential` | `exponential` |
| `maxRetries` | Maximum retry attempts | `3` |
| `duration` | Base delay between retries | `1s` |
| `maxInterval` | Cap for exponential delay | `30s` |

## Jitter and Matching Status Codes

Dapr automatically applies jitter to exponential backoff retries using a random multiplier between 0.5 and 1.5, so no explicit jitter configuration is needed. To control which errors trigger retries, use the `matching` block:

```yaml
retries:
  retryWithMatching:
    policy: exponential
    maxRetries: 5
    duration: 500ms
    maxInterval: 15s
    matching:
      httpStatusCodes: "500,502,503,504"
      gRPCStatusCodes: "8,14"
```

## Applying Retry to Self-Hosted Mode

Save the resiliency file and reference it with your config:

```yaml
# config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  features: []
```

```bash
dapr run --app-id client --config ./config.yaml --resources-path ./components -- node app.js
```

## Observing Retries in Logs

```bash
# Watch sidecar logs for retry attempts
kubectl logs <pod> -c daprd | grep -i retry
# Output: "Retrying request to order-service, attempt 2 of 3"
```

## Idempotency Requirements

Enable retries only for idempotent operations. For non-idempotent operations (like creating an order), implement idempotency keys in your service:

```javascript
app.post('/orders', async (req, res) => {
  const idempotencyKey = req.headers['x-idempotency-key'];
  if (await isDuplicate(idempotencyKey)) {
    return res.status(200).json({ status: 'already processed' });
  }
  // process order
});
```

## Summary

Configure Dapr service invocation retries using Resiliency resources with `constant` or `exponential` backoff policies. Apply policies to specific app targets without changing application code. Always implement idempotency in your service handlers when enabling retries on write operations.
