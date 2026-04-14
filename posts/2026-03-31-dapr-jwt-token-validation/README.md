# How to Implement JWT Token Validation with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, JWT, Authentication, Security, Middleware

Description: Configure Dapr middleware to validate JWT tokens on incoming requests, extract claims, and enforce authorization without writing custom auth code.

---

## JWT Validation with Dapr Middleware

Dapr's middleware pipeline can validate JWTs before a request reaches your application. This offloads token verification from your services and centralizes the auth logic in the sidecar.

## Configuring the JWT Middleware

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jwt-validator
  namespace: default
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://auth.example.com/.well-known/jwks.json"
  - name: audience
    value: "api.example.com"
  - name: issuer
    value: "https://auth.example.com/"
```

## Applying the Middleware via Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: api-config
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: jwt-validator
      type: middleware.http.bearer
```

## Attaching the Config to Your Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "api-service"
        dapr.io/app-port: "8080"
        dapr.io/config: "api-config"
```

## Reading JWT Claims in Your Application

Dapr validates the token but passes the original request through unchanged. Your application can decode the already-validated JWT from the `Authorization` header to extract claims:

```python
import base64
import json
from fastapi import FastAPI, Request

app = FastAPI()

def decode_jwt_claims(token: str) -> dict:
    """Decode claims from a validated JWT (no signature check needed — Dapr already validated it)."""
    payload = token.split(".")[1]
    # Add padding if needed
    payload += "=" * (4 - len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))

@app.get("/api/profile")
async def get_profile(request: Request):
    # Dapr has already validated the token — extract claims from it
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ")
    claims = decode_jwt_claims(token)

    return {
        "userId": claims.get("sub"),
        "email": claims.get("email"),
        "roles": claims.get("roles", [])
    }
```

## Generating a Test JWT

```bash
# Install jwt-cli
npm install -g @clarketm/jwt-cli

# Generate a test token (for development only)
jwt sign \
  '{"sub":"user-123"}' \
  ./dev-private-key.pem \
  --algorithm RS256 \
  --issuer "https://auth.example.com/" \
  --audience "api.example.com" \
  --expiresIn "1h"
```

## Testing JWT Validation

```bash
# Valid token - should return 200
TOKEN="eyJhbGci..."
curl -H "Authorization: Bearer $TOKEN" http://localhost:3500/v1.0/invoke/api-service/method/api/profile

# No token - Dapr returns 401 before request reaches your app
curl http://localhost:3500/v1.0/invoke/api-service/method/api/profile
# HTTP 401 Unauthorized

# Expired token - Dapr returns 401
curl -H "Authorization: Bearer $EXPIRED_TOKEN" \
  http://localhost:3500/v1.0/invoke/api-service/method/api/profile
# HTTP 401 Unauthorized
```

## Custom Claim Extraction Middleware

```go
func claimExtractorMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Dapr has already validated the token — extract claims from it
        authHeader := r.Header.Get("Authorization")
        if !strings.HasPrefix(authHeader, "Bearer ") {
            http.Error(w, "missing user context", http.StatusUnauthorized)
            return
        }
        token := strings.TrimPrefix(authHeader, "Bearer ")

        // Decode the payload (no signature check needed — Dapr validated it)
        parts := strings.Split(token, ".")
        if len(parts) != 3 {
            http.Error(w, "invalid token format", http.StatusUnauthorized)
            return
        }
        payload, err := base64.RawURLEncoding.DecodeString(parts[1])
        if err != nil {
            http.Error(w, "invalid token encoding", http.StatusUnauthorized)
            return
        }

        var claims map[string]interface{}
        if err := json.Unmarshal(payload, &claims); err != nil {
            http.Error(w, "invalid token claims", http.StatusUnauthorized)
            return
        }

        sub, _ := claims["sub"].(string)
        if sub == "" {
            http.Error(w, "missing user context", http.StatusUnauthorized)
            return
        }

        ctx := context.WithValue(r.Context(), "userID", sub)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Summary

Dapr's bearer token middleware handles JWT validation including JWKS fetching, token signature verification, expiry checks, and audience/issuer validation. Invalid requests are rejected with a 401 before reaching your app. Valid requests pass through unchanged with the original `Authorization` header intact, so your application can decode the already-validated JWT to extract claims without needing to re-verify the signature.
