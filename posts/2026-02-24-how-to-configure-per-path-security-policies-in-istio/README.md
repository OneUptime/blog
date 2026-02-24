# How to Configure Per-Path Security Policies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, AuthorizationPolicy, Path-Based, Kubernetes

Description: Apply different security policies to different API paths in Istio using AuthorizationPolicy for granular endpoint-level access control.

---

Not every endpoint in your API needs the same level of security. A public health check endpoint does not need JWT authentication. A user profile endpoint needs authentication but not admin privileges. An admin dashboard endpoint needs both authentication and admin role verification. Istio lets you define different security policies per path, so each endpoint gets exactly the protection it needs.

## The Path Matching Basics

Istio's AuthorizationPolicy supports path matching in the `to.operation.paths` field. You can match exact paths, prefixes, or use wildcards:

- `/health` - exact match
- `/api/*` - single-level wildcard (matches `/api/users` but not `/api/users/123`)
- `/api/**` - multi-level wildcard (not supported; use `/api/*` which actually matches all sub-paths in Istio)
- `/admin/*` - matches anything under `/admin/`

Note: In Istio's AuthorizationPolicy, `/api/*` actually matches all sub-paths under `/api/`, including `/api/users/123/orders`. It is equivalent to a prefix match. This differs from some other systems where `*` is single-level only.

## Prerequisites

- Kubernetes cluster with Istio
- RequestAuthentication configured for JWT validation
- Service with multiple endpoints that need different security levels

## Setting Up RequestAuthentication

First, configure JWT validation. This applies to all paths but only validates tokens if present:

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
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
```

```bash
kubectl apply -f request-authentication.yaml
```

## Public Endpoints (No Auth Required)

Allow unauthenticated access to health checks and public APIs:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: public-paths
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/health"
              - "/healthz"
              - "/ready"
              - "/public/*"
              - "/.well-known/*"
```

No `from` condition means any source is allowed. These paths are open to everyone.

## Authenticated Endpoints

Require a valid JWT for general API access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: authenticated-paths
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
            methods: ["GET"]
```

GET requests to `/api/*` require any valid JWT token but no specific role or claim.

## Write Operations with Scope Check

Require a specific scope for write operations:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: write-paths
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
            methods: ["POST", "PUT", "PATCH", "DELETE"]
      when:
        - key: request.auth.claims[scope]
          values: ["write"]
```

## Admin Endpoints with Role Requirement

Lock down admin paths to users with the admin role:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-paths
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
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[roles]
          values: ["admin"]
```

## Internal Endpoints (Mesh Traffic Only)

Some endpoints should only be callable by other mesh services, not by external users:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: internal-paths
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/backend-worker"]
      to:
        - operation:
            paths: ["/internal/*"]
```

Only the `backend-worker` service account can access `/internal/*` paths. External traffic through the ingress gateway is denied for these paths.

## The Complete Policy Set

Here is everything together. Remember that when multiple ALLOW policies exist, a request is allowed if it matches ANY of them:

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
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
---
# Public paths - no auth needed
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: public-paths
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/health", "/healthz", "/ready", "/public/*"]
---
# Authenticated read access
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: authenticated-read
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
            methods: ["GET"]
---
# Authenticated write access with scope
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: authenticated-write
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
            methods: ["POST", "PUT", "PATCH", "DELETE"]
      when:
        - key: request.auth.claims[scope]
          values: ["write"]
---
# Admin paths - admin role required
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-paths
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
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[roles]
          values: ["admin"]
---
# Internal paths - mesh services only
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: internal-paths
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/backend-worker"]
      to:
        - operation:
            paths: ["/internal/*"]
```

Any path not covered by these policies is implicitly denied (because at least one ALLOW policy exists).

## Using DENY for Path-Specific Blocks

You can also use DENY policies to block specific paths while allowing others:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-debug-paths
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: DENY
  rules:
    - to:
        - operation:
            paths: ["/debug/*", "/actuator/*", "/swagger-ui/*"]
```

This blocks access to debug, actuator, and swagger endpoints regardless of other ALLOW policies. DENY always takes precedence.

## Path Matching with notPaths

The `notPaths` field lets you match everything except certain paths:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-auth-except-public
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
      to:
        - operation:
            notPaths: ["/health", "/healthz", "/public/*"]
```

This denies unauthenticated requests to all paths except the public ones. It is a concise way to express "everything needs auth except these endpoints."

## Testing Per-Path Policies

```bash
# Public path - no auth needed
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-api.default.svc.cluster.local/health
# Expected: 200

# API read without token
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-api.default.svc.cluster.local/api/users
# Expected: 403

# API read with valid token
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://my-api.default.svc.cluster.local/api/users
# Expected: 200

# Admin path with regular user token
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $USER_TOKEN" http://my-api.default.svc.cluster.local/admin/settings
# Expected: 403

# Admin path with admin token
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" http://my-api.default.svc.cluster.local/admin/settings
# Expected: 200
```

## Debugging Path Policies

```bash
# List all policies affecting the workload
kubectl get authorizationpolicies -n default

# Check RBAC decisions in proxy logs
istioctl proxy-config log deploy/my-api -n default --level rbac:debug
kubectl logs deploy/my-api -n default -c istio-proxy | grep "rbac"

# Analyze configuration
istioctl analyze -n default
```

## Summary

Per-path security policies in Istio let you apply the right level of security to each endpoint. Public paths stay open, standard API paths require authentication, sensitive paths require specific claims, and internal paths are restricted to mesh services. Layer your ALLOW and DENY policies carefully, test each path independently, and use the implicit deny behavior (triggered by having at least one ALLOW policy) to block any paths you did not explicitly open.
