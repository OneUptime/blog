# How to Use Dapr with OpenID Connect Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenID Connect, OAuth2, Authentication, Middleware

Description: Configure Dapr middleware to authenticate requests using OpenID Connect providers like Keycloak, Okta, or Auth0 for secure user identity verification.

---

## Dapr and OpenID Connect

Dapr's OAuth2 middleware supports OpenID Connect (OIDC) for authenticating incoming HTTP requests. When a request arrives, the middleware validates the Bearer token against the OIDC provider's JWKS endpoint, verifying the token signature, expiry, audience, and issuer.

## Supported OIDC Providers

Dapr works with any OIDC-compliant provider:
- Keycloak (self-hosted)
- Okta
- Auth0
- Azure AD (Entra ID)
- Google Identity
- Dex

## Configuring OAuth2 Client Credentials Middleware

Use the OAuth2 client credentials middleware to automatically obtain and attach tokens to outgoing requests. This is useful for service-to-service authentication where your Dapr app needs to call APIs protected by an OIDC provider:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oidc-auth
  namespace: production
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
    - name: clientId
      value: "dapr-service-client"
    - name: clientSecret
      secretKeyRef:
        name: oidc-secrets
        key: clientSecret
    - name: scopes
      value: "openid api.read"
    - name: tokenURL
      value: "https://auth.example.com/oauth/token"
    - name: headerName
      value: "Authorization"
```

## JWT Bearer Token Validation

For validating incoming JWTs from OIDC providers:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jwt-auth
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
    - name: jwksURL
      value: "https://auth.example.com/.well-known/jwks.json"
    - name: audience
      value: "https://api.myapp.com"
    - name: issuer
      value: "https://auth.example.com/"
```

Apply middleware in a pipeline:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: app-config
  namespace: production
spec:
  httpPipeline:
    handlers:
      - name: jwt-auth
        type: middleware.http.bearer
```

## Configuring Keycloak as OIDC Provider

Example Keycloak client configuration for Dapr:

```bash
# Create realm and client in Keycloak
kcadm.sh create clients -r myrealm \
  -s clientId=dapr-app \
  -s enabled=true \
  -s publicClient=false \
  -s 'redirectUris=["https://myapp.example.com/*"]' \
  -s 'webOrigins=["https://myapp.example.com"]'

# Get JWKS URL
# https://keycloak.example.com/realms/myrealm/protocol/openid-connect/certs
```

## Validating Tokens in Application Code

Even with Dapr middleware validation, you can re-validate tokens in your app:

```javascript
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json'
});

async function validateToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  const key = await client.getSigningKey(decoded.header.kid);
  const publicKey = key.getPublicKey();

  return jwt.verify(token, publicKey, {
    audience: 'https://api.myapp.com',
    issuer: 'https://auth.example.com/'
  });
}
```

## Testing OIDC Authentication

```bash
# Get a token from your OIDC provider
TOKEN=$(curl -s -X POST https://auth.example.com/oauth/token \
  -d "client_id=dapr-app&client_secret=secret&grant_type=client_credentials&scope=api.read" \
  | jq -r '.access_token')

# Call your Dapr app with the token
curl http://localhost:3500/v1.0/invoke/my-app/method/data \
  -H "Authorization: Bearer $TOKEN"
```

## Summary

Integrate Dapr with OpenID Connect providers using the bearer token middleware for JWT validation. Configure the middleware with the provider's JWKS URL, expected audience, and issuer. The middleware validates incoming tokens on every request, protecting your application without requiring OIDC SDK dependencies in your code. Test the integration by obtaining a real token from your OIDC provider and sending it in the Authorization header.
