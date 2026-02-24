# How to Restrict API Access by JWT Claim in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Authorization, Claims, Security, Kubernetes

Description: Enforce fine-grained API access control based on JWT token claims like roles, scopes, and groups using Istio AuthorizationPolicy.

---

Validating that a user has a valid JWT token is just the first step. The real power comes from making authorization decisions based on what is inside the token. JWT claims carry information like user roles, permissions, group memberships, and scopes. Istio lets you write AuthorizationPolicy rules that check these claims, giving you fine-grained access control without writing any application code.

## JWT Claims Quick Recap

A decoded JWT payload might look like this:

```json
{
  "sub": "user-123",
  "iss": "https://auth.example.com",
  "aud": "my-api",
  "exp": 1740000000,
  "roles": ["admin", "editor"],
  "scope": "read write",
  "groups": ["engineering", "platform-team"],
  "email": "user@example.com",
  "plan": "enterprise"
}
```

With Istio, you can write rules like "only allow users with the admin role to access the /admin path" or "only allow users in the engineering group to access internal APIs."

## Prerequisites

- Kubernetes cluster with Istio
- RequestAuthentication configured (see the authentication post)
- A JWT issuer that includes custom claims in tokens

## Setting Up RequestAuthentication

First, configure token validation:

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
      outputClaimToHeaders:
        - header: x-jwt-sub
          claim: sub
        - header: x-jwt-email
          claim: email
```

The `outputClaimToHeaders` field extracts specific claims and puts them into request headers. This is useful if your application needs the claims but does not want to parse the token itself.

```bash
kubectl apply -f request-authentication.yaml
```

## Restricting by Role Claim

To allow only users with the "admin" role to access admin endpoints:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-only
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

The `when` condition checks the `roles` claim in the JWT. If the token has `"roles": ["admin", "editor"]`, this condition is satisfied because "admin" is in the array.

```bash
kubectl apply -f admin-policy.yaml
```

## Restricting by Group Claim

Allow only members of the engineering group to access internal APIs:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: engineering-only
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
            paths: ["/internal/*"]
      when:
        - key: request.auth.claims[groups]
          values: ["engineering"]
```

## Restricting by Scope

OAuth2 scopes are commonly used to limit what an access token can do. Restrict based on scope:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: write-scope-required
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
            methods: ["POST", "PUT", "DELETE"]
      when:
        - key: request.auth.claims[scope]
          values: ["write"]
```

Write operations (POST, PUT, DELETE) require the "write" scope in the token.

## Multiple Claims Conditions

You can combine multiple claim conditions. All conditions must be met (AND logic):

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: enterprise-admin
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
            paths: ["/enterprise/*"]
      when:
        - key: request.auth.claims[plan]
          values: ["enterprise"]
        - key: request.auth.claims[roles]
          values: ["admin"]
```

This requires both an enterprise plan AND admin role.

## Nested Claims

For nested claims like `realm_access.roles` (common in Keycloak), use bracket notation:

```yaml
when:
  - key: request.auth.claims[realm_access][roles]
    values: ["admin"]
```

This accesses the `roles` field inside the `realm_access` object in the JWT payload.

## Complete Multi-Tier Access Control

Here is a realistic example with multiple access tiers:

```yaml
# Allow public endpoints without authentication
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: public-endpoints
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/health", "/healthz", "/public/*"]
---
# Allow any authenticated user to access basic API
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: authenticated-api
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
            paths: ["/api/v1/*"]
            methods: ["GET"]
---
# Allow users with write scope to modify data
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: write-access
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
            paths: ["/api/v1/*"]
            methods: ["POST", "PUT", "PATCH", "DELETE"]
      when:
        - key: request.auth.claims[scope]
          values: ["write"]
---
# Allow only admins to access admin endpoints
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-access
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

With these four policies applied to the same workload, Istio creates a layered access model:
- `/health`, `/public/*` - anyone can access
- `GET /api/v1/*` - any authenticated user
- `POST/PUT/DELETE /api/v1/*` - authenticated users with write scope
- `/admin/*` - authenticated users with admin role
- Everything else - denied

## Denying Specific Claims

You can also use DENY policies to block specific claim values. For example, block suspended users:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-suspended
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: DENY
  rules:
    - when:
        - key: request.auth.claims[status]
          values: ["suspended"]
```

DENY policies are evaluated before ALLOW policies, so a suspended user is blocked regardless of what other policies allow.

## Testing

Create test tokens with different claims and verify access:

```bash
# Admin token
ADMIN_TOKEN="eyJ..."  # Token with roles: ["admin"]
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" http://my-api.default.svc.cluster.local/admin/dashboard
# Expected: 200

# Regular user token
USER_TOKEN="eyJ..."  # Token without admin role
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $USER_TOKEN" http://my-api.default.svc.cluster.local/admin/dashboard
# Expected: 403

# Token with write scope
WRITE_TOKEN="eyJ..."  # Token with scope: "read write"
kubectl exec deploy/sleep -c sleep -- curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $WRITE_TOKEN" http://my-api.default.svc.cluster.local/api/v1/items
# Expected: 200
```

## Debugging Claim-Based Policies

When claims do not match as expected:

```bash
# Decode the JWT to verify claims
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .

# Check what Istio sees
istioctl proxy-config log deploy/my-api -n default --level rbac:debug
kubectl logs deploy/my-api -n default -c istio-proxy | grep "rbac"
```

Common issues:
- **Claim name mismatch.** The claim key is case-sensitive. `Roles` is not the same as `roles`.
- **String vs. array claims.** If the scope claim is a space-separated string (`"scope": "read write"`) rather than an array, the matching behavior may differ. Istio splits space-separated strings when matching.
- **Issuer prefix.** The request principal format is `issuer/subject`. Make sure your policy accounts for this if using `requestPrincipals` matching.

## Summary

JWT claim-based authorization in Istio is a powerful way to implement role-based and attribute-based access control without modifying your services. Using the `when` condition with `request.auth.claims`, you can check any claim in the JWT payload. Combined with path and method matching, you get granular access control that is enforced consistently at the mesh level. The key is to get the claim names exactly right and to layer your ALLOW and DENY policies thoughtfully.
