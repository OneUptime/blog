# How to Set Up Request Authentication with Auth0 in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Auth0, JWT, RequestAuthentication, Authentication

Description: Complete guide to integrating Auth0 as a JWT provider with Istio RequestAuthentication for validating tokens at the service mesh level.

---

Auth0 is one of the most popular identity providers, and integrating it with Istio is pretty straightforward once you know the right issuer URL and JWKS endpoint. This guide walks through the full setup - from getting your Auth0 configuration values to testing token validation in the mesh.

## Prerequisites

You'll need:
- An Auth0 account with a configured application (or API)
- An Istio mesh running on Kubernetes
- `kubectl` and `istioctl` installed

## Getting Auth0 Configuration Values

Every Auth0 tenant has a specific issuer URL and JWKS endpoint. The format is:

- **Issuer:** `https://<your-tenant>.auth0.com/`
- **JWKS URI:** `https://<your-tenant>.auth0.com/.well-known/jwks.json`

You can verify these by hitting the OpenID Connect discovery endpoint:

```bash
curl -s https://your-tenant.auth0.com/.well-known/openid-configuration | python3 -m json.tool
```

Look for the `issuer` and `jwks_uri` fields in the output. Pay attention to the trailing slash - Auth0 issuers typically include a trailing slash.

Also note your API's audience identifier. If you created an API in Auth0 (under APIs section), the audience is the identifier you set (for example, `https://api.example.com`).

## Creating the RequestAuthentication

Here's the RequestAuthentication for Auth0:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: auth0-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://your-tenant.auth0.com/"
      jwksUri: "https://your-tenant.auth0.com/.well-known/jwks.json"
      audiences:
        - "https://api.example.com"
      forwardOriginalToken: true
```

Replace `your-tenant` with your actual Auth0 tenant name and set the audience to match your Auth0 API identifier.

Apply it:

```bash
kubectl apply -f auth0-request-auth.yaml
```

## Blocking Unauthenticated Requests

By default, requests without tokens are allowed. Add an AuthorizationPolicy to require authentication:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-auth0-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
```

This denies any request that doesn't have a valid JWT with a recognized principal.

## Getting a Test Token from Auth0

To test the setup, you need a valid token. Using Auth0's client credentials flow:

```bash
curl -s -X POST https://your-tenant.auth0.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "https://api.example.com",
    "grant_type": "client_credentials"
  }' | python3 -m json.tool
```

This returns an access token. Save it:

```bash
TOKEN=$(curl -s -X POST https://your-tenant.auth0.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "https://api.example.com",
    "grant_type": "client_credentials"
  }' | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")
```

## Testing the Integration

From inside the cluster, test with and without the token:

```bash
# Without token - should be denied (403) if AuthorizationPolicy is in place
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://api-server.backend:8080/api/data

# With valid token - should succeed (200)
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://api-server.backend:8080/api/data

# With invalid token - should be rejected (401)
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid.token.here" \
  http://api-server.backend:8080/api/data
```

## Common Auth0-Specific Issues

### Trailing Slash in Issuer

Auth0 tokens have the issuer set to `https://your-tenant.auth0.com/` with a trailing slash. If your RequestAuthentication has `https://your-tenant.auth0.com` (no slash), the issuer check fails because it's an exact match.

Decode your token to check:

```bash
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Look at the `iss` field and copy it exactly into your RequestAuthentication.

### Custom Domains

If you're using a custom domain in Auth0 (like `auth.yourcompany.com` instead of `your-tenant.auth0.com`), the issuer and JWKS URI change:

```yaml
jwtRules:
  - issuer: "https://auth.yourcompany.com/"
    jwksUri: "https://auth.yourcompany.com/.well-known/jwks.json"
```

Make sure the custom domain is verified and active in your Auth0 settings.

### Audience Mismatch

Auth0 access tokens have an `aud` claim that matches the API audience. If you specify `audiences` in the RequestAuthentication, it must match the API identifier in Auth0. If you're using Auth0's Management API, the audience is `https://your-tenant.auth0.com/api/v2/`.

## Role-Based Access with Auth0

Auth0 supports custom claims through Rules or Actions. You can add roles to the token and then use Istio's AuthorizationPolicy to enforce them.

First, add a custom claim in Auth0 (via Actions > Flows > Login):

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://myapp.example.com';
  if (event.authorization) {
    api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
  }
};
```

Then in Istio, create an AuthorizationPolicy that checks the claim:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-admin
  namespace: backend
spec:
  selector:
    matchLabels:
      app: admin-api
  action: ALLOW
  rules:
    - when:
        - key: request.auth.claims[https://myapp.example.com/roles]
          values: ["admin"]
```

Note that Auth0 requires custom claims to be namespaced (prefixed with a URL) to avoid conflicts with standard JWT claims.

## Complete Setup

Here's the full configuration for a typical Auth0 + Istio setup:

```yaml
# RequestAuthentication - validate Auth0 tokens
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: auth0-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://your-tenant.auth0.com/"
      jwksUri: "https://your-tenant.auth0.com/.well-known/jwks.json"
      audiences:
        - "https://api.example.com"
      forwardOriginalToken: true
---
# AuthorizationPolicy - require valid JWT
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
---
# AuthorizationPolicy - allow health checks without JWT
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/health", "/ready"]
```

This setup validates Auth0 tokens, blocks unauthenticated requests, and allows health check endpoints without authentication.

## Debugging Auth0 Token Issues

If tokens aren't validating:

```bash
# Check proxy logs
kubectl logs deploy/api-server -n backend -c istio-proxy --tail=50 | grep -i jwt

# Check JWKS reachability
kubectl exec deploy/sleep -c sleep -- curl -s https://your-tenant.auth0.com/.well-known/jwks.json

# Decode the token and verify claims
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Verify that `iss`, `aud`, and `exp` all look correct. Auth0 integration with Istio is reliable once you get the issuer URL (with trailing slash) and audience right.
