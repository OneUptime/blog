# How to Use Middleware for Request Transformation in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Request Transformation, HTTP, Pipeline

Description: Learn how to use Dapr middleware components to transform HTTP requests and responses, including header manipulation, body transformation, and uppercase middleware.

---

## Introduction

Dapr middleware can transform requests before they reach your application and transform responses before they are returned to the caller. The built-in uppercase middleware is a simple example, but Wasm and custom middleware enable sophisticated transformations like JSON schema validation, payload enrichment, and protocol adaptation.

## Built-in Uppercase Middleware

The uppercase middleware transforms request bodies to uppercase:

```yaml
# components/uppercase.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: uppercase
spec:
  type: middleware.http.uppercase
  version: v1
```

```yaml
# config/uppercase-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: uppercase-pipeline
spec:
  httpPipeline:
    handlers:
      - name: uppercase
        type: middleware.http.uppercase
```

## Request Header Transformation with Wasm

Write a Wasm middleware in Go/TinyGo to inject headers:

```go
// wasm/inject_headers.go
package main

import (
    "github.com/http-wasm/http-wasm-guest-tinygo/handler"
    "github.com/http-wasm/http-wasm-guest-tinygo/handler/api"
)

func main() {
    handler.HandleRequestFn = handleRequest
}

func handleRequest(req api.Request, resp api.Response) (next bool, reqCtx uint32) {
    // Inject headers into the request
    req.Headers().Set("X-Processed-By", "dapr-middleware")
    return true, 0 // Continue processing
}
```

## Component for Wasm Transformation

```yaml
# components/transform-wasm.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: transform-wasm
spec:
  type: middleware.http.wasm
  version: v1
  metadata:
    - name: url
      value: "file://./wasm/inject_headers.wasm"
```

## Router Alias for Path Normalization

Use router alias to normalize API paths:

```yaml
# components/path-normalizer.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: path-normalizer
spec:
  type: middleware.http.routeralias
  version: v1
  metadata:
    - name: routes
      value: |
        {
          "/v1/order":  "/v1.0/invoke/transform-service/method/api/orders",
          "/v1/orders": "/v1.0/invoke/transform-service/method/api/orders",
          "/order":     "/v1.0/invoke/transform-service/method/api/orders"
        }
```

## Combining Transformations in a Pipeline

```yaml
# config/transform-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: transform-pipeline
spec:
  httpPipeline:
    handlers:
      - name: path-normalizer
        type: middleware.http.routeralias
      - name: transform-wasm
        type: middleware.http.wasm
      - name: ratelimit
        type: middleware.http.ratelimit
```

## Testing Request Transformation

```python
# app.py - your application receives the transformed request
from flask import Flask, request

app = Flask(__name__)

@app.route("/api/orders", methods=["POST"])
def create_order():
    # This header was injected by Dapr Wasm middleware
    processed_by = request.headers.get("X-Processed-By", "none")
    print(f"Processed By: {processed_by}")
    return {"status": "ok", "processed_by": processed_by}
```

```bash
dapr run \
  --app-id transform-service \
  --app-port 5000 \
  --config ./config/transform-pipeline.yaml \
  --resources-path ./components \
  -- flask run --port 5000

# Call the alias path - gets normalized to /v1.0/invoke/transform-service/method/api/orders
curl -X POST \
  http://localhost:3500/v1/order \
  -H "Content-Type: application/json" \
  -d '{"item":"widget"}'
```

## Response Transformation

For response transformation, use a Wasm module that intercepts the response:

```go
// In the same Wasm module, register a response handler:
func main() {
    handler.HandleRequestFn = handleRequest
    handler.HandleResponseFn = handleResponse
}

func handleRequest(req api.Request, resp api.Response) (next bool, reqCtx uint32) {
    return true, 0 // Continue to next handler
}

func handleResponse(reqCtx uint32, req api.Request, resp api.Response, isError bool) {
    resp.Headers().Set("X-Cache-Control", "max-age=60")
}
```

## Summary

Dapr middleware provides multiple options for request and response transformation: the built-in uppercase and router alias components handle simple cases, while Wasm middleware enables custom logic in any Wasm-compatible language. Chaining transformations in the pipeline lets you normalize paths, inject headers, validate payloads, and modify responses without touching application code.
