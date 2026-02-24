# How to Set Up JWT-Based Authorization in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Authorization, RBAC, Security, Kubernetes

Description: End-to-end guide to implementing JWT-based authorization in Istio, combining RequestAuthentication with AuthorizationPolicy for user-level access control.

---

JWT-based authorization in Istio lets you control who can access your services based on the contents of their JWT token. Instead of just validating that a token is present and signed correctly, you can make access decisions based on the user's role, permissions, tenant, or any other claim embedded in the token. This moves access control from your application code to the infrastructure layer.

## The Two-Step Setup

JWT-based authorization in Istio requires two resources working together:

1. **RequestAuthentication** - Validates the JWT token (signature, issuer, expiration)
2. **AuthorizationPolicy** - Makes access decisions based on the validated token's claims

You need both. RequestAuthentication without AuthorizationPolicy only validates tokens that happen to be present - it doesn't reject unauthenticated requests. AuthorizationPolicy without RequestAuthentication can't access JWT claims because no token processing happens.

## Step 1: Configure RequestAuthentication

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "my-api"
      forwardOriginalToken: true
```

The `forwardOriginalToken: true` passes the original JWT to your application, which is useful if your app also needs to read the token.

## Step 2: Require Authentication

The simplest authorization is requiring any valid token:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
```

`requestPrincipals: ["*"]` matches any request that has a valid JWT. The principal value is `<issuer>/<subject>` from the token. Requests without tokens or with invalid tokens get 403.

## Step 3: Add Claim-Based Rules

Now the interesting part - making access decisions based on what's in the token.

A token might look like this:

```json
{
  "iss": "https://auth.example.com",
  "sub": "user-456",
  "role": "editor",
  "department": "engineering",
  "permissions": ["read", "write"],
  "subscription": "pro"
}
```

Here's how to build role-based access using these claims:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: role-based-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # Anyone authenticated can read
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["GET"]
    # Writers can create and update
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["POST", "PUT", "PATCH"]
      when:
        - key: request.auth.claims[role]
          values: ["editor", "admin"]
    # Only admins can delete
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["DELETE"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

## Matching Specific Principals

You can match specific issuer/subject combinations:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: specific-principal
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: admin-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals:
              - "https://auth.example.com/admin-user-1"
              - "https://auth.example.com/admin-user-2"
```

The format is `issuer/subject`. Only tokens with these specific issuer and subject combinations are allowed.

## Permission-Based Access

Use array claims like permissions:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: permission-based
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # Read endpoints
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/resources/*"]
      when:
        - key: request.auth.claims[permissions]
          values: ["read", "admin"]
    # Write endpoints
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["POST", "PUT", "DELETE"]
            paths: ["/api/resources/*"]
      when:
        - key: request.auth.claims[permissions]
          values: ["write", "admin"]
```

Since `permissions` is an array in the JWT, Istio checks if any element matches any of the specified values.

## Multi-Tenant Authorization

Combine tenant claims with role claims for multi-tenant scenarios:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: tenant-auth
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[tenant_id]
          values: ["tenant-a"]
```

Users can only access the namespace that matches their tenant claim. Apply a similar policy to each tenant namespace.

## Combining JWT and Service Identity

In practice, you often need to allow both service-to-service traffic (using mTLS identity) and end-user traffic (using JWT):

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: combined-auth
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    # Internal service-to-service traffic
    - from:
        - source:
            principals:
              - "cluster.local/ns/my-app/sa/api-gateway"
              - "cluster.local/ns/my-app/sa/payment-service"
    # End-user traffic through the gateway with JWT
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[scope]
          values: ["orders:read", "orders:write"]
```

The first rule handles service-to-service calls using mTLS identity. The second rule handles end-user requests that carry a JWT with the right scope.

## Denying Based on JWT Claims

Use DENY policies to block specific claim values:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-suspended
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: DENY
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[status]
          values: ["suspended", "banned"]
```

This blocks users whose token has a `status` claim of "suspended" or "banned", regardless of what ALLOW policies exist.

## Health Checks and Public Endpoints

Don't forget to exclude health checks and public endpoints from JWT requirements:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: public-and-health
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # Health checks - no auth
    - to:
        - operation:
            paths: ["/healthz", "/ready"]
    # Public endpoints - no auth
    - to:
        - operation:
            methods: ["GET"]
            paths: ["/api/public/*"]
    # Protected endpoints - JWT required
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/api/*"]
            notPaths: ["/api/public/*"]
```

## Testing JWT Authorization

```bash
# Get a test token
TOKEN=$(curl -s -X POST https://auth.example.com/oauth/token \
  -d 'grant_type=client_credentials&client_id=test&client_secret=secret' | jq -r .access_token)

# Test without token (should get 403)
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://api-service:8080/api/data

# Test with token (should get 200)
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://api-service:8080/api/data

# Decode token to verify claims
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

## Debugging JWT Authorization

```bash
# Check if RequestAuthentication is applied
kubectl get requestauthentication -n my-app

# Check if AuthorizationPolicy is applied
kubectl get authorizationpolicy -n my-app

# Look at Envoy logs for JWT and RBAC decisions
kubectl logs -n my-app deploy/api-service -c istio-proxy | grep -E "jwt|rbac"

# Verify Envoy config
istioctl proxy-config listener deploy/api-service -n my-app -o json | grep -c jwt_authn

# Analyze configuration
istioctl analyze -n my-app
```

Common issues:
- **Token not being processed:** Check that the `issuer` in RequestAuthentication exactly matches the `iss` claim in the token
- **Claims not matching:** Verify the claim path syntax - it's `request.auth.claims[key]` with square brackets
- **403 on all requests:** Make sure you have both RequestAuthentication AND AuthorizationPolicy, and that health check paths are excluded

JWT-based authorization in Istio gives you a clean separation between authentication (who are you?) and authorization (what can you do?). The mesh handles both, and your application just processes requests that have already been verified and authorized.
