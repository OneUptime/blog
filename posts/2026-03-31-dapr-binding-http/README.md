# How to Set Up Dapr Binding with HTTP Endpoint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, HTTP, Output Binding, Webhook

Description: Configure a Dapr HTTP output binding to call external HTTP endpoints, webhooks, and REST APIs from your application via the Dapr binding interface.

---

## What Is the Dapr HTTP Binding?

The Dapr HTTP binding is an output binding that lets your application call any external HTTP endpoint through the Dapr sidecar. It supports all HTTP methods, custom headers, and query parameters. This is useful for calling webhooks, third-party REST APIs, or internal services that are not Dapr-enabled.

## How the HTTP Output Binding Works

```mermaid
flowchart LR
    App[Your Application] -->|POST /v1.0/bindings/external-api| Sidecar[Dapr Sidecar]
    Sidecar -->|HTTP GET/POST/PUT| Target[External HTTP Service]
    Target -->|Response| Sidecar
    Sidecar -->|Response| App
```

## Prerequisites

- Dapr initialized
- A target HTTP endpoint to call

## Configuring the HTTP Binding

```yaml
# http-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: external-api
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: "https://api.example.com"
  - name: direction
    value: "output"
```

For self-hosted mode, copy to the components directory:

```bash
cp http-binding.yaml ~/.dapr/components/
```

## Calling the HTTP Binding

The `operation` field specifies the HTTP method (get, post, put, patch, delete):

### GET Request

```bash
curl -X POST http://localhost:3500/v1.0/bindings/external-api \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get",
    "metadata": {
      "path": "/products/123?fields=name,price"
    }
  }'
```

### POST Request

```bash
curl -X POST http://localhost:3500/v1.0/bindings/external-api \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "post",
    "data": {"event": "order_confirmed", "orderId": "ORD-001"},
    "metadata": {
      "path": "/webhooks/orders",
      "Content-Type": "application/json"
    }
  }'
```

### PUT Request

```bash
curl -X POST http://localhost:3500/v1.0/bindings/external-api \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "put",
    "data": {"status": "active"},
    "metadata": {
      "path": "/users/USR-001",
      "Authorization": "Bearer myapitoken"
    }
  }'
```

## Python Examples

```python
import requests
import os
import json

DAPR_HTTP_PORT = os.environ.get("DAPR_HTTP_PORT", "3500")

def http_binding(binding_name, method, path="/", data=None, headers=None):
    """Call an HTTP binding on the Dapr sidecar."""
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/{binding_name}"
    metadata = {"path": path}
    if headers:
        metadata.update(headers)

    payload = {
        "operation": method.lower(),
        "metadata": metadata
    }
    if data is not None:
        payload["data"] = data

    resp = requests.post(url, json=payload)
    resp.raise_for_status()
    return resp.json() if resp.text else None

# GET request to fetch a product
product = http_binding("external-api", "GET", "/products/123")
print(f"Product: {product}")

# POST request to send a webhook
http_binding(
    "external-api", "POST",
    "/webhooks/order-confirmed",
    data={"orderId": "ORD-001", "amount": 99.99},
    headers={"Authorization": "Bearer token123"}
)
print("Webhook sent")

# PUT request to update a resource
http_binding(
    "external-api", "PUT",
    "/orders/ORD-001/status",
    data={"status": "shipped"}
)
print("Order status updated")
```

## Node.js Example

```javascript
const axios = require('axios');

const DAPR_PORT = process.env.DAPR_HTTP_PORT || 3500;

async function httpBinding(bindingName, method, path, data = null, headers = {}) {
  const response = await axios.post(
    `http://localhost:${DAPR_PORT}/v1.0/bindings/${bindingName}`,
    {
      operation: method.toLowerCase(),
      data,
      metadata: { path, ...headers }
    }
  );
  return response.data;
}

// Send a webhook notification
await httpBinding(
  'external-api',
  'POST',
  '/notifications',
  { event: 'user.registered', userId: 'USR-001' },
  { 'X-API-Key': 'myapikey' }
);

// GET an external resource
const data = await httpBinding('external-api', 'GET', '/status');
console.log('Status:', data);
```

## Go Example

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "log"
)

type HTTPBindingRequest struct {
    Operation string            `json:"operation"`
    Data      interface{}       `json:"data,omitempty"`
    Metadata  map[string]string `json:"metadata"`
}

func callHTTPBinding(bindingName, method, path string, data interface{}, headers map[string]string) ([]byte, error) {
    meta := map[string]string{"path": path}
    for k, v := range headers {
        meta[k] = v
    }

    req := HTTPBindingRequest{
        Operation: method,
        Data:      data,
        Metadata:  meta,
    }
    body, _ := json.Marshal(req)

    resp, err := http.Post(
        fmt.Sprintf("http://localhost:3500/v1.0/bindings/%s", bindingName),
        "application/json",
        bytes.NewBuffer(body),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}

func main() {
    // POST to external webhook
    _, err := callHTTPBinding(
        "external-api",
        "post",
        "/webhooks/events",
        map[string]interface{}{
            "event":   "order_completed",
            "orderId": "ORD-001",
        },
        map[string]string{
            "Authorization": "Bearer token123",
        },
    )
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Webhook delivered")
}
```

## Binding to Multiple Endpoints

Define multiple HTTP bindings for different external services:

```yaml
# slack-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: slack
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: "https://hooks.slack.com/services"
  - name: direction
    value: "output"
```

```yaml
# github-api.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: github
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: "https://api.github.com"
  - name: direction
    value: "output"
```

Send a Slack notification:

```python
http_binding(
    "slack",
    "POST",
    "/T000/B000/XXXX",
    data={"text": "Deployment succeeded!"},
    headers={"Content-Type": "application/json"}
)
```

## Metadata Reference

| Metadata Key | Description |
|-------------|-------------|
| `path` | URL path appended to base URL (can include query parameters) |
| `Authorization` | Authorization header |
| `Content-Type` | Content-Type header |
| Any capitalized key | Any metadata field starting with a capital letter is sent as an HTTP header |

## Summary

The Dapr HTTP output binding provides a simple way to call any external HTTP endpoint without hardcoding HTTP client logic in your application. Configure the base URL in the component YAML, then specify the method, path, body, and headers at call time via the `/v1.0/bindings` API. This is ideal for webhooks, third-party REST APIs, and any HTTP service integration.
