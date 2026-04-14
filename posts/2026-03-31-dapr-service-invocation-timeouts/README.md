# How to Configure Service Invocation Timeouts in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Timeout, Resiliency, Service Invocation, Microservice

Description: Learn how to set timeouts on Dapr service invocation calls using Resiliency policies to prevent calls from hanging indefinitely and protect your system from cascading failures.

---

## Why Timeouts Matter

Without timeouts, a slow or unresponsive downstream service can cause your entire request thread to hang, exhausting connection pools and cascading failures across your system. Dapr Resiliency policies let you define timeouts declaratively.

## Configuring Timeouts with Resiliency

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: app-resiliency
  namespace: default
spec:
  policies:
    timeouts:
      defaultTimeout: 5s
      paymentTimeout: 3s
      reportTimeout: 30s

  targets:
    apps:
      payment-service:
        timeout: paymentTimeout
      report-service:
        timeout: reportTimeout
      inventory-service:
        timeout: defaultTimeout
```

Apply it:

```bash
kubectl apply -f app-resiliency.yaml
```

## How Timeout Errors Appear

When a timeout is exceeded, the caller receives HTTP 500 Internal Server Error:

```bash
curl -v http://localhost:3500/v1.0/invoke/slow-service/method/compute
# HTTP/1.1 500 Internal Server Error
# {"errorCode":"ERR_DIRECT_INVOKE","message":"context deadline exceeded"}
```

## Handling Timeout Errors in Node.js

```javascript
async function invokeWithHandling(appId, method, data) {
  try {
    const res = await axios.post(
      `http://localhost:3500/v1.0/invoke/${appId}/method/${method}`,
      data
    );
    return res.data;
  } catch (err) {
    if (err.response?.status === 500 && err.response?.data?.message?.includes('deadline exceeded')) {
      console.error(`Timeout calling ${appId}/${method}`);
      // Return cached result or throw a typed error
      throw new TimeoutError(`${appId} did not respond in time`);
    }
    throw err;
  }
}
```

## Combining Timeouts with Retries

Be careful when combining timeouts and retries. The timeout applies per attempt:

```yaml
spec:
  policies:
    retries:
      retryThrice:
        policy: exponential
        maxRetries: 3
        duration: 500ms
    timeouts:
      shortTimeout: 2s

  targets:
    apps:
      payment-service:
        retry: retryThrice
        timeout: shortTimeout
```

Total time with 3 retries and 2s timeout per attempt: up to 8 seconds (4 total attempts) plus backoff delays.

## Self-Hosted Timeout Configuration

For self-hosted mode, place the resiliency file in the components directory:

```bash
# ./components/resiliency.yaml
dapr run --app-id myapp --resources-path ./components -- node app.js
```

## Component-Level Timeouts

For state store and pub/sub operations:

```yaml
targets:
  components:
    statestore:
      outbound:
        timeout: defaultTimeout
    pubsub:
      outbound:
        timeout: pubsubTimeout
```

## Summary

Configure Dapr service invocation timeouts using Resiliency policy `timeouts` definitions, then apply them to app targets. Timeout errors return HTTP 500 to the caller with a "context deadline exceeded" message. Set different timeout values for different services based on their expected latency profiles, and handle timeout errors with fallbacks or typed exceptions in your application code.
