# How to Extract JWT Claims for Authorization in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Claims, AuthorizationPolicy, RBAC

Description: How to extract and use JWT claims in Istio AuthorizationPolicy rules for fine-grained access control based on token contents.

---

Once Istio validates a JWT, it makes the token's claims available for use in AuthorizationPolicy rules. This means you can build access control based on user roles, email addresses, tenant IDs, or any other claim in the token - all at the mesh level without touching application code.

## How Claims Become Available

When a JWT passes validation through RequestAuthentication, Istio extracts the token's payload and makes it available through the `request.auth` attributes. These attributes are:

- `request.auth.principal` - The request principal, formatted as `<issuer>/<subject>`
- `request.auth.audiences` - The audiences from the token
- `request.auth.claims` - All claims from the JWT payload
- `request.auth.presenter` - The authorized presenter (from the `azp` claim)

## Basic Claim-Based Authorization

Here's a simple example that checks the `role` claim:

```yaml
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
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-admin
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

This allows requests only when the JWT contains `"role": "admin"` in its payload.

## Accessing Different Claim Types

### String Claims

For simple string claims like `email`, `sub`, or custom strings:

```yaml
when:
  - key: request.auth.claims[email]
    values: ["admin@example.com", "ops@example.com"]
```

### Nested Claims

For nested objects in the JWT payload, use bracket notation to traverse the nesting:

```yaml
# Token payload: {"realm_access": {"roles": ["admin", "user"]}}
when:
  - key: request.auth.claims[realm_access][roles]
    values: ["admin"]
```

This is particularly useful for Keycloak tokens where roles are nested under `realm_access.roles`.

### Array Claims

When a claim is an array, Istio checks if any element in the array matches the specified values:

```yaml
# Token payload: {"groups": ["engineering", "devops", "platform"]}
when:
  - key: request.auth.claims[groups]
    values: ["engineering"]
```

This matches if `engineering` is anywhere in the `groups` array.

### Namespaced Claims

Auth0 and some other providers use URI-prefixed custom claims:

```yaml
# Token payload: {"https://myapp.com/roles": ["editor"]}
when:
  - key: request.auth.claims[https://myapp.com/roles]
    values: ["editor"]
```

## Combining Multiple Claims

You can require multiple claims by adding more `when` conditions. All conditions in a single rule must be true (AND logic):

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-admin-verified
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - when:
        - key: request.auth.claims[role]
          values: ["admin"]
        - key: request.auth.claims[email_verified]
          values: ["true"]
```

This requires both `role=admin` AND `email_verified=true`.

For OR logic, use multiple rules:

```yaml
rules:
  # Rule 1: admin role
  - when:
      - key: request.auth.claims[role]
        values: ["admin"]
  # Rule 2: OR super-user group
  - when:
      - key: request.auth.claims[groups]
        values: ["super-users"]
```

If either rule matches, the request is allowed.

## Path-Based Claim Requirements

Different endpoints can require different claims:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: path-claim-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    # Admin endpoints require admin role
    - to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]

    # User endpoints require any authenticated user
    - to:
        - operation:
            paths: ["/api/*"]
      from:
        - source:
            requestPrincipals: ["*"]

    # Public endpoints - no claims needed
    - to:
        - operation:
            paths: ["/public/*", "/health"]
```

## Forwarding Claims to Backend Services

Sometimes your backend needs access to specific claims. You can use `outputPayloadToHeader` in RequestAuthentication to send the decoded JWT payload as a header:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-with-payload
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      outputPayloadToHeader: x-jwt-payload
```

The backend receives the full decoded JWT payload in the `x-jwt-payload` header, base64-encoded. The backend can decode it:

```python
import base64, json

payload = request.headers.get('x-jwt-payload')
claims = json.loads(base64.b64decode(payload))
user_email = claims['email']
user_role = claims['role']
```

## Using the Request Principal

The request principal is automatically set as `<issuer>/<subject>`. You can use it directly in AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-specific-users
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals:
              - "https://auth.example.com/user123"
              - "https://auth.example.com/user456"
```

Or use wildcards to allow all users from a specific issuer:

```yaml
rules:
  - from:
      - source:
          requestPrincipals:
            - "https://auth.example.com/*"
```

## Multi-Tenant Authorization

For multi-tenant applications, you can use a `tenant_id` claim to restrict access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: tenant-isolation
  namespace: tenant-a
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - when:
        - key: request.auth.claims[tenant_id]
          values: ["tenant-a"]
```

Deploy similar policies in each tenant's namespace with the appropriate tenant ID.

## Negation with notValues

You can also exclude specific claim values:

```yaml
# Deny requests from banned users
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-banned
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
    - when:
        - key: request.auth.claims[status]
          values: ["banned", "suspended"]
```

## Debugging Claim-Based Authorization

When authorization isn't working as expected:

```bash
# Decode the token to see all claims
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool

# Enable RBAC debug logging
istioctl proxy-config log <pod> -n backend --level rbac:debug

# Check the proxy logs for authorization decisions
kubectl logs <pod> -c istio-proxy --tail=100 | grep -i "rbac\|authz"
```

Common issues:
- Claim names are case-sensitive: `Role` is different from `role`.
- Nested claim access uses brackets: `claims[realm_access][roles]`, not dot notation.
- Boolean claims like `email_verified` are strings in the Istio context - use `"true"` not `true`.
- Array claims match if any element matches, not all elements.

Claims-based authorization in Istio is flexible and powerful. You can build complex access control rules entirely in YAML without modifying your application code. The key is understanding how Istio surfaces JWT claims through the `request.auth.claims` attribute and how AuthorizationPolicy's `when` conditions work.
