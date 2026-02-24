# How to Configure JWT Authentication per Route in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Per-Route Authentication, AuthorizationPolicy, VirtualService

Description: How to apply different JWT authentication requirements to different routes in Istio using AuthorizationPolicy path matching and VirtualService integration.

---

Not every route in your application needs the same authentication. Public endpoints like health checks and documentation should be accessible without tokens. User-facing API endpoints need user JWTs. Admin endpoints need admin tokens with specific claims. Istio lets you define all of this at the mesh level using a combination of RequestAuthentication and path-based AuthorizationPolicies.

## The Approach

Istio doesn't have a built-in "per-route JWT" field. Instead, you achieve per-route authentication by:

1. Setting up RequestAuthentication to validate tokens (all routes, all issuers).
2. Using AuthorizationPolicy with path matching to enforce different requirements per route.

The RequestAuthentication says "how to validate tokens." The AuthorizationPolicy says "which routes require them and with what claims."

## Basic Per-Route Setup

Here's a setup with three categories of routes:

```yaml
# Step 1: Configure token validation (applies globally)
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "api.example.com"
      forwardOriginalToken: true
```

```yaml
# Step 2: Allow public routes without any token
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-public
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/health"
              - "/ready"
              - "/docs/*"
              - "/public/*"
```

```yaml
# Step 3: Require JWT for API routes
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt-api
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
      to:
        - operation:
            paths: ["/api/*"]
```

```yaml
# Step 4: Require admin role for admin routes
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-admin-role
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
    - to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[role]
          notValues: ["admin"]
```

## Path Matching Patterns

AuthorizationPolicy supports several path matching patterns:

| Pattern | Matches |
|---------|---------|
| `/api/users` | Exact path `/api/users` |
| `/api/*` | Single segment: `/api/users`, `/api/orders`, but NOT `/api/users/123` |
| `/api/**` | Not supported - use `/api/*` which matches any path starting with `/api/` in Istio |
| `/api/v1/*` | Paths like `/api/v1/users`, `/api/v1/orders` |

Wait, there's a nuance. In Istio's AuthorizationPolicy, the `*` at the end of a path matches any suffix, including paths with multiple segments. So `/api/*` actually matches `/api/users`, `/api/users/123`, and `/api/users/123/orders`. It behaves like a prefix match when at the end.

```yaml
# This matches everything under /api/
paths: ["/api/*"]
# Matches: /api/users, /api/users/123, /api/anything/else
```

## Method-Specific Authentication

Different HTTP methods can have different requirements:

```yaml
# GET requests to /api/* are public (read-only, no JWT needed)
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-public-reads
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
            methods: ["GET", "HEAD", "OPTIONS"]
---
# Write operations require JWT
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt-writes
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
      to:
        - operation:
            paths: ["/api/*"]
            methods: ["POST", "PUT", "DELETE", "PATCH"]
```

## Provider-Specific Routes

Different routes might accept tokens from different providers:

```yaml
# Configure multiple token issuers
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: multi-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
    - issuer: "https://partner-auth.example.com"
      jwksUri: "https://partner-auth.example.com/.well-known/jwks.json"
---
# User routes: only accept tokens from main auth provider
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: user-routes
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://auth.example.com/*"]
      to:
        - operation:
            paths: ["/api/users/*"]
---
# Partner routes: only accept tokens from partner auth provider
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: partner-routes
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://partner-auth.example.com/*"]
      to:
        - operation:
            paths: ["/api/partners/*"]
```

## Host-Based Route Authentication

If your service handles multiple hostnames (via VirtualService), you can differentiate by host:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-host-auth
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
      to:
        - operation:
            hosts: ["api.example.com"]
            paths: ["/api/*"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: internal-host-no-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - to:
        - operation:
            hosts: ["internal.example.com"]
```

This requires JWT for `api.example.com/api/*` but allows all traffic to `internal.example.com` without authentication.

## Real-World Example: E-Commerce API

Here's a complete setup for an e-commerce API with different auth requirements per route:

```yaml
# Token validation
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: ecommerce-jwt
  namespace: store
spec:
  selector:
    matchLabels:
      app: store-api
  jwtRules:
    - issuer: "https://auth.mystore.com"
      jwksUri: "https://auth.mystore.com/.well-known/jwks.json"
      audiences:
        - "store-api"
      forwardOriginalToken: true
---
# Public routes: product catalog, search, health
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: public-routes
  namespace: store
spec:
  selector:
    matchLabels:
      app: store-api
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/health"
              - "/api/products/*"
              - "/api/categories/*"
              - "/api/search"
            methods: ["GET"]
---
# Authenticated routes: cart, orders, profile
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: authenticated-routes
  namespace: store
spec:
  selector:
    matchLabels:
      app: store-api
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths:
              - "/api/cart/*"
              - "/api/orders/*"
              - "/api/profile/*"
---
# Admin routes: require admin role
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-routes
  namespace: store
spec:
  selector:
    matchLabels:
      app: store-api
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
---
# Deny everything else (catch-all)
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-default
  namespace: store
spec:
  selector:
    matchLabels:
      app: store-api
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
      to:
        - operation:
            notPaths:
              - "/health"
              - "/api/products/*"
              - "/api/categories/*"
              - "/api/search"
```

## Testing Per-Route Auth

```bash
# Public route - no token needed (200)
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://store-api.store:8080/api/products/123

# Cart without token - denied (403)
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://store-api.store:8080/api/cart/items

# Cart with user token - allowed (200)
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $USER_TOKEN" \
  http://store-api.store:8080/api/cart/items

# Admin without admin role - denied (403)
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $USER_TOKEN" \
  http://store-api.store:8080/admin/dashboard

# Admin with admin role - allowed (200)
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://store-api.store:8080/admin/dashboard
```

## Policy Evaluation Order

When multiple AuthorizationPolicies apply to the same workload, Istio evaluates them in this order:

1. **DENY** policies are checked first. If any DENY rule matches, the request is denied (403).
2. **ALLOW** policies are checked next. If any ALLOW rule matches, the request is allowed.
3. If there are ALLOW policies but none match, the request is denied (403).
4. If there are no ALLOW or DENY policies, the request is allowed.

Understanding this order is essential for per-route auth. Put your public route ALLOW rules and your DENY rules together, and the combination creates the per-route behavior you want.

## Debugging Per-Route Auth

```bash
# Enable RBAC debug logging
istioctl proxy-config log <pod> -n store --level rbac:debug

# Make a request and check logs
kubectl logs <pod> -c istio-proxy --tail=50 | grep rbac

# Check which policies apply
kubectl get authorizationpolicy -n store
```

Per-route JWT authentication in Istio is all about combining RequestAuthentication with well-crafted AuthorizationPolicies. Use path matching, method matching, and claim checks to build the exact access control model your API needs. Test each route category independently, and keep the policy evaluation order in mind when debugging unexpected 403s.
