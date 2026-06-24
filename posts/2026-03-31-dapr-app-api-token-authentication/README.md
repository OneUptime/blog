# How to Configure App API Token Authentication in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Authentication, Application, Token

Description: Learn how to configure App API token authentication in Dapr so the sidecar validates a secret token before forwarding requests to your application.

---

## Overview

App API token authentication is the complement to Dapr API token auth. Instead of protecting calls TO the sidecar, it protects calls FROM the sidecar TO your application. When enabled, Dapr sends a token header with every request it forwards to your app, and your app can verify this token to ensure traffic originates from its sidecar and not from an external source.

## How App API Token Authentication Works

When you configure an app API token, Dapr automatically adds the `dapr-api-token` header to every request it forwards to your application - including pub/sub deliveries, service invocation calls, and binding triggers. Your application then validates this token before processing the request.

## Setting Up the App API Token

### Kubernetes

Create a Kubernetes secret:

```bash
kubectl create secret generic app-api-token \
  --from-literal=token=myappsecrettoken456
```

Add the annotation to your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/app-token-secret: "app-api-token"
```

### Self-Hosted

Set the `APP_API_TOKEN` environment variable:

```bash
export APP_API_TOKEN="myappsecrettoken456"
dapr run --app-id my-service --app-port 3000 -- node app.js
```

## Validating the Token in Your Application

Your application receives the token in the `dapr-api-token` header and should validate it:

```javascript
const express = require('express');
const app = express();

const APP_TOKEN = process.env.APP_API_TOKEN;

function validateDaprToken(req, res, next) {
  const token = req.headers['dapr-api-token'];
  if (!token || token !== APP_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(express.json());

app.post('/orders', validateDaprToken, (req, res) => {
  console.log('Received order from Dapr:', req.body);
  res.status(200).send({ success: true });
});

app.listen(3000);
```

For a Go application:

```go
package main

import (
    "net/http"
    "os"
)

func validateToken(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("dapr-api-token")
        expected := os.Getenv("APP_API_TOKEN")
        if token == "" || token != expected {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        next(w, r)
    }
}

func ordersHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
}

func main() {
    http.HandleFunc("/orders", validateToken(ordersHandler))
    http.ListenAndServe(":3000", nil)
}
```

## Testing the Setup

Simulate a request without the token to confirm rejection:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"id": "1"}'
# Expected: 401 Unauthorized
```

Then with the token:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "dapr-api-token: myappsecrettoken456" \
  -d '{"id": "1"}'
# Expected: 200 OK
```

## Summary

App API token authentication ensures your application only accepts traffic forwarded by its own Dapr sidecar. By validating the `dapr-api-token` header in your request handlers, you create a mutual trust boundary between the sidecar and your application, preventing bypass attacks from other network clients.
