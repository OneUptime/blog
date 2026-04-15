# How to Implement API Authentication with Dapr Middleware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Authentication, Middleware, JWT, Security

Description: Learn how to implement JWT, OAuth2, and API key authentication for Dapr services using built-in middleware components and custom middleware pipelines.

---

## API Authentication in Dapr

Dapr provides several built-in middleware components for API authentication. Instead of implementing authentication logic in every microservice, you can centralize it in Dapr's HTTP middleware pipeline, ensuring consistent enforcement across all services without code duplication.

## JWT Bearer Token Authentication

Configure the Bearer token middleware to validate JWTs against a JWKS endpoint:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jwt-auth
  namespace: production
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://auth.example.com/.well-known/jwks.json"
  - name: issuer
    value: "https://auth.example.com"
  - name: audience
    value: "api.myapp.com"
```

Apply to a service configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: jwt-protected-config
  namespace: production
spec:
  httpPipeline:
    handlers:
    - name: jwt-auth
      type: middleware.http.bearer
```

## OAuth2 Client Credentials Middleware

For service-to-service authentication, use OAuth2 client credentials:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-client
  namespace: production
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
  - name: clientID
    secretKeyRef:
      name: oauth-credentials
      key: clientID
  - name: clientSecret
    secretKeyRef:
      name: oauth-credentials
      key: clientSecret
  - name: tokenURL
    value: "https://auth.example.com/oauth2/token"
  - name: scopes
    value: "service.read,service.write"
  - name: headerName
    value: "Authorization"
  - name: authStyle
    value: "2"
```

## Custom API Key Middleware

Build a custom middleware component for API key validation:

```go
// api-key-middleware.go
package main

import (
    "context"
    "net/http"
    "strings"

    "github.com/dapr/components-contrib/middleware"
    "github.com/dapr/kit/logger"
)

type APIKeyMiddleware struct {
    logger    logger.Logger
    validKeys map[string]string // key -> client name
}

func (a *APIKeyMiddleware) GetHandler(ctx context.Context, metadata middleware.Metadata) (func(http.Handler) http.Handler, error) {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            apiKey := r.Header.Get("X-API-Key")
            if apiKey == "" {
                // Also check Authorization header: Bearer <key>
                auth := r.Header.Get("Authorization")
                if strings.HasPrefix(auth, "ApiKey ") {
                    apiKey = strings.TrimPrefix(auth, "ApiKey ")
                }
            }

            clientName, valid := a.validKeys[apiKey]
            if !valid {
                http.Error(w, `{"error":"invalid or missing API key"}`, http.StatusUnauthorized)
                return
            }

            r.Header.Set("X-Client-Name", clientName)
            next.ServeHTTP(w, r)
        })
    }, nil
}
```

## Middleware Chaining - Auth Plus Rate Limit

Combine authentication and rate limiting in a single pipeline:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: secure-api-config
  namespace: production
spec:
  httpPipeline:
    handlers:
    - name: jwt-auth
      type: middleware.http.bearer
    - name: ratelimit
      type: middleware.http.ratelimit
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector:4317"
      protocol: grpc
```

## Accessing Claims in Application Code

After Dapr bearer middleware validates the JWT, decode the token payload in your handler to access claims:

```python
from fastapi import FastAPI, Request, HTTPException
import base64
import json

app = FastAPI()

@app.get("/api/profile")
async def get_profile(request: Request):
    # Dapr bearer middleware has already validated the JWT
    # Decode the payload to access claims
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ")
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload))

    user_id = claims.get("sub")
    email = claims.get("email")
    roles = claims.get("roles", [])

    if "admin" not in roles:
        raise HTTPException(status_code=403, detail="insufficient permissions")

    return {
        "userId": user_id,
        "email": email,
        "roles": roles
    }
```

## Testing Authentication Middleware

```bash
# Test with valid JWT
JWT=$(curl -s -X POST "https://auth.example.com/oauth2/token" \
  -d "grant_type=client_credentials&client_id=test&client_secret=secret&scope=api.read" | \
  jq -r '.access_token')

# Call through the Dapr sidecar so the middleware pipeline is applied
curl -H "Authorization: Bearer $JWT" \
  "http://localhost:3500/v1.0/invoke/my-service/method/api/profile"

# Test with invalid JWT - should return 401
curl -H "Authorization: Bearer invalid-token" \
  "http://localhost:3500/v1.0/invoke/my-service/method/api/profile"
```

## Summary

Dapr's middleware pipeline provides JWT bearer token validation, OAuth2 client credentials injection, and extensible custom middleware for API key authentication - all configured as Kubernetes custom resources without application code changes. Chain middleware handlers in order (authenticate first, then rate limit) and apply configurations to specific services via the `dapr.io/config` annotation. After Dapr validates the JWT, decode the token payload in your application handlers to extract claims and implement authorization logic.
