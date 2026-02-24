# How to Configure Custom Conditions in Authorization Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Custom Conditions, Security, Kubernetes

Description: How to use the when field in Istio authorization policies to create custom conditions based on request headers, JWT claims, and connection attributes.

---

The `when` field in Istio's AuthorizationPolicy is where the real flexibility lives. While `from` and `to` fields cover the common cases (source identity, HTTP methods, paths), the `when` field lets you match on almost any request attribute - headers, JWT claims, source IP, destination port, and more. This opens up authorization patterns that would otherwise require application-level code.

## The When Field Structure

The `when` field takes a list of conditions. Each condition has a `key` (the attribute to check) and either `values` (allowed values) or `notValues` (disallowed values):

```yaml
when:
  - key: request.headers[x-api-key]
    values: ["valid-key-123", "valid-key-456"]
  - key: request.auth.claims[role]
    notValues: ["guest"]
```

All conditions in the `when` list are AND-ed together. The rule matches only if ALL conditions are true.

## Available Condition Keys

Here are the most useful keys you can use in `when` conditions:

### Request Attributes

```yaml
# Request headers
when:
  - key: request.headers[x-custom-header]
    values: ["expected-value"]

# Request host (same as Host header)
when:
  - key: request.headers[host]
    values: ["api.example.com"]
```

### JWT Claims

```yaml
# Top-level claims
when:
  - key: request.auth.claims[role]
    values: ["admin"]

# Nested claims
when:
  - key: request.auth.claims[org][plan]
    values: ["enterprise"]

# The issuer
when:
  - key: request.auth.claims[iss]
    values: ["https://auth.example.com"]

# The subject
when:
  - key: request.auth.claims[sub]
    values: ["user-123"]

# Array claims (matches if any element matches)
when:
  - key: request.auth.claims[groups]
    values: ["engineering"]
```

### Source Attributes

```yaml
# Source IP
when:
  - key: source.ip
    values: ["10.0.0.5"]

# Source namespace
when:
  - key: source.namespace
    values: ["frontend"]

# Source principal (SPIFFE ID)
when:
  - key: source.principal
    values: ["cluster.local/ns/backend/sa/api-service"]
```

### Destination Attributes

```yaml
# Destination port
when:
  - key: destination.port
    values: ["8080", "8443"]

# Destination IP
when:
  - key: destination.ip
    values: ["10.0.0.10"]
```

### Connection Attributes

```yaml
# Whether the connection uses mTLS
when:
  - key: connection.sni
    values: ["outbound_.8080_._.my-service.my-app.svc.cluster.local"]
```

## Header-Based Conditions

Control access based on custom request headers:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-key-check
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
      when:
        - key: request.headers[x-api-key]
          values: ["key-abc-123", "key-def-456", "key-ghi-789"]
```

Only requests with a valid API key header are allowed. This is a simple way to implement API key authentication at the mesh level.

## Combining Header and JWT Conditions

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: combined-conditions
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: premium-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        # Must have enterprise plan
        - key: request.auth.claims[plan]
          values: ["enterprise"]
        # Must have the feature flag header
        - key: request.headers[x-feature-access]
          values: ["premium-features"]
```

Both conditions must be true (AND logic). The user needs an enterprise plan in their JWT AND must send the feature access header.

## Time-Based Conditions (via Headers)

Istio doesn't have built-in time conditions, but you can implement time-based access through a middleware that sets headers:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: business-hours-only
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
        - key: request.headers[x-business-hours]
          values: ["true"]
```

A middleware or gateway plugin sets the `x-business-hours` header based on the current time before the request reaches the service.

## Conditions with notValues

Use `notValues` to match everything except specific values:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-bot-traffic
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: web-service
  action: DENY
  rules:
    - when:
        - key: request.headers[user-agent]
          values: ["bot-*", "crawler-*", "spider-*"]
```

Or allow everyone except specific claim values:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-active-users
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
        - key: request.auth.claims[status]
          notValues: ["suspended", "deactivated"]
```

## Multiple Conditions (AND Logic)

All `when` conditions in a single rule are AND-ed:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: strict-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: sensitive-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/transfer"]
      when:
        # All three conditions must be true
        - key: request.auth.claims[role]
          values: ["admin"]
        - key: request.auth.claims[mfa_verified]
          values: ["true"]
        - key: request.auth.claims[org][plan]
          values: ["enterprise"]
```

The request is only allowed if the user is an admin AND has verified MFA AND is on the enterprise plan.

## OR Logic with Multiple Rules

For OR logic, use multiple rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: flexible-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # Rule 1: Admin users
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
    # Rule 2: Users with API key
    - when:
        - key: request.headers[x-api-key]
          values: ["master-key-123"]
    # Rule 3: Internal services
    - from:
        - source:
            namespaces: ["backend"]
```

A request is allowed if it matches rule 1 OR rule 2 OR rule 3.

## Real-World Example: Feature Flags

Use JWT claims as feature flags:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: feature-gated-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # Standard features - available to everyone
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/api/v1/*"]
    # Beta features - require beta flag
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/api/beta/*"]
      when:
        - key: request.auth.claims[features]
          values: ["beta-access"]
    # Experimental features - require specific claim
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/api/experimental/*"]
      when:
        - key: request.auth.claims[features]
          values: ["experimental-access"]
        - key: request.auth.claims[org][plan]
          values: ["enterprise"]
```

## Port-Based Conditions

Use destination port to differentiate between traffic types:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: port-based-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: multi-port-service
  action: ALLOW
  rules:
    # HTTP API port - authenticated users
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: destination.port
          values: ["8080"]
    # Metrics port - monitoring only
    - from:
        - source:
            namespaces: ["monitoring"]
      when:
        - key: destination.port
          values: ["9090"]
    # Admin port - admin service account only
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/admin"]
      when:
        - key: destination.port
          values: ["8443"]
```

## Debugging Custom Conditions

When conditions aren't matching as expected:

```bash
# Check what headers the request carries
kubectl exec -n my-app deploy/sleep -- curl -v http://api-service:8080/api/data

# Check JWT claims
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .

# Enable debug logging for RBAC
istioctl proxy-config log deploy/api-service -n my-app --level rbac:debug

# Check logs for condition evaluation
kubectl logs -n my-app deploy/api-service -c istio-proxy | grep "rbac"
```

Common mistakes:
- **String matching is exact.** `request.headers[x-role]` with value `admin` won't match `Admin` or `ADMIN`.
- **Header names are lowercase.** HTTP/2 converts headers to lowercase. Use `request.headers[x-custom-header]`, not `request.headers[X-Custom-Header]`.
- **Missing requestPrincipals.** If you use `request.auth.claims` in `when` but don't include `requestPrincipals: ["*"]` in `from`, the JWT might not be processed for policy evaluation.

Custom conditions give you the flexibility to implement complex access control patterns directly in your mesh configuration, keeping your application code focused on business logic instead of security plumbing.
