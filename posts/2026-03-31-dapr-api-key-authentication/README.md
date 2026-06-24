# How to Implement API Key Authentication with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, API Key, Authentication, Security, Middleware

Description: Protect Dapr service invocation endpoints with API key authentication using the built-in middleware component and Kubernetes secrets.

---

## API Token Auth with Dapr

Dapr includes built-in API token authentication that validates a shared token on incoming HTTP and gRPC requests to the Dapr sidecar. When enabled, every call to the Dapr API must include the token in the `dapr-api-token` header, or the request is rejected. The token is stored in a Kubernetes Secret and referenced via a deployment annotation, keeping it out of your code and manifests.

## Creating the API Token Secret

```bash
# Generate a secure API token
API_TOKEN=$(openssl rand 16 | base64)
echo "Generated token: $API_TOKEN"

# Store in Kubernetes secret
kubectl create secret generic dapr-api-token \
  --from-literal=token="$API_TOKEN" \
  -n default
```

## Enabling API Token Authentication

Add the `dapr.io/api-token-secret` annotation to your Deployment to enable token validation on the Dapr sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: default
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "api-service"
        dapr.io/api-token-secret: "dapr-api-token"
    spec:
      containers:
      - name: api-service
        image: api-service:latest
```

When this annotation is set, the Dapr sidecar reads the token from the referenced Kubernetes Secret and requires it on all incoming API requests.

## Multi-Key Validation (Custom Middleware)

For multiple API keys (e.g., one per client), use the Dapr Secrets API:

```go
package main

import (
    "context"
    "net/http"

    dapr "github.com/dapr/go-sdk/client"
)

var daprClient dapr.Client

func init() {
    var err error
    daprClient, err = dapr.NewClient()
    if err != nil {
        panic(err)
    }
}

func apiKeyMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        incomingKey := r.Header.Get("X-API-Key")
        if incomingKey == "" {
            http.Error(w, `{"error":"missing API key"}`, http.StatusUnauthorized)
            return
        }

        // Look up key in secrets store
        secret, err := daprClient.GetSecret(context.Background(),
            "kubernetes", "api-keys", map[string]string{"namespace": "default"})
        if err != nil || secret[incomingKey] == "" {
            http.Error(w, `{"error":"invalid API key"}`, http.StatusForbidden)
            return
        }

        // Attach client ID to request context
        clientID := secret[incomingKey]
        r.Header.Set("X-Client-ID", clientID)
        next.ServeHTTP(w, r)
    })
}
```

## Kubernetes Secret with Multiple Keys

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-keys
  namespace: default
type: Opaque
stringData:
  # Format: key-value where key=API key, value=client identifier
  "abc123def456": "client-partner-a"
  "xyz789uvw012": "client-partner-b"
  "qrs345tuv678": "client-internal"
```

## Testing API Token Auth

```bash
# Without API token - rejected
curl http://localhost:3500/v1.0/invoke/api-service/method/data
# 401 Unauthorized

# With valid API token - accepted
curl -H "dapr-api-token: $API_TOKEN" \
  http://localhost:3500/v1.0/invoke/api-service/method/data
# 200 OK

# Rotate API token (update secret, then restart sidecar to pick up the new token)
kubectl patch secret dapr-api-token \
  -p '{"stringData":{"token":"new-token-value"}}'
kubectl rollout restart deployment/api-service -n default
```

## Summary

Dapr's built-in API token authentication provides a zero-code authentication layer for all Dapr API endpoints, including service invocation. Storing the token in a Kubernetes Secret separates credentials from configuration, and the sidecar validates the token before processing any request. For multi-client scenarios, the Secrets API enables per-client key lookup with client identity forwarding using custom application middleware.
