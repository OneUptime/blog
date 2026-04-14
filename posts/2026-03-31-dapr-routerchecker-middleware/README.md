# How to Use RouterChecker Middleware in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, RouterChecker, Security, HTTP

Description: Learn how to configure the Dapr RouterChecker middleware to validate and filter incoming request paths before they reach your application service.

---

## Introduction

The Dapr RouterChecker middleware (`middleware.http.routerchecker`) validates incoming HTTP request paths against a regular expression allow-list. Requests with paths that do not match the configured pattern are rejected with a 400 Bad Request response before they reach your application. This adds a defense layer against path traversal and unexpected route access.

## Component Configuration

Allow only specific paths using a regex pattern:

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
      value: "^/(api|health|metrics)(/.*)?"
```

## Pattern Examples

```yaml
# Allow only /api/* and /health
- name: rule
  value: "^/(api|health)(/.*)?"

# Allow specific versioned endpoints
- name: rule
  value: "^/v[12]/orders(/.*)?$"

# Block all paths except root and /status
- name: rule
  value: "^(/|/status)$"
```

## Pipeline Configuration

```yaml
# config/routerchecker-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: routerchecker-pipeline
spec:
  httpPipeline:
    handlers:
      - name: routerchecker
        type: middleware.http.routerchecker
```

## Running the App

```bash
dapr run \
  --app-id secure-service \
  --app-port 8080 \
  --config ./config/routerchecker-pipeline.yaml \
  --resources-path ./components \
  -- python app.py
```

## Application Code

```python
from flask import Flask, jsonify

app = Flask(__name__)

# These paths are allowed by the routerchecker pattern
@app.route("/api/orders")
def orders():
    return jsonify({"orders": []})

@app.route("/api/users")
def users():
    return jsonify({"users": []})

@app.route("/health")
def health():
    return jsonify({"status": "ok"})
```

## Testing Allowed and Blocked Paths

```bash
# Allowed - matches ^/(api|health)(/.*)?
curl http://localhost:3500/v1.0/invoke/secure-service/method/api/orders
# Returns 200

# Blocked - does not match pattern
curl http://localhost:3500/v1.0/invoke/secure-service/method/admin/users
# Returns 400 Bad Request

# Blocked - path traversal attempt
curl http://localhost:3500/v1.0/invoke/secure-service/method/../etc/passwd
# Returns 400 Bad Request
```

## Combining RouterChecker with Rate Limiting

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: secure-pipeline
spec:
  httpPipeline:
    handlers:
      - name: routerchecker
        type: middleware.http.routerchecker
      - name: ratelimit
        type: middleware.http.ratelimit
```

Place routerchecker first so invalid paths are rejected before consuming rate limit tokens.

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "secure-service"
        dapr.io/app-port: "8080"
        dapr.io/config: "routerchecker-pipeline"
```

## Summary

Dapr RouterChecker middleware adds path-based access control at the sidecar level. By defining a regex allow-list of valid paths, you block unexpected routes before they reach your application. This is a lightweight defense against path traversal attacks and unexpected API surface exposure, and works best as the first handler in the middleware pipeline.
