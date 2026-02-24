# How to Configure Custom JWT Claims Validation in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Claims, Authorization, Security, Kubernetes

Description: How to validate custom JWT claims like roles, groups, and tenant IDs in Istio using RequestAuthentication and AuthorizationPolicy resources.

---

Standard JWT validation in Istio checks the signature, issuer, audience, and expiration. But most real applications need more than that. You need to validate that the user has the right role, belongs to the correct tenant, or has specific permissions encoded as custom claims in the token.

Istio supports custom claims validation through the `when` conditions in AuthorizationPolicy. This post shows you how to use it effectively.

## Understanding JWT Claims Structure

A typical JWT payload with custom claims looks like this:

```json
{
  "iss": "https://auth.example.com",
  "sub": "user-123",
  "aud": "my-api",
  "exp": 1708800000,
  "iat": 1708796400,
  "role": "admin",
  "groups": ["engineering", "platform-team"],
  "tenant_id": "acme-corp",
  "permissions": ["read:users", "write:users"],
  "org": {
    "id": "org-456",
    "plan": "enterprise"
  }
}
```

Istio can access any of these claims in AuthorizationPolicy conditions using the `request.auth.claims` attribute.

## Validating a Simple String Claim

The most common case is checking a role or group claim. Here's how to allow access only to users with the "admin" role:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: admin-service
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-only
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: admin-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

The `request.auth.claims[role]` syntax accesses the `role` field from the JWT payload. The request is only allowed if the claim value matches one of the listed values.

## Validating Array Claims

JWT tokens often have array claims like `groups` or `permissions`. Istio handles these correctly - if the claim is an array, the condition matches if any element in the array matches any of the specified values:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: engineering-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: internal-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[groups]
          values: ["engineering", "platform-team", "sre"]
```

If the user's token has `"groups": ["engineering", "sales"]`, this matches because "engineering" is in both the token's array and the policy's values list.

## Validating Nested Claims

For nested objects in the JWT payload, use dot notation to access nested fields:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: enterprise-only
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
        - key: request.auth.claims[org][plan]
          values: ["enterprise", "business"]
```

This accesses `token.org.plan` and checks if it's either "enterprise" or "business".

## Combining Multiple Claims

You can require multiple claims to all be valid by listing multiple `when` conditions. All conditions must be true (AND logic):

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-in-acme
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: tenant-admin
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
        - key: request.auth.claims[tenant_id]
          values: ["acme-corp"]
```

This requires the user to have BOTH `role: admin` AND `tenant_id: acme-corp`. If either condition fails, the request is denied.

## OR Logic with Multiple Rules

If you need OR logic (allow admin role OR engineering group), use multiple rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-or-engineering
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    # Rule 1: admin role
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
    # Rule 2: engineering group
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[groups]
          values: ["engineering"]
```

Rules are OR-ed together. Within each rule, conditions are AND-ed.

## Using notValues for Exclusion

You can also use `notValues` to deny access based on specific claim values:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-free-tier
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: premium-feature
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[org][plan]
          notValues: ["free", "trial"]
```

This allows access to anyone whose org plan is NOT "free" or "trial".

## Multi-Tenant Access Control

A common pattern in SaaS applications is restricting access based on tenant ID. Here's a setup where different tenant services can only be accessed by users belonging to that tenant:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: tenant-isolation-acme
  namespace: tenant-acme
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[tenant_id]
          values: ["acme-corp"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: tenant-isolation-globex
  namespace: tenant-globex
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[tenant_id]
          values: ["globex-inc"]
```

Each tenant namespace has its own policy that only allows tokens with the matching tenant ID.

## Role-Based Access Control Pattern

Here's a complete RBAC setup using JWT claims across multiple services:

```yaml
# Viewer access - read-only endpoints
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: viewer-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/*"]
      when:
        - key: request.auth.claims[role]
          values: ["viewer", "editor", "admin"]
---
# Editor access - read and write
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: editor-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["POST", "PUT", "PATCH"]
            paths: ["/api/*"]
      when:
        - key: request.auth.claims[role]
          values: ["editor", "admin"]
---
# Admin access - everything including delete
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["DELETE"]
            paths: ["/api/*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

## Validating the Issuer-Subject Combination

The `requestPrincipals` field is actually the combination of `issuer/subject` from the JWT. You can use this for fine-grained source identity:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: specific-user-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals:
              - "https://auth.example.com/service-account-backend"
              - "https://auth.example.com/service-account-worker"
```

## Debugging Claims Validation

When claims validation isn't working as expected, decode the token and verify the claim structure:

```bash
# Decode the JWT payload
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .

# Check what Envoy sees
kubectl logs deploy/my-service -c istio-proxy -n my-app | grep -i "rbac\|denied\|jwt"

# Verify the policy is applied
istioctl analyze -n my-app
```

Common mistakes with claims validation:

1. **String vs number types** - If your claim is a number (`"tenant_id": 42`), but your policy specifies it as a string `"42"`, it won't match. Istio treats all values as strings in the policy, but the JWT claim types matter.

2. **Claim path errors** - `request.auth.claims[groups]` is correct. `request.auth.claims.groups` is not the right syntax for AuthorizationPolicy conditions.

3. **Missing requestPrincipals** - If you have `when` conditions but forget to include `requestPrincipals: ["*"]` in the `from` source, the condition might not work as expected because the JWT might not be processed.

Custom claims validation in Istio is a powerful way to build fine-grained access control without adding authentication logic to your application code. The mesh handles it all at the proxy level, and your services just receive pre-validated, pre-authorized requests.
