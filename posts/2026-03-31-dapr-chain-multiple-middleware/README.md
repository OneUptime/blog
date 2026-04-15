# How to Chain Multiple Middleware Components in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Pipeline, Chain, Configuration

Description: Learn how to chain multiple Dapr HTTP middleware components in a pipeline configuration to build a layered request processing stack for your services.

---

## Introduction

Dapr middleware components are applied in the order they are listed in the `httpPipeline` configuration. Chaining multiple components creates a layered processing stack where each middleware can inspect, modify, or reject requests before passing them to the next component and ultimately to your application.

## Pipeline Execution Order

```text
Client Request
     |
     v
[RouterChecker] -- reject invalid paths --> 403
     |
     v
[Rate Limiter] -- reject excess requests --> 429
     |
     v
[OAuth2 Bearer Auth] -- reject unauthenticated --> 401
     |
     v
[OPA Policy Check] -- reject unauthorized --> 403
     |
     v
[Your Application]
     |
     v
Client Response
```

## Component Definitions

```yaml
# components/routerchecker.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: routerchecker
spec:
  type: middleware.http.routerchecker
  version: v1
  metadata:
    - name: rule
      value: "^/(api|health)(/.*)?"
```

```yaml
# components/ratelimit.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimit
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
    - name: maxRequestsPerSecond
      value: "50"
```

```yaml
# components/bearerauth.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bearerauth
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
    - name: issuer
      value: "https://accounts.google.com"
    - name: audience
      value: "your-client-id"
```

```yaml
# components/opa.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: opa-policy
spec:
  type: middleware.http.opa
  version: v1
  metadata:
    - name: includedHeaders
      value: "x-role"
    - name: rego
      value: |
        package http.authz
        default allow = false
        allow { input.request.method == "GET" }
        allow {
          input.request.method == "POST"
          input.request.headers["x-role"] == "writer"
        }
```

## Full Pipeline Configuration

```yaml
# config/full-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: full-pipeline
spec:
  httpPipeline:
    handlers:
      - name: routerchecker
        type: middleware.http.routerchecker
      - name: ratelimit
        type: middleware.http.ratelimit
      - name: bearerauth
        type: middleware.http.bearer
      - name: opa-policy
        type: middleware.http.opa
```

## Running the App

```bash
dapr run \
  --app-id secure-api \
  --app-port 8080 \
  --config ./config/full-pipeline.yaml \
  --resources-path ./components \
  -- python api.py
```

## Testing the Pipeline

```bash
# Test 1: Invalid path blocked by routerchecker
curl http://localhost:3500/v1.0/invoke/secure-api/method/admin/users
# Returns 403

# Test 2: Valid path but no token - blocked by bearerauth
curl http://localhost:3500/v1.0/invoke/secure-api/method/api/orders
# Returns 401

# Test 3: Valid token, but POST without writer role - blocked by OPA
curl -X POST \
  -H "Authorization: Bearer valid-token" \
  http://localhost:3500/v1.0/invoke/secure-api/method/api/orders
# Returns 403

# Test 4: Full access - passes all middleware
curl -X POST \
  -H "Authorization: Bearer valid-token" \
  -H "x-role: writer" \
  http://localhost:3500/v1.0/invoke/secure-api/method/api/orders
# Returns 200
```

## Kubernetes Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: full-pipeline
  namespace: default
spec:
  httpPipeline:
    handlers:
      - name: routerchecker
        type: middleware.http.routerchecker
      - name: ratelimit
        type: middleware.http.ratelimit
      - name: bearerauth
        type: middleware.http.bearer
      - name: opa-policy
        type: middleware.http.opa
```

## Summary

Chaining Dapr middleware components creates a defense-in-depth request pipeline. Place security-agnostic checks (path validation, rate limiting) first to reject invalid traffic cheaply, then apply authentication, and finally authorization. The order in `httpPipeline.handlers` determines execution sequence, giving you precise control over your service's security posture without changing application code.
