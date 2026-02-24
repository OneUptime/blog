# How to Reject Requests Without JWT Tokens in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, AuthorizationPolicy, RequestAuthentication, Security

Description: How to configure Istio to reject unauthenticated requests that don't include a valid JWT token using AuthorizationPolicy.

---

One of the most common surprises with Istio's JWT authentication is that RequestAuthentication alone does not block requests without tokens. It only validates tokens that are present. If a request comes in with no token at all, it passes right through. To actually require authentication, you need to pair RequestAuthentication with an AuthorizationPolicy.

## Why RequestAuthentication Doesn't Block Token-less Requests

The design is intentional. RequestAuthentication acts as a token validator, not an access control mechanism. Its job is to say "if a token is present, it must be valid." This separation of concerns lets you:

- Allow some endpoints to be public (no token needed) while others require authentication.
- Have different authorization rules for authenticated vs. unauthenticated requests.
- Gradually roll out JWT requirements without breaking existing clients.

The access control part - deciding who gets in and who doesn't - is handled by AuthorizationPolicy.

## The Basic Pattern

You need two resources working together:

```yaml
# Step 1: Validate tokens that are present
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
# Step 2: Deny requests without a valid token
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
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
```

The AuthorizationPolicy says: deny any request where the request principal is not set. The request principal is only set when JWT validation succeeds. So requests without tokens (no principal) get denied with 403 Forbidden.

## Understanding the Response Codes

With this setup, here's what clients see:

| Scenario | Status Code | Why |
|----------|-------------|-----|
| No token | 403 Forbidden | AuthorizationPolicy denies (no principal) |
| Invalid token | 401 Unauthorized | RequestAuthentication rejects |
| Expired token | 401 Unauthorized | RequestAuthentication rejects |
| Valid token | 200 OK | Both policies pass |

## Allowing Public Endpoints

Most APIs have some endpoints that should be public - health checks, documentation, login pages. You can allow these while requiring JWT for everything else:

```yaml
# Validate tokens
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
# Allow public endpoints without JWT
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
---
# Require JWT for everything else
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
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
```

The ALLOW policy takes priority for matching paths. The DENY policy catches everything else without a valid token.

## Namespace-Wide JWT Requirement

To require JWTs across an entire namespace, omit the selector:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: backend
spec:
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: backend
spec:
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
```

Now every workload in the `backend` namespace requires a valid JWT. Be careful with this - it also affects service-to-service calls within the namespace. Internal services calling each other will also need to present JWTs.

## Service-to-Service with JWT

When you require JWTs namespace-wide, internal services need a way to pass tokens. There are a few approaches:

**Option 1: Forward tokens.** The original client token is forwarded through the chain:

```yaml
jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
```

The downstream service includes the same token when calling upstream services.

**Option 2: Exempt internal traffic.** Only require JWTs from external sources:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-mesh-internal
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/backend/sa/*"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt-external
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
            notPrincipals: ["cluster.local/ns/backend/sa/*"]
```

This allows requests from services in the `backend` namespace (identified by their SPIFFE identity) without a JWT, while still requiring JWTs from external traffic.

## Using ALLOW-Only Approach

An alternative to the DENY pattern is to use an ALLOW policy that explicitly requires a principal:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-authenticated
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
```

When you have an ALLOW policy with no matching DENY, Istio denies anything that doesn't match the ALLOW rules. So only requests with a valid request principal (from JWT validation) get through.

The catch is that this blocks everything else too, including service mesh internal traffic. You might need to add more ALLOW rules for internal services.

## Method-Specific Requirements

Require JWT only for write operations while allowing reads to be public:

```yaml
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
            methods: ["GET", "HEAD", "OPTIONS"]
---
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
            methods: ["POST", "PUT", "DELETE", "PATCH"]
```

## Testing

```bash
# No token - should be denied (403)
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://api-server.backend:8080/api/data

# Valid token - should succeed (200)
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $VALID_TOKEN" \
  http://api-server.backend:8080/api/data

# Public endpoint without token - should succeed (200)
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://api-server.backend:8080/health
```

## Debugging

If requests are being rejected unexpectedly:

```bash
# Check what AuthorizationPolicies apply
kubectl get authorizationpolicy -n backend

# Check the proxy RBAC logs
kubectl logs <pod> -c istio-proxy --tail=50 | grep -i "rbac\|denied\|allowed"

# Check if request principal is being set
istioctl proxy-config log <pod> -n backend --level rbac:debug
```

The key takeaway: RequestAuthentication validates tokens, AuthorizationPolicy enforces access. You always need both if you want to reject requests without tokens. Start with the DENY pattern for `notRequestPrincipals` and add ALLOW rules for public endpoints.
