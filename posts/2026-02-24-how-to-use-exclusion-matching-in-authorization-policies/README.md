# How to Use Exclusion Matching in Authorization Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Exclusion Matching, Security, Kubernetes

Description: How to use notPaths, notMethods, notPrincipals, and other exclusion fields in Istio authorization policies for flexible access control rules.

---

Istio's authorization policies support both positive matching (match these values) and negative matching (match everything except these values). Negative matching - also called exclusion matching - is done through the `not*` variants of the standard fields. These are incredibly useful when it's easier to specify what you want to exclude rather than listing everything you want to include.

## Available Exclusion Fields

Every matching field in an AuthorizationPolicy has a corresponding `not` variant:

### Source fields:
- `principals` / `notPrincipals`
- `namespaces` / `notNamespaces`
- `ipBlocks` / `notIpBlocks`
- `remoteIpBlocks` / `notRemoteIpBlocks`
- `requestPrincipals` / `notRequestPrincipals`

### Operation fields:
- `methods` / `notMethods`
- `paths` / `notPaths`
- `ports` / `notPorts`
- `hosts` / `notHosts`

### Condition fields:
- `values` / `notValues`

## Using notPaths

The most commonly used exclusion field. Allow access to everything except specific paths:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: protect-admin-paths
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: web-service
  action: ALLOW
  rules:
    # Anyone can access non-admin paths
    - to:
        - operation:
            notPaths:
              - "/admin/*"
              - "/internal/*"
              - "/debug/*"
    # Only admins can access admin paths
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/admin-dashboard"]
      to:
        - operation:
            paths: ["/admin/*", "/internal/*"]
```

The first rule allows access to any path that is NOT admin, internal, or debug. The second rule allows the admin dashboard to access admin and internal paths.

## Using notMethods

Allow all methods except specific dangerous ones:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-dangerous-methods
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # External traffic: all methods except DELETE
    - from:
        - source:
            namespaces: ["istio-system"]
      to:
        - operation:
            notMethods: ["DELETE"]
    # Internal traffic: all methods including DELETE
    - from:
        - source:
            namespaces: ["my-app"]
```

External traffic (coming through the ingress gateway in `istio-system`) can use any method except DELETE. Internal traffic has full access.

## Using notNamespaces

Allow traffic from everywhere except specific namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-untrusted-namespaces
  namespace: production
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            notNamespaces:
              - "sandbox"
              - "development"
              - "load-testing"
```

This is more maintainable than listing every allowed namespace when you have many namespaces and only need to block a few.

## Using notPrincipals

Allow all service accounts except specific ones:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-specific-services
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: database-proxy
  action: ALLOW
  rules:
    - from:
        - source:
            notPrincipals:
              - "cluster.local/ns/my-app/sa/untrusted-service"
              - "cluster.local/ns/my-app/sa/deprecated-service"
```

Every service account except the untrusted and deprecated ones can access the database proxy.

## Using notHosts

Allow requests to any host except specific ones:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: host-exclusion
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
    - to:
        - operation:
            hosts:
              - "internal-api.example.com"
              - "admin.example.com"
      from:
        - source:
            notIpBlocks: ["10.0.0.0/8"]
```

This denies access to internal and admin hosts from outside the private network.

## Using notPorts

Allow connections on all ports except specific ones:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-debug-port
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    # General access to all ports except debug
    - from:
        - source:
            namespaces: ["my-app"]
      to:
        - operation:
            notPorts: ["9090", "6060"]
    # Debug ports only for the ops team
    - from:
        - source:
            principals: ["cluster.local/ns/ops/sa/debugger"]
      to:
        - operation:
            ports: ["9090", "6060"]
```

## Using notValues in Conditions

Exclude specific claim values:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: exclude-by-claim
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
      when:
        # Allow all roles except guest
        - key: request.auth.claims[role]
          notValues: ["guest", "anonymous"]
        # Allow all plans except free
        - key: request.auth.claims[plan]
          notValues: ["free"]
```

Both conditions use `notValues`, so the user must NOT be a guest/anonymous AND must NOT be on the free plan.

## Combining Positive and Negative Matching

You can use both positive and negative fields in the same source or operation block. When combined, they create precise rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: precise-rules
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    # From backend namespace, but not from the batch-processor
    - from:
        - source:
            namespaces: ["backend"]
            notPrincipals: ["cluster.local/ns/backend/sa/batch-processor"]
      to:
        - operation:
            paths: ["/api/*"]
            notPaths: ["/api/admin/*"]
            methods: ["GET", "POST"]
            notMethods: ["TRACE"]
```

When both a positive and negative field are specified for the same category, both must be true. So for `from`:
- The request must be from the `backend` namespace (positive match)
- AND the request must NOT be from the batch-processor service account (negative match)

For `to`:
- The path must start with `/api/` (positive match)
- AND the path must NOT start with `/api/admin/` (negative match)
- AND the method must be GET or POST (positive match)

## Practical Example: Public API with Premium Features

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-access-tiers
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
    # Public API - open to everyone, excluding premium paths
    - to:
        - operation:
            paths: ["/api/v1/*"]
            notPaths:
              - "/api/v1/premium/*"
              - "/api/v1/analytics/*"
              - "/api/v1/export/*"
    # Premium API - requires paid subscription
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths:
              - "/api/v1/premium/*"
              - "/api/v1/analytics/*"
              - "/api/v1/export/*"
      when:
        - key: request.auth.claims[subscription]
          notValues: ["free", "trial"]
```

The first rule allows everyone access to the API except premium endpoints. The second rule requires authentication and a paid subscription for premium endpoints.

## Practical Example: Maintenance Mode

Block all write operations from external sources during maintenance:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: maintenance-mode
  namespace: production
spec:
  action: DENY
  rules:
    # Block writes from outside production
    - from:
        - source:
            notNamespaces: ["production"]
      to:
        - operation:
            notMethods: ["GET", "HEAD", "OPTIONS"]
```

During maintenance, external write traffic is blocked while reads continue to work. Internal production traffic is unaffected.

## Using notRequestPrincipals

Block unauthenticated requests to specific paths:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-unauthenticated-writes
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
      to:
        - operation:
            notMethods: ["GET", "HEAD", "OPTIONS"]
```

This denies any request that does NOT have a valid JWT (notRequestPrincipals) and is NOT a read-only method. In other words, write operations require authentication.

## Using notIpBlocks

Allow traffic from all IPs except known bad ranges:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-bad-ips
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
    - from:
        - source:
            ipBlocks:
              - "198.51.100.0/24"
              - "203.0.113.0/24"
```

Or allow only private network IPs:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: private-only
  namespace: my-app
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            notIpBlocks:
              - "0.0.0.0/0"
            ipBlocks:
              - "10.0.0.0/8"
              - "172.16.0.0/12"
              - "192.168.0.0/16"
```

## Debugging Exclusion Matching

When exclusion matching doesn't work as expected:

```bash
# Check the effective policy
istioctl analyze -n my-app

# View the Envoy RBAC configuration
istioctl proxy-config listener deploy/my-service -n my-app -o json | grep -A 50 "rbac"

# Enable debug logging
istioctl proxy-config log deploy/my-service -n my-app --level rbac:debug

# Check specific request outcomes
kubectl logs -n my-app deploy/my-service -c istio-proxy | grep "rbac"
```

Common mistakes with exclusion matching:

1. **Double negative confusion.** Using `notValues` in a DENY policy creates a double negative. "Deny requests where the role is NOT admin" means only admin is allowed. It's correct but hard to read. Consider using an ALLOW policy with positive matching instead.

2. **Wildcard behavior with not fields.** `notPaths: ["/admin/*"]` excludes `/admin/anything` but does NOT exclude `/admin` (no trailing slash/suffix).

3. **Combining positive and negative.** When both `paths` and `notPaths` are specified, the request path must match the positive pattern AND not match the negative pattern.

Exclusion matching gives you the expressiveness to handle complex access control requirements without needing dozens of explicit rules. Use it when your allow list would be impractically long, or when you need precise exceptions within broader access grants.
