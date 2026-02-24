# How to Implement Attribute-Based Access Control (ABAC) with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ABAC, Authorization, Security, Kubernetes

Description: How to implement attribute-based access control in Istio using AuthorizationPolicy resources with request attributes, identity, and context matching.

---

Attribute-based access control (ABAC) makes authorization decisions based on attributes of the request, the caller, the target, and the environment. Unlike simple role-based access control where you assign roles to users, ABAC evaluates a combination of attributes to decide whether to allow or deny a request. Istio's AuthorizationPolicy is well-suited for implementing ABAC patterns because it supports matching on a wide range of attributes.

The key attributes you can match on in Istio include the source identity (SPIFFE ID), namespace, IP address, request headers, HTTP method, URL path, and custom JWT claims. By combining these attributes in a single policy, you build ABAC rules that are both flexible and precise.

## Understanding Available Attributes

Istio AuthorizationPolicy supports these attribute categories:

**Source attributes (who is making the request):**
- `principals` - The SPIFFE identity of the caller
- `namespaces` - The Kubernetes namespace of the caller
- `ipBlocks` - The source IP range
- `requestPrincipals` - The identity from a JWT token

**Destination attributes (what is being accessed):**
- `methods` - HTTP method (GET, POST, etc.)
- `paths` - URL path
- `ports` - TCP port
- `hosts` - The host header

**Custom attributes:**
- `request.headers` - Any HTTP header
- `source.principal` - The source SPIFFE ID
- JWT claims via `request.auth.claims`

## Basic ABAC Policy

Here's a simple ABAC policy that allows access based on source identity and request path:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-abac-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/web-app"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/v1/products/*", "/api/v1/categories/*"]
  - from:
    - source:
        principals: ["cluster.local/ns/admin/sa/admin-app"]
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
        paths: ["/api/v1/*"]
```

This policy says: the web-app can only read products and categories, but the admin-app can do anything under /api/v1/.

## Multi-Attribute Policies

Real ABAC usually combines multiple attributes. Here's a policy that checks identity, method, path, and a custom header:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: multi-attribute-abac
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  # Internal services can create orders
  - from:
    - source:
        namespaces: ["checkout"]
        principals: ["cluster.local/ns/checkout/sa/checkout-service"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/orders"]
    when:
    - key: request.headers[x-request-id]
      notValues: [""]
  # Any internal service can read orders
  - from:
    - source:
        namespaces: ["frontend", "reporting", "admin"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/orders/*"]
  # Admin can modify orders
  - from:
    - source:
        principals: ["cluster.local/ns/admin/sa/admin-service"]
    to:
    - operation:
        methods: ["PUT", "PATCH"]
        paths: ["/api/orders/*"]
```

The `when` clause adds additional attribute checks beyond the basic from/to matching. In this case, it requires that the x-request-id header is present.

## JWT-Based ABAC

When you have end-user identity from JWT tokens, you can build ABAC policies that combine service identity with user identity:

First, set up JWT authentication:

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
  - issuer: "https://auth.example.com/"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
```

Then create ABAC policies based on JWT claims:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: jwt-abac-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
  # Users with "admin" role can do anything
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    when:
    - key: request.auth.claims[role]
      values: ["admin"]
  # Users with "editor" role can read and write
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    to:
    - operation:
        methods: ["GET", "POST", "PUT"]
    when:
    - key: request.auth.claims[role]
      values: ["editor"]
  # Users with "viewer" role can only read
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    to:
    - operation:
        methods: ["GET"]
    when:
    - key: request.auth.claims[role]
      values: ["viewer"]
```

## Combining Service Identity and User Claims

The most powerful ABAC pattern combines both layers. The service identity tells you which microservice is making the call. The JWT claims tell you which end user initiated it:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: combined-abac
  namespace: backend
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  # Only the checkout service can initiate payments,
  # and only for users with a verified account
  - from:
    - source:
        principals: ["cluster.local/ns/checkout/sa/checkout-service"]
        requestPrincipals: ["https://auth.example.com/*"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/payments"]
    when:
    - key: request.auth.claims[account_verified]
      values: ["true"]
  # The admin service can view and refund payments
  - from:
    - source:
        principals: ["cluster.local/ns/admin/sa/admin-service"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/payments/*"]
  - from:
    - source:
        principals: ["cluster.local/ns/admin/sa/admin-service"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/payments/*/refund"]
    when:
    - key: request.auth.claims[role]
      values: ["finance_admin"]
```

## Deny Policies for Negative Rules

ABAC often involves denying specific attribute combinations. DENY policies are evaluated before ALLOW policies in Istio:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-suspicious
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
  # Deny requests from outside the mesh (no identity)
  - from:
    - source:
        notPrincipals: ["cluster.local/*"]
  # Deny requests to admin paths without admin claim
  - to:
    - operation:
        paths: ["/api/admin/*"]
    when:
    - key: request.auth.claims[role]
      notValues: ["admin"]
```

## IP-Based Attributes

You can include IP addresses in your ABAC rules, useful for restricting access from specific network segments:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ip-based-abac
  namespace: backend
spec:
  selector:
    matchLabels:
      app: internal-api
  action: ALLOW
  rules:
  - from:
    - source:
        ipBlocks: ["10.0.0.0/8"]
        namespaces: ["trusted"]
    to:
    - operation:
        ports: ["8080"]
```

## Testing ABAC Policies

Test your policies systematically:

```bash
# Test from an allowed service
kubectl exec -n checkout deployment/checkout-service -c checkout -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://order-service.backend.svc.cluster.local:8080/api/orders \
  -H "x-request-id: test-123"

# Test from a disallowed service
kubectl exec -n frontend deployment/web-app -c web-app -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://order-service.backend.svc.cluster.local:8080/api/orders

# Test with JWT
kubectl exec -n frontend deployment/web-app -c web-app -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  http://api-server.backend.svc.cluster.local:8080/api/admin/users
```

Expected results: 200 for allowed combinations, 403 for denied ones.

## Debugging ABAC Policies

When policies aren't working as expected:

```bash
# Check what policies are loaded
istioctl proxy-config listener deployment/api-server -n backend -o json | grep -A 20 "rbac"

# Enable RBAC debug logging
istioctl proxy-config log deployment/api-server -n backend --level rbac:debug

# Watch the proxy logs for RBAC decisions
kubectl logs deployment/api-server -n backend -c istio-proxy --tail=50 | grep "rbac"
```

ABAC with Istio gives you flexible, fine-grained access control without modifying your application code. The combination of service identity, user claims, request attributes, and network information lets you express complex authorization rules that adapt to your security requirements. Start with simple policies and add attributes as your needs evolve.
