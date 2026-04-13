# How to Use Dapr with Azure AD B2C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure AD B2C, Authentication, JWT, Microsoft

Description: Protect Dapr microservices with Azure AD B2C tokens using the JWT middleware, enabling consumer identity management for public-facing APIs.

---

## Azure AD B2C and Dapr

Azure AD B2C handles consumer identity: sign-up, sign-in, profile editing, and password reset. It issues JWTs that your Dapr sidecar validates, protecting APIs without writing auth code in each microservice.

## Azure AD B2C Setup

```bash
# Required information from Azure Portal:
# - Tenant name: myapp.onmicrosoft.com
# - Tenant ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# - User flow name: B2C_1_signupsignin
# - Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

The JWKS endpoint for a user flow:

```yaml
https://myapp.b2clogin.com/myapp.onmicrosoft.com/B2C_1_signupsignin/discovery/v2.0/keys
```

## Dapr JWT Middleware

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: b2c-validator
  namespace: default
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://myapp.b2clogin.com/myapp.onmicrosoft.com/B2C_1_signupsignin/discovery/v2.0/keys"
  - name: audience
    value: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  - name: issuer
    value: "https://myapp.b2clogin.com/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/v2.0/"
```

## Pipeline Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: b2c-config
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: b2c-validator
      type: middleware.http.bearer
```

## Deployment Annotation

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "consumer-api"
    dapr.io/app-port: "8080"
    dapr.io/config: "b2c-config"
```

## Reading B2C Claims in Node.js

```javascript
const express = require("express");
const app = express();

app.get("/api/profile", (req, res) => {
  // Azure AD B2C custom claims
  const userId = req.headers["x-jwt-sub"];
  const displayName = req.headers["x-jwt-name"];
  const email = req.headers["x-jwt-emails"];
  // B2C flow name is in the "tfp" claim
  const userFlow = req.headers["x-jwt-tfp"];

  res.json({
    userId,
    displayName,
    email,
    userFlow,
  });
});

app.put("/api/profile", (req, res) => {
  const userId = req.headers["x-jwt-sub"];
  if (!userId) {
    return res.status(401).json({ error: "authentication required" });
  }
  // Update user profile...
  res.json({ updated: true });
});

app.listen(8080);
```

## Custom Policy (IEF) Claims

For complex B2C scenarios using Identity Experience Framework:

```xml
<!-- In your TrustFrameworkExtensions.xml -->
<OutputClaim ClaimTypeReferenceId="extension_SubscriptionTier" />
<OutputClaim ClaimTypeReferenceId="extension_AccountStatus" />
```

These custom attributes appear in the JWT and are forwarded by Dapr:

```javascript
const subscriptionTier = req.headers["x-jwt-extension_subscriptiontier"];
const accountStatus = req.headers["x-jwt-extension_accountstatus"];
```

## Testing with a B2C Token

```bash
# After obtaining a token from your B2C login flow
TOKEN="eyJhbGci..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3500/v1.0/invoke/consumer-api/method/api/profile
```

## Summary

Azure AD B2C integrates with Dapr through the standard OIDC/JWT mechanism. The key difference from enterprise AD is that B2C is designed for consumer identities with user flows for self-service registration and profile management. Custom policy attributes appear as JWT claims and flow through Dapr's middleware as headers, keeping your API code focused on business logic rather than token handling.
