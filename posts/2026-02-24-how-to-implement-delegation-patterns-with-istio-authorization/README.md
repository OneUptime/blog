# How to Implement Delegation Patterns with Istio Authorization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Delegation, Security, Kubernetes

Description: How to implement authorization delegation patterns in Istio including token exchange, impersonation, and delegated trust between microservices.

---

In a microservices architecture, a request often passes through multiple services before reaching its final destination. The frontend calls the API gateway, which calls the order service, which calls the payment service. At each hop, the question of "who is authorized?" gets complicated. Delegation patterns help you maintain proper authorization across these service chains without every service needing to talk to the same identity provider.

Istio supports several delegation patterns through its authorization framework. You can propagate user identity through JWT tokens, delegate trust between service accounts, and build chain-of-custody authorization that tracks the full request path.

## Pattern 1: Token Forwarding

The simplest delegation pattern is forwarding the original JWT token through the service chain. The token carries the end-user identity, and each service validates it independently.

Set up RequestAuthentication at each service that needs to verify user identity:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  jwtRules:
  - issuer: "https://auth.example.com/"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
```

The `forwardOriginalToken: true` field is important. It ensures the JWT gets passed along to the next service in the chain.

Now each service in the chain can authorize based on the original user's claims:

```yaml
# Order service: allow users with "customer" role
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-service-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    when:
    - key: request.auth.claims[role]
      values: ["customer", "admin"]
```

```yaml
# Payment service: only allow if user has "purchase" permission
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-service-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/backend/sa/order-service"]
        requestPrincipals: ["https://auth.example.com/*"]
    when:
    - key: request.auth.claims[permissions]
      values: ["purchase"]
```

This pattern combines both service identity (which service is calling) and user identity (who initiated the request).

## Pattern 2: Service Account Delegation

Sometimes a service needs to act on behalf of another service. For example, a scheduler service might need to trigger actions that are normally only allowed from the API gateway.

Create a delegation chain using AuthorizationPolicies:

```yaml
# The backend service trusts requests from the scheduler
# ONLY when the scheduler indicates it's acting on behalf of the gateway
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: delegated-access
  namespace: backend
spec:
  selector:
    matchLabels:
      app: backend-service
  action: ALLOW
  rules:
  # Direct access from gateway
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/api-gateway"]
  # Delegated access from scheduler (acting on behalf of gateway)
  - from:
    - source:
        principals: ["cluster.local/ns/jobs/sa/scheduler"]
    when:
    - key: request.headers[x-delegated-from]
      values: ["api-gateway"]
    - key: request.headers[x-delegation-token]
      notValues: [""]
```

The scheduler must include delegation headers when making requests. Your application code adds these headers, and Istio validates them at the mesh level.

## Pattern 3: Impersonation with Custom Headers

For cases where a service needs to impersonate a user, use custom headers to carry the impersonated identity:

```yaml
# API gateway adds impersonation headers
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-route
  namespace: backend
spec:
  hosts:
  - backend-service
  http:
  - route:
    - destination:
        host: backend-service
    headers:
      request:
        set:
          x-original-user: "%REQ(authorization)%"
```

Then the downstream service can authorize based on impersonation headers, but only from trusted callers:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: impersonation-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: backend-service
  action: ALLOW
  rules:
  # Only the API gateway can impersonate users
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/api-gateway"]
    when:
    - key: request.headers[x-impersonated-user]
      notValues: [""]
  # Admin service can impersonate for support operations
  - from:
    - source:
        principals: ["cluster.local/ns/admin/sa/support-service"]
    when:
    - key: request.headers[x-impersonated-user]
      notValues: [""]
    - key: request.headers[x-impersonation-reason]
      notValues: [""]
```

Important: Block other services from setting impersonation headers. Use an EnvoyFilter or gateway-level policy to strip these headers from untrusted sources:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-fake-impersonation
  namespace: backend
spec:
  selector:
    matchLabels:
      app: backend-service
  action: DENY
  rules:
  # Deny if impersonation header is present but caller is not trusted
  - from:
    - source:
        notPrincipals:
        - "cluster.local/ns/frontend/sa/api-gateway"
        - "cluster.local/ns/admin/sa/support-service"
    when:
    - key: request.headers[x-impersonated-user]
      notValues: [""]
```

## Pattern 4: Multi-Hop Authorization Chain

For tracking authorization through multiple hops, each service adds its identity to a chain header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-delegation-chain
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: order-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_OUTBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inlineCode: |
            function envoy_on_request(request_handle)
              local chain = request_handle:headers():get("x-auth-chain") or ""
              if chain ~= "" then
                chain = chain .. ",order-service"
              else
                chain = "order-service"
              end
              request_handle:headers():replace("x-auth-chain", chain)
            end
```

Then the final service can verify the entire chain:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: verify-chain
  namespace: backend
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  # Only allow if the request went through the expected chain
  - from:
    - source:
        principals: ["cluster.local/ns/backend/sa/order-service"]
    when:
    - key: request.headers[x-auth-chain]
      values: ["api-gateway,order-service"]
```

## Pattern 5: Scoped Delegation with JWT Claims

Create scoped tokens that limit what the delegated service can do:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: scoped-token-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: payment-service
  jwtRules:
  - issuer: "https://auth.example.com/"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
  - issuer: "https://internal-auth.example.com/"  # Internal token issuer
    jwksUri: "https://internal-auth.example.com/.well-known/jwks.json"
```

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: scoped-delegation
  namespace: backend
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  # Direct user access: full permissions
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    when:
    - key: request.auth.claims[scope]
      values: ["payment:read", "payment:write"]
  # Delegated access: limited scope
  - from:
    - source:
        principals: ["cluster.local/ns/backend/sa/order-service"]
        requestPrincipals: ["https://internal-auth.example.com/*"]
    when:
    - key: request.auth.claims[delegated_scope]
      values: ["payment:charge"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/payments/charge"]
```

## Testing Delegation Patterns

Test that delegation works correctly and that unauthorized delegation attempts are blocked:

```bash
# Test direct access (should work)
kubectl exec -n frontend deploy/api-gateway -- curl -s \
  -H "Authorization: Bearer $USER_TOKEN" \
  http://backend-service.backend.svc.cluster.local:8080/api/data

# Test delegated access (should work)
kubectl exec -n jobs deploy/scheduler -- curl -s \
  -H "x-delegated-from: api-gateway" \
  -H "x-delegation-token: valid-token" \
  http://backend-service.backend.svc.cluster.local:8080/api/data

# Test fake delegation (should be denied - 403)
kubectl exec -n default deploy/untrusted-service -- curl -s \
  -H "x-delegated-from: api-gateway" \
  http://backend-service.backend.svc.cluster.local:8080/api/data
```

Delegation patterns add flexibility to your authorization model without sacrificing security. The key is always combining delegation markers (headers, tokens, claims) with service identity verification. Never trust a delegation header without also verifying that the calling service is authorized to delegate.
