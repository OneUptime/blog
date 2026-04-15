# How to Configure Concurrency and Rate Limiting in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Concurrency, Rate Limiting, Performance, Sidecar

Description: Learn how to configure Dapr sidecar concurrency and rate limiting to protect your services from being overwhelmed under high load.

---

## Overview

Dapr provides built-in controls for limiting how many concurrent requests and how many requests per second a service handles. These settings protect your application from sudden traffic spikes and ensure predictable resource usage.

## App Max Concurrency

The `--app-max-concurrency` flag limits the number of simultaneous requests forwarded to your application. When this limit is reached, Dapr queues additional requests until a slot becomes available.

Set it via the Dapr CLI:

```bash
dapr run --app-id myservice --app-port 8080 --app-max-concurrency 10 -- python app.py
```

Or via Kubernetes annotations:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myservice"
  dapr.io/app-port: "8080"
  dapr.io/app-max-concurrency: "10"
```

## HTTP Rate Limiting with Middleware

Dapr supports rate limiting via the middleware pipeline. Define a rate-limit middleware component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimit
  namespace: default
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
  - name: maxRequestsPerSecond
    value: "100"
```

Apply the middleware via a Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: ratelimit
      type: middleware.http.ratelimit
```

Reference the configuration from your pod:

```yaml
annotations:
  dapr.io/config: "appconfig"
```

## Combining Concurrency and Rate Limiting

Use both controls together for layered protection:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "payment-service"
  dapr.io/app-max-concurrency: "20"
  dapr.io/config: "appconfig"
```

The rate limiter applies at the sidecar level before requests reach the app, while `app-max-concurrency` limits in-flight requests to the app process itself.

## Testing the Limits

Use a load testing tool to verify the limits are applied:

```bash
# Install hey
brew install hey

# Send 200 requests with 50 concurrent workers
hey -n 200 -c 50 http://localhost:3500/v1.0/invoke/myservice/method/process
```

Check for 429 responses indicating rate limiting is active:

```bash
hey -n 500 -c 100 http://localhost:3500/v1.0/invoke/myservice/method/process 2>&1 | grep "Status code"
```

## Monitoring Rate Limit Events

Dapr exposes Prometheus metrics for rate limiting. Check the `dapr_http_server_request_count` metric with the `status=429` label to see how often limits are triggered:

```bash
kubectl port-forward <your-app-pod> 9090:9090
# Then query: dapr_http_server_request_count{status="429"}
```

## Summary

Dapr's `app-max-concurrency` setting and the HTTP rate-limit middleware give you two complementary layers of traffic control. Configure both via annotations and a Configuration resource to protect microservices from overload without modifying application code.
