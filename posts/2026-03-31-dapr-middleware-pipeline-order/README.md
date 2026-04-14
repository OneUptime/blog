# How to Configure Middleware Pipeline Order in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Pipeline, Configuration, HTTP

Description: Learn how to control the execution order of middleware components in Dapr's HTTP pipeline and understand request and response flow through chained handlers.

---

## Understanding Dapr's Middleware Pipeline

Dapr processes HTTP requests through a pipeline of middleware handlers defined in a `Configuration` resource. The order of handlers in the `httpPipeline.handlers` array determines the execution sequence. Middleware components execute in list order for requests, and in reverse order for responses - similar to an onion model.

For example, given handlers `[A, B, C]`:
- Request path: A -> B -> C -> app
- Response path: app -> C -> B -> A

This ordering matters significantly when components depend on each other, such as authentication before rate limiting, or policy validation before request processing.

## Defining Pipeline Order

Configure the pipeline order in the `Configuration` resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: ordered-pipeline
  namespace: default
spec:
  httpPipeline:
    handlers:
      - name: bearer-auth
        type: middleware.http.bearer
      - name: rate-limiter
        type: middleware.http.ratelimit
      - name: response-transform
        type: middleware.http.uppercase
```

In this configuration, every request is first authenticated, then rate-checked, and finally processed by the response transformation handler.

## Component Definitions for Each Handler

Define each component separately:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bearer-auth
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
    - name: jwksURL
      value: "https://auth.example.com/.well-known/jwks.json"
    - name: audience
      value: "https://api.example.com"
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rate-limiter
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
    - name: maxRequestsPerSecond
      value: "100"
```

Apply both:

```bash
kubectl apply -f components/
kubectl apply -f config/ordered-pipeline.yaml
```

## Why Order Matters: Auth Before Rate Limiting

Placing authentication before rate limiting ensures that unauthenticated requests are rejected early without consuming rate limit quota. If order were reversed, unauthenticated requests would burn through rate limits before being blocked.

For request validation, placing an Open Policy Agent (OPA) middleware first ensures that all requests are validated against your policies before authentication or rate limiting:

```yaml
spec:
  httpPipeline:
    handlers:
      - name: request-validator
        type: middleware.http.opa
      - name: bearer-auth
        type: middleware.http.bearer
      - name: rate-limiter
        type: middleware.http.ratelimit
```

Note: Distributed tracing in Dapr is configured via the `spec.tracing` section of the Configuration resource, not as a middleware handler.

## Reordering Without Downtime

Dapr requires a sidecar restart to pick up Configuration changes. You can achieve this with minimal downtime using a rolling restart:

```bash
kubectl apply -f updated-pipeline-config.yaml
kubectl rollout restart deployment/myapp
```

Verify the new order is active:

```bash
kubectl exec -it myapp-pod -c daprd -- \
  wget -qO- http://localhost:3500/v1.0/metadata | jq .
```

## Testing Pipeline Order Locally

Use `dapr run` with a local config file to test order changes:

```bash
dapr run --app-id myapp \
  --config ./config/ordered-pipeline.yaml \
  -- ./myapp
```

Send a test request and observe logs to confirm handler execution order:

```bash
curl -H "Authorization: Bearer mytoken" \
  http://localhost:3500/v1.0/invoke/myapp/method/hello
```

## Summary

Dapr middleware pipeline order is controlled by the position of handlers in the `httpPipeline.handlers` array. Requests flow in list order and responses flow in reverse. Always place authentication first, then rate limiting, then transformation middleware. Update order by editing the `Configuration` resource and rolling out a pod restart.
