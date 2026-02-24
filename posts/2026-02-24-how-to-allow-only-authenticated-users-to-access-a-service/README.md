# How to Allow Only Authenticated Users to Access a Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authentication, JWT, RequestAuthentication, Security, Kubernetes

Description: Enforce user authentication on Istio services using RequestAuthentication and AuthorizationPolicy with JWT token validation.

---

If you have a service that should only be accessible to authenticated users, Istio can enforce this at the mesh level. Instead of every service implementing its own JWT validation logic, you configure Istio to validate tokens before the request even reaches your application. Unauthenticated requests get rejected at the sidecar proxy, which is both more secure and more efficient.

## How It Works

Istio provides two resources for this:

1. **RequestAuthentication** defines which JWT issuers are trusted and how to validate tokens
2. **AuthorizationPolicy** enforces that requests must have valid authentication

RequestAuthentication on its own does not block requests. It only validates tokens if they are present. To actually require authentication, you need an AuthorizationPolicy that denies requests without valid tokens.

## Prerequisites

- Kubernetes cluster with Istio installed
- A JWT token issuer (like Auth0, Keycloak, Google, or your own identity provider)
- The JWKS (JSON Web Key Set) URI for your issuer
- Sidecar injection enabled

## Step 1: Configure RequestAuthentication

This tells Istio how to validate JWT tokens:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  jwtRules:
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
    - issuer: "https://your-auth0-domain.auth0.com/"
      jwksUri: "https://your-auth0-domain.auth0.com/.well-known/jwks.json"
```

This configuration applies to pods with the label `app: my-api`. It trusts tokens from Google and Auth0. The `jwksUri` is used to fetch the public keys for token verification.

```bash
kubectl apply -f request-authentication.yaml
```

## Step 2: Require Authentication with AuthorizationPolicy

Now enforce that requests must be authenticated:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
```

This denies requests that do not have a valid request principal. A request principal is set when a valid JWT token is present and validated. So requests without a token or with an invalid token get a 403 response.

```bash
kubectl apply -f authorization-policy.yaml
```

## Alternative: ALLOW-Based Policy

Instead of a DENY rule with `notRequestPrincipals`, you can use an ALLOW rule with `requestPrincipals`:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
```

This only allows requests that have any valid request principal. The effect is the same: unauthenticated requests are blocked.

## Allowing Unauthenticated Health Checks

You probably want health check endpoints to work without authentication. Kubernetes liveness and readiness probes should not need a JWT token:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/health", "/healthz", "/ready", "/metrics"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt-for-api
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/api/*"]
```

The first policy allows unauthenticated access to health endpoints. The second requires JWT authentication for API paths. Since there are ALLOW policies, any path not covered by either policy is implicitly denied.

## Custom Token Location

By default, Istio looks for JWT tokens in the `Authorization` header with the `Bearer` prefix. If your token is in a different header or a query parameter, specify the location:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  jwtRules:
    - issuer: "https://your-issuer.com"
      jwksUri: "https://your-issuer.com/.well-known/jwks.json"
      fromHeaders:
        - name: x-custom-auth
          prefix: "Token "
      fromParams:
        - "access_token"
```

This checks for tokens in the `x-custom-auth` header (with "Token " prefix) and in the `access_token` query parameter.

## Multiple Issuers

If you need to support multiple identity providers:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth-multi
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  jwtRules:
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
      forwardOriginalToken: true
    - issuer: "https://login.microsoftonline.com/{tenant-id}/v2.0"
      jwksUri: "https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys"
      forwardOriginalToken: true
    - issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx"
      jwksUri: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx/.well-known/jwks.json"
      forwardOriginalToken: true
```

A token from any of these issuers is accepted. The `forwardOriginalToken: true` ensures the original token is passed to the upstream service (in case it needs it for further processing).

## Token Audience Validation

You can also validate the token's audience claim:

```yaml
jwtRules:
  - issuer: "https://your-issuer.com"
    jwksUri: "https://your-issuer.com/.well-known/jwks.json"
    audiences:
      - "my-api-client-id"
      - "my-api-service-account"
```

If the token's `aud` claim does not match any of the listed audiences, the token is rejected.

## Testing

Generate a valid JWT token from your issuer and test:

```bash
# With a valid token (should succeed)
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://my-api.default.svc.cluster.local/api/data
# Expected: 200

# Without a token (should fail)
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-api.default.svc.cluster.local/api/data
# Expected: 403

# With an invalid token (should fail)
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer invalid-token" http://my-api.default.svc.cluster.local/api/data
# Expected: 401
```

Note the different status codes: 401 for invalid tokens (authentication failure) and 403 for missing tokens (authorization failure).

## Debugging Token Issues

If valid tokens are being rejected:

```bash
# Check if the RequestAuthentication is applied
kubectl get requestauthentication -n default

# Check the proxy config
istioctl proxy-config listener deploy/my-api -n default

# Enable debug logging
istioctl proxy-config log deploy/my-api -n default --level jwt:debug

# Watch for JWT-related log entries
kubectl logs deploy/my-api -n default -c istio-proxy -f | grep "jwt"
```

Common issues include:

- **Clock skew.** JWT tokens have `exp` and `nbf` claims that are time-sensitive. If your cluster's clock is off, valid tokens might be rejected.
- **JWKS fetch failure.** If the sidecar cannot reach the JWKS URI (network policy, DNS issue), it cannot validate tokens.
- **Wrong issuer.** The `iss` claim in the token must exactly match the `issuer` field in the RequestAuthentication.

## JWKS Caching

Istio caches the JWKS keys to avoid fetching them on every request. The cache TTL defaults to 20 minutes. If you rotate signing keys, there can be a window where new tokens signed with the new key are rejected. Plan key rotations accordingly.

## Summary

Requiring user authentication in Istio is a two-step process: RequestAuthentication defines which tokens are valid, and AuthorizationPolicy enforces that tokens must be present. This approach centralizes authentication at the mesh level, removes the need for each service to implement its own token validation, and provides consistent security across your entire service mesh. Always exclude health check paths from authentication requirements, and test with both valid and invalid tokens to verify your configuration.
