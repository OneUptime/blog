# How to Set Up Path-Based Authorization in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Path Matching, Security, Kubernetes, API

Description: How to use path-based rules in Istio authorization policies to control access to specific API endpoints, admin panels, and sensitive resources.

---

Path-based authorization lets you apply different access rules to different parts of your API. Public endpoints like `/api/products` might be open to everyone, while `/admin/settings` should only be accessible to admin services. Istio's AuthorizationPolicy supports exact path matching, prefix matching, suffix matching, and wildcard patterns that make this kind of fine-grained control practical.

## Path Matching Basics

Istio supports several path matching patterns in the `paths` field of an AuthorizationPolicy:

| Pattern | Matches | Example |
|---------|---------|---------|
| `/api/users` | Exact match only | `/api/users` (not `/api/users/`) |
| `/api/*` | Single-level wildcard | `/api/users`, `/api/orders` |
| `/api/users/*` | Anything under /api/users/ | `/api/users/123`, `/api/users/search` |
| `*/info` | Suffix match | `/api/users/info`, `/health/info` |

The `*` character is a wildcard that matches any string. When used at the end (`/api/*`), it matches any suffix. When used at the beginning (`*/health`), it matches any prefix.

## Basic Path-Based Policy

Protect admin endpoints while leaving public endpoints open:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: path-based-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: web-app
  action: ALLOW
  rules:
    # Public paths - no restrictions
    - to:
        - operation:
            paths:
              - "/api/products*"
              - "/api/categories*"
              - "/health*"
    # Admin paths - only admin service account
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/admin-dashboard"]
      to:
        - operation:
            paths: ["/admin/*"]
    # User paths - require authentication
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/api/users/*", "/api/orders/*"]
```

## Exact Path Matching

For precise control, use exact paths without wildcards:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: exact-path-policy
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/healthz"
              - "/ready"
              - "/metrics"
```

This only matches these three exact paths. `/healthz/live` would NOT match `/healthz` because there's no wildcard.

Be aware that `/api/users` and `/api/users/` (with trailing slash) are different paths. If your application handles both, include both in your policy:

```yaml
paths:
  - "/api/users"
  - "/api/users/"
  - "/api/users/*"
```

## Prefix Path Matching

Wildcard at the end creates prefix matching:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: prefix-match
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/frontend"]
      to:
        - operation:
            paths:
              - "/api/v1/*"
              - "/api/v2/*"
```

`/api/v1/*` matches `/api/v1/users`, `/api/v1/users/123`, `/api/v1/orders/pending`, and any other path starting with `/api/v1/`.

## Using notPaths for Exclusion

The `notPaths` field is incredibly useful. It matches everything except the specified paths:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: auth-except-public
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # Public paths - no auth needed
    - to:
        - operation:
            paths:
              - "/health*"
              - "/api/public/*"
    # Everything else requires JWT
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            notPaths:
              - "/health*"
              - "/api/public/*"
```

## Blocking Specific Paths with DENY

Use DENY policies to block access to sensitive paths regardless of other policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-sensitive-paths
  namespace: my-app
spec:
  action: DENY
  rules:
    - to:
        - operation:
            paths:
              - "/env"
              - "/.env"
              - "/.git/*"
              - "/wp-admin*"
              - "/phpMyAdmin*"
              - "/actuator/*"
              - "/debug/*"
              - "/swagger-ui*"
              - "/api-docs*"
```

This namespace-wide DENY policy blocks common attack paths. Since DENY is evaluated before ALLOW, these paths are always blocked.

## Versioned API Access Control

When your API has multiple versions, path-based policies let you manage access per version:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-version-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
    # v1 API - open to all mesh services
    - from:
        - source:
            namespaces: ["my-app", "frontend"]
      to:
        - operation:
            paths: ["/api/v1/*"]
    # v2 API - only for updated clients
    - from:
        - source:
            principals:
              - "cluster.local/ns/frontend/sa/web-v2"
              - "cluster.local/ns/frontend/sa/mobile-v2"
      to:
        - operation:
            paths: ["/api/v2/*"]
    # v3 API - beta, only internal
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/beta-tester"]
      to:
        - operation:
            paths: ["/api/v3/*"]
```

## Resource-Level Authorization

Path patterns can match REST resource patterns for resource-level authorization:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: resource-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    # List orders
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/frontend"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/orders"]
    # Get specific order
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/frontend"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/orders/*"]
    # Create order
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/frontend"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/orders"]
    # Update order status (only from payment service)
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/payment-service"]
      to:
        - operation:
            methods: ["PATCH"]
            paths: ["/api/orders/*/status"]
```

## Path Normalization

Istio normalizes paths before matching. This handles common path manipulation attacks:

- Double slashes (`//api//users`) are collapsed to single slashes (`/api/users`)
- Dot segments (`/api/./users`) are resolved
- URL-encoded characters are decoded

This normalization is enabled by default and protects against path traversal attempts. You can verify the normalization settings:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A 5 pathNormalization
```

The default normalization mode is `BASE` which handles the most common cases. For stricter normalization, you can set it to `MERGE_SLASHES` or `DECODE_AND_MERGE_SLASHES` in the mesh config.

## gRPC Path Patterns

For gRPC services, paths follow the `/<package.Service>/<Method>` pattern:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: grpc-path-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: grpc-service
  action: ALLOW
  rules:
    # Allow all methods on UserService
    - from:
        - source:
            namespaces: ["my-app"]
      to:
        - operation:
            paths: ["/myapp.UserService/*"]
    # Only admin can call AdminService
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/admin"]
      to:
        - operation:
            paths: ["/myapp.AdminService/*"]
```

## Testing Path-Based Policies

```bash
# Test public path
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://api-service:8080/api/products

# Test protected path without auth
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://api-service:8080/admin/settings

# Test with path traversal attempt (should be normalized)
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://api-service:8080/api/../admin/settings

# Verify multiple paths
for path in /healthz /api/products /api/users/me /admin/settings /debug/pprof; do
  code=$(kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://api-service:8080$path)
  echo "$path: $code"
done
```

## Common Mistakes

1. **Forgetting the trailing wildcard.** `/api/users` only matches exactly `/api/users`. You probably also want `/api/users/*` to match sub-resources.

2. **Path case sensitivity.** Istio path matching is case-sensitive. `/Api/Users` and `/api/users` are different paths.

3. **Query string handling.** Istio matches on the path only, not the query string. `/api/users?role=admin` matches the path `/api/users`.

4. **Trailing slash mismatch.** `/api/users` and `/api/users/` are different paths. Some web frameworks treat them as the same, but Istio does not.

Path-based authorization is the workhorse of API security in Istio. It maps directly to how you think about your API surface and gives you granular control over who can access what. Start with broad policies and refine them as you understand your traffic patterns better.
