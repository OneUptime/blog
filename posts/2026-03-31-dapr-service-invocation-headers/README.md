# How to Pass Headers and Metadata in Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP, Header, Metadata, Service Invocation

Description: Learn how to pass custom HTTP headers and metadata in Dapr service invocation calls, including authorization tokens, trace IDs, and custom context values.

---

## Header Propagation in Dapr

When you invoke a service through Dapr, HTTP headers on the outgoing request are automatically forwarded to the target service. This allows you to pass authorization tokens, correlation IDs, and other metadata without special Dapr configuration.

## Passing Headers via curl

```bash
curl http://localhost:3500/v1.0/invoke/order-service/method/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiJ9..." \
  -H "X-Request-ID: req-abc-123" \
  -H "X-Tenant-ID: tenant-456" \
  -d '{"item": "widget"}'
```

The `order-service` receives all of these headers.

## Passing Headers in Node.js

```javascript
const axios = require('axios');

const response = await axios.post(
  'http://localhost:3500/v1.0/invoke/order-service/method/orders',
  { item: 'widget', qty: 5 },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Request-ID': requestId,
      'X-Correlation-ID': correlationId,
    }
  }
);
```

## Passing Headers in Go

```go
data, _ := json.Marshal(map[string]interface{}{
    "item": "widget",
    "qty":  5,
})

req, _ := http.NewRequest("POST",
    "http://localhost:3500/v1.0/invoke/order-service/method/orders",
    bytes.NewBuffer(data),
)
req.Header.Set("Content-Type", "application/json")
req.Header.Set("Authorization", "Bearer "+token)
req.Header.Set("X-Request-ID", requestID)
req.Header.Set("X-Correlation-ID", correlationID)

resp, err := http.DefaultClient.Do(req)
```

## Reading Headers in the Target Service

```javascript
// order-service receives all forwarded headers
app.post('/orders', (req, res) => {
  const authToken = req.headers['authorization'];
  const requestId = req.headers['x-request-id'];
  const tenantId  = req.headers['x-tenant-id'];

  console.log(`Processing order for tenant ${tenantId}, request ${requestId}`);
  res.json({ status: 'created' });
});
```

## Dapr-Specific Metadata Headers

Dapr also passes certain metadata headers automatically:

| Header | Description |
|--------|-------------|
| `dapr-app-id` | Source application ID |
| `traceparent` | W3C trace context header |
| `tracestate` | W3C trace state |

## Adding Headers with Middleware

Use Dapr middleware to automatically inject authorization headers into requests:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-token
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
    - name: clientId
      value: "my-client-id"
    - name: clientSecret
      value: "my-client-secret"
    - name: scopes
      value: "read:orders"
    - name: tokenURL
      value: "https://auth.example.com/oauth2/token"
    - name: headerName
      value: "authorization"
```

## Summary

HTTP headers are automatically forwarded by Dapr during service invocation. Pass authorization tokens, correlation IDs, and custom metadata by including them as standard HTTP headers on the request. The target service reads them as normal request headers. Dapr also injects its own tracing headers automatically.
