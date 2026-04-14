# How to Use Router Alias Middleware in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Router, Alias, HTTP

Description: Learn how to configure the Dapr Router Alias middleware to map external URL paths to internal service paths without modifying your application code.

---

## Introduction

The Dapr Router Alias middleware (`middleware.http.routeralias`) lets you define path aliases so that incoming requests on one URL are transparently forwarded to a different path on your application. This is useful for versioning APIs, supporting legacy paths, or simplifying public-facing URLs.

## Use Case

Your service exposes `/api/v2/orders` internally, but you want Dapr to accept requests on `/orders` and route them correctly without changing your application code.

## Component Configuration

```yaml
# components/router-alias.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: router-alias
spec:
  type: middleware.http.routeralias
  version: v1
  metadata:
    - name: routes
      value: |
        {
          "/orders": "/api/v2/orders",
          "/orders/": "/api/v2/orders/",
          "/users": "/api/v2/users",
          "/health": "/api/internal/health"
        }
```

## Pipeline Configuration

```yaml
# config/router-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: router-pipeline
spec:
  httpPipeline:
    handlers:
      - name: router-alias
        type: middleware.http.routeralias
```

## Running the App

```bash
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --config ./config/router-pipeline.yaml \
  --resources-path ./components \
  -- python app.py
```

## Application Endpoints (Internal Paths)

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

# Internal path - the alias middleware routes /orders here
@app.route("/api/v2/orders", methods=["GET", "POST"])
def orders():
    if request.method == "GET":
        return jsonify({"orders": []})
    order = request.get_json()
    return jsonify({"order_id": order.get("id"), "status": "created"}), 201

@app.route("/api/internal/health")
def health():
    return jsonify({"status": "ok"})
```

## Calling via Aliased Paths

```bash
# Clients call /orders, middleware routes to /api/v2/orders
curl http://localhost:3500/v1.0/invoke/order-service/method/orders

# POST to alias
curl -X POST http://localhost:3500/v1.0/invoke/order-service/method/orders \
  -H "Content-Type: application/json" \
  -d '{"id": "ORD-001", "item": "widget"}'

# Health check via alias
curl http://localhost:3500/v1.0/invoke/order-service/method/health
```

## API Versioning Pattern

Use router alias to support multiple API versions simultaneously:

```json
{
  "/v1/orders": "/api/v1/orders",
  "/v2/orders": "/api/v2/orders",
  "/v1/users":  "/api/v1/users",
  "/v2/users":  "/api/v2/users"
}
```

## Combining with Other Middleware

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: full-pipeline
spec:
  httpPipeline:
    handlers:
      - name: router-alias
        type: middleware.http.routeralias
      - name: ratelimit
        type: middleware.http.ratelimit
      - name: bearerauth
        type: middleware.http.bearer
```

## Summary

The Dapr Router Alias middleware provides URL path mapping at the sidecar level, decoupling your public API paths from your internal application routes. This enables gradual API migrations, legacy path support, and simplified public URLs without any application code changes. Combined with other middleware, it forms a powerful API gateway layer in front of your services.
