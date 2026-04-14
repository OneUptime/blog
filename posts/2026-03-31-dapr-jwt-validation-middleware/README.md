# How to Implement JWT Validation with Dapr Middleware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, JWT, Security, Middleware, Authentication

Description: Learn how to validate JWT tokens using Dapr's bearer auth middleware to protect service endpoints without adding JWT validation logic to your application code.

---

JWT (JSON Web Token) validation ensures that only requests with valid, unexpired tokens from a trusted issuer can reach your service. Dapr's bearer auth middleware handles JWT validation at the sidecar level, keeping authentication logic out of your application code.

## How Dapr JWT Validation Works

The `middleware.http.bearer` component validates JWT tokens by:
1. Checking for the `Authorization: Bearer <token>` header
2. Fetching the JSON Web Key Set (JWKS) from the issuer's well-known endpoint
3. Verifying the token signature, expiry, and audience claims
4. Returning HTTP 401 if validation fails

## Bearer Auth Middleware Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bearer-auth
  namespace: default
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://accounts.google.com/.well-known/openid-configuration"
  - name: audience
    value: "https://api.myapp.com"
  - name: issuer
    value: "https://accounts.google.com"
```

For Azure AD:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-jwt-auth
  namespace: default
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys"
  - name: audience
    value: "api://your-app-client-id"
  - name: issuer
    value: "https://login.microsoftonline.com/{tenant-id}/v2.0"
```

## Apply JWT Validation via Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: jwt-config
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: bearer-auth
      type: middleware.http.bearer
```

## Annotate the Protected Deployment

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
        dapr.io/config: "jwt-config"
```

## Application Code - Trust Validated Claims

After Dapr validates the JWT, your application can decode claims from the `Authorization` header. Since Dapr has already verified the token signature, expiry, and audience, you can safely decode the payload without re-validating:

```javascript
const express = require('express');
const app = express();

app.get('/api/user-data', (req, res) => {
    // Dapr has already validated the JWT; decode claims from the Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token found' });
    }

    const token = authHeader.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

    const userId = payload.sub;
    const email = payload.email;
    const scope = payload.scope;

    if (!userId) {
        return res.status(401).json({ error: 'No user identity found' });
    }

    res.json({
        userId,
        email,
        scope,
        message: 'Authenticated request processed successfully'
    });
});

app.listen(8080);
```

## Testing JWT Validation

```bash
# Request without a token - should return 401
curl -v http://localhost:3500/v1.0/invoke/api-service/method/api/user-data

# Request with a valid JWT
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3500/v1.0/invoke/api-service/method/api/user-data

# Request with an expired JWT - should return 401
EXPIRED_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2...}"
curl -H "Authorization: Bearer $EXPIRED_TOKEN" \
  http://localhost:3500/v1.0/invoke/api-service/method/api/user-data
```

## Summary

Dapr's bearer auth middleware validates JWT tokens using JWKS from the identity provider's discovery endpoint, handling signature verification, expiry, and audience checks automatically. Your application receives only pre-authenticated requests and can decode validated claims directly from the JWT in the `Authorization` header. This cleanly separates authentication from business logic.
