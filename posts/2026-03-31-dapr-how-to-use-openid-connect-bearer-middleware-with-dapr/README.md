# How to Use OpenID Connect Bearer Middleware with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenID Connect, Authentication, Middleware, Security

Description: Learn how to configure the Dapr OpenID Connect bearer middleware to validate JWT tokens and authenticate requests to your microservices without custom auth code.

---

## What Is the Dapr OIDC Bearer Middleware

The Dapr OpenID Connect (OIDC) bearer middleware is a Dapr HTTP middleware component that validates JWT bearer tokens on incoming requests to your service. When enabled, Dapr intercepts requests, validates the token against your OIDC provider (Auth0, Keycloak, Azure AD, etc.), and rejects unauthorized requests before they reach your application.

This offloads JWT validation from your application to the Dapr sidecar.

## Prerequisites

- Dapr installed on Kubernetes (or self-hosted)
- An OIDC-compliant identity provider (Auth0, Keycloak, Azure AD, Google, etc.)
- Basic familiarity with JWTs and OIDC

## Define the OIDC Middleware Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oidc-auth
  namespace: default
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: issuer
    value: "https://my-tenant.auth0.com/"
  - name: audience
    value: "https://api.my-app.com"
  - name: jwksURL
    value: "https://my-tenant.auth0.com/.well-known/jwks.json"
```

For Keycloak:

```yaml
  metadata:
  - name: issuer
    value: "https://keycloak.example.com/realms/my-realm"
  - name: audience
    value: "my-api-client"
  - name: jwksURL
    value: "https://keycloak.example.com/realms/my-realm/protocol/openid-connect/certs"
```

For Azure AD:

```yaml
  metadata:
  - name: issuer
    value: "https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0"
  - name: audience
    value: "api://your-app-id"
  - name: jwksURL
    value: "https://login.microsoftonline.com/YOUR_TENANT_ID/discovery/v2.0/keys"
```

## Create a Middleware Pipeline Configuration

Create a Dapr `Configuration` that applies the middleware to your service:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: my-service-config
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: oidc-auth
      type: middleware.http.bearer
```

## Apply the Configuration to Your Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-api-service"
        dapr.io/app-port: "3000"
        dapr.io/config: "my-service-config"
```

## Test Authentication

Send a request without a token (should be rejected):

```bash
curl http://my-api-service-url/api/data
# Expected: 401 Unauthorized
```

Send a request with a valid JWT:

```bash
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -H "Authorization: Bearer $TOKEN" \
  http://my-api-service-url/api/data
# Expected: 200 OK
```

## Access Token Claims in Your Application

After Dapr validates the token, the original `Authorization` header is still forwarded to your application. You can decode the JWT to access claims. Read them in Node.js:

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

// Extract claims from the validated JWT
function getClaims(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  // Token is already validated by Dapr — safe to decode without verification
  return jwt.decode(token) || {};
}

app.get('/api/profile', (req, res) => {
  const claims = getClaims(req);

  console.log(`Authenticated user: ${claims.sub} (${claims.email})`);

  res.json({
    userId: claims.sub,
    email: claims.email,
    message: 'Profile data for authenticated user'
  });
});

// Scope-based authorization (after Dapr validates the JWT)
app.delete('/api/resources/:id', (req, res) => {
  const claims = getClaims(req);
  const scopes = (claims.scope || '').split(' ');

  if (!scopes.includes('write:resources')) {
    return res.status(403).json({ error: 'Insufficient scope' });
  }

  // Proceed with deletion
  res.json({ deleted: true });
});
```

## Access Claims in Python

```python
import jwt
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

def get_claims(request: Request) -> dict:
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "", 1)
    # Token is already validated by Dapr — safe to decode without verification
    return jwt.decode(token, options={"verify_signature": False})

@app.get("/api/profile")
async def get_profile(request: Request):
    claims = get_claims(request)
    user_id = claims.get("sub")
    email = claims.get("email")
    scopes = claims.get("scope", "").split()

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return {
        "userId": user_id,
        "email": email,
        "scopes": scopes
    }

@app.post("/api/admin-action")
async def admin_action(request: Request):
    claims = get_claims(request)
    scopes = claims.get("scope", "").split()

    if "admin" not in scopes:
        raise HTTPException(status_code=403, detail="Admin scope required")

    return {"result": "Action performed"}
```

## Configure Public Endpoints

Some endpoints (like health checks) should not require authentication. Create a separate configuration without the middleware:

```yaml
# public-config.yaml - no auth middleware
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: public-config
  namespace: default
spec:
  httpPipeline:
    handlers: []   # no middleware
```

Or handle it at the application level by checking if the user header is present.

## Summary

The Dapr OIDC bearer middleware provides automatic JWT validation for incoming requests without modifying application code. By defining the middleware component with your OIDC provider's issuer URL and JWKS endpoint, and referencing it in a Configuration pipeline, Dapr rejects unauthenticated requests at the sidecar level. Your application can then decode the already-validated JWT from the `Authorization` header to extract claims for authorization decisions.
