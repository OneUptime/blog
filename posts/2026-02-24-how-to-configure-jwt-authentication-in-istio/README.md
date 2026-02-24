# How to Configure JWT Authentication in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Authentication, RequestAuthentication, Security

Description: A hands-on guide to configuring JWT authentication in Istio using RequestAuthentication to validate JSON Web Tokens at the mesh level.

---

JWT (JSON Web Token) authentication in Istio lets you validate tokens at the sidecar proxy level before requests ever reach your application. This means your services don't need their own JWT validation logic - the Envoy proxy handles it. You configure this using the `RequestAuthentication` resource, which tells the sidecar how to validate incoming JWTs.

## How It Works

When a request arrives at a pod with an Istio sidecar, the proxy can inspect the JWT in the request (typically from the Authorization header). The proxy validates the token's signature using the public keys from a JWKS (JSON Web Key Set) endpoint. If the token is valid, the request passes through. If it's invalid, the request is rejected with a 401.

One important thing to understand: by default, `RequestAuthentication` only rejects requests with invalid tokens. Requests with no token at all are allowed through. To block unauthenticated requests, you need to pair it with an `AuthorizationPolicy`.

## Creating a Basic RequestAuthentication

Here's a minimal RequestAuthentication that validates JWTs from a custom issuer:

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
```

This policy applies to all workloads in the `backend` namespace. It validates any JWT whose `iss` claim matches `https://auth.example.com` and verifies the signature using the keys from the JWKS endpoint.

Apply it:

```bash
kubectl apply -f jwt-auth.yaml
```

## Targeting Specific Workloads

Add a selector to target specific pods:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: api-jwt-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
```

Now only pods with the `app: api-server` label validate JWTs. Other pods in the namespace are unaffected.

## Understanding jwtRules

The `jwtRules` field is a list of JWT validation rules. Each rule specifies:

- **issuer** (required) - The expected value of the `iss` claim in the JWT.
- **jwksUri** - A URL to fetch the JWKS (public keys) for signature verification.
- **jwks** - Inline JWKS content (alternative to jwksUri).
- **audiences** - Expected values of the `aud` claim. If set, the token must have at least one matching audience.
- **fromHeaders** - Where to find the JWT in request headers (defaults to `Authorization: Bearer`).
- **fromParams** - Where to find the JWT in query parameters.
- **forwardOriginalToken** - Whether to forward the original token to the upstream service (defaults to false).
- **outputPayloadToHeader** - Sends the decoded JWT payload to the upstream in a header.

## Adding Audience Validation

If your JWT includes an `aud` (audience) claim, you can validate it:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-with-audience
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "api.example.com"
        - "https://api.example.com"
```

The token's `aud` claim must contain at least one of the listed audiences.

## Forwarding the Token to Services

By default, Istio strips the JWT from the request after validation. If your backend service needs the token (for example, to extract user claims), set `forwardOriginalToken`:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-forward
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
```

Now the `Authorization: Bearer <token>` header is passed to the backend as-is.

## Requiring JWTs (Blocking Unauthenticated Requests)

As mentioned earlier, `RequestAuthentication` alone doesn't block requests without tokens. To do that, add an `AuthorizationPolicy`:

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

The AuthorizationPolicy denies any request that doesn't have a valid `requestPrincipal` (which is set by successful JWT validation). Together, these two resources enforce that every request must have a valid JWT.

## Testing JWT Authentication

First, try a request without a token:

```bash
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" http://api-server.backend:8080/api/data
```

Without the AuthorizationPolicy, this returns 200 (token-less requests are allowed). With the AuthorizationPolicy, it returns 403.

Now try with an invalid token:

```bash
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid-token" \
  http://api-server.backend:8080/api/data
```

This should return 401 because the token fails validation.

Finally, try with a valid token:

```bash
TOKEN=$(curl -s -X POST https://auth.example.com/oauth/token \
  -d 'grant_type=client_credentials&client_id=...&client_secret=...' | jq -r .access_token)

kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://api-server.backend:8080/api/data
```

This should return 200.

## Checking the Configuration

Verify the RequestAuthentication was created:

```bash
kubectl get requestauthentication -n backend
```

Check the Envoy configuration to see the JWT filter:

```bash
istioctl proxy-config listener api-server-abc123 -n backend -o json | \
  python3 -c "import json,sys; [print(json.dumps(f,indent=2)) for l in json.load(sys.stdin) for fc in l.get('filterChains',[]) for f in fc.get('filters',[]) if 'jwt' in json.dumps(f).lower()]"
```

## Common Gotchas

**JWKS endpoint must be reachable from the sidecar.** The Envoy proxy fetches the JWKS at runtime. If the JWKS URL is behind a firewall or requires authentication, it won't work. Make sure the sidecar can reach the JWKS endpoint.

**Token-less requests are allowed by default.** This surprises a lot of people. You need an AuthorizationPolicy to block unauthenticated traffic.

**Clock skew can cause validation failures.** JWT validation checks the `exp` (expiration) and `nbf` (not before) claims. If there's clock skew between the token issuer and the Envoy proxy, valid tokens might be rejected. Make sure your Kubernetes nodes have synchronized clocks (NTP).

**JWKS caching.** Envoy caches the JWKS keys. If you rotate keys on the issuer side, there's a delay before the proxy picks up the new keys. The default cache duration is 5 minutes.

JWT authentication in Istio is powerful because it moves token validation out of your application code and into the infrastructure layer. Start with a basic RequestAuthentication, add audience validation, and pair it with an AuthorizationPolicy to fully lock down your services.
