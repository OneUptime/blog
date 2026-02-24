# How to Configure All RequestAuthentication Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RequestAuthentication, JWT, Security, Kubernetes

Description: Full reference for every RequestAuthentication field in Istio including JWT rules, JWKS configuration, claim mappings, and token forwarding options.

---

RequestAuthentication defines how Istio validates JSON Web Tokens (JWTs) attached to incoming requests. It does not reject requests that have no token - that is the job of AuthorizationPolicy. What RequestAuthentication does is validate tokens when they are present and extract claims into filter metadata that downstream policies can use.

## How It Works

When a request arrives at a sidecar or gateway with a RequestAuthentication policy, Istio checks if the request has a JWT. If it does, the token is validated against the configured rules. If validation fails (expired token, wrong issuer, bad signature), the request is rejected with a 401. If the request has no token at all, it passes through - the assumption is that you will use AuthorizationPolicy to decide what to do with unauthenticated requests.

## Top-Level Structure

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: my-jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  targetRef:
    kind: Gateway
    group: gateway.networking.k8s.io
    name: my-gateway
  jwtRules:
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
```

## Selector

```yaml
spec:
  selector:
    matchLabels:
      app: my-service
      version: v1
```

The `selector` determines which workloads this policy applies to, matching against pod labels. If omitted, the policy applies to all workloads in the namespace. This works the same way as PeerAuthentication selectors.

## Target Ref

```yaml
spec:
  targetRef:
    kind: Gateway
    group: gateway.networking.k8s.io
    name: my-gateway
```

The `targetRef` field is an alternative to `selector` for targeting Kubernetes Gateway API resources. When using the new Gateway API, you use `targetRef` instead of `selector` to attach the policy to a specific gateway. The `kind` can be `Gateway` or `Service`, and `group` specifies the API group.

Note that `selector` and `targetRef` are mutually exclusive - you use one or the other.

## JWT Rules

The `jwtRules` field is where all the interesting configuration lives. Each rule defines how to validate JWTs from a specific issuer.

### Issuer

```yaml
jwtRules:
  - issuer: "https://accounts.google.com"
```

The `issuer` field must match the `iss` claim in the JWT exactly. This is a required field. When a token is presented, Istio checks its `iss` claim against all configured rules and applies the matching one.

### JWKS Configuration

There are two ways to provide the keys used to verify JWT signatures:

```yaml
# Option 1: JWKS URI (recommended)
jwtRules:
  - issuer: "https://accounts.google.com"
    jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
```

```yaml
# Option 2: Inline JWKS
jwtRules:
  - issuer: "https://my-issuer.example.com"
    jwks: |
      {
        "keys": [
          {
            "kty": "RSA",
            "n": "abc123...",
            "e": "AQAB",
            "kid": "key-id-1",
            "alg": "RS256"
          }
        ]
      }
```

`jwksUri` points to a remote endpoint that serves the JSON Web Key Set. Istio caches the keys and refreshes them periodically. This is the preferred approach because key rotation happens automatically.

`jwks` provides the key set inline. This is useful for testing or when the issuer does not have a publicly accessible JWKS endpoint. If both are provided, `jwks` takes precedence.

### Audiences

```yaml
jwtRules:
  - issuer: "https://accounts.google.com"
    jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
    audiences:
      - "my-service.example.com"
      - "another-audience"
```

The `audiences` field specifies valid values for the `aud` claim in the JWT. If set, the token's `aud` must contain at least one of these values. If not set, the `aud` claim is not checked (any audience is accepted).

### Token Location

By default, Istio looks for JWTs in the `Authorization` header with a `Bearer` prefix. You can customize this:

```yaml
jwtRules:
  - issuer: "https://my-issuer.example.com"
    jwksUri: "https://my-issuer.example.com/.well-known/jwks.json"
    fromHeaders:
      - name: Authorization
        prefix: "Bearer "
      - name: X-Custom-Token
        prefix: ""
    fromParams:
      - "access_token"
      - "token"
    fromCookies:
      - "auth-token"
```

`fromHeaders` specifies headers to check for the token. Each entry has a `name` and an optional `prefix` that gets stripped before processing. The default is `Authorization` with prefix `Bearer `.

`fromParams` specifies URL query parameters that may contain the token.

`fromCookies` specifies cookie names that may contain the token.

Istio checks these locations in order: headers first, then params, then cookies. The first token found is used.

### Forward Original Token

```yaml
jwtRules:
  - issuer: "https://my-issuer.example.com"
    jwksUri: "https://my-issuer.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
```

When `forwardOriginalToken` is true, the original JWT is kept in the request and forwarded to the upstream service. When false (the default), the token is consumed by Istio and not forwarded. Set this to true if your application needs to read the JWT directly.

### Output Payload to Header

```yaml
jwtRules:
  - issuer: "https://my-issuer.example.com"
    jwksUri: "https://my-issuer.example.com/.well-known/jwks.json"
    outputPayloadToHeader: "x-jwt-payload"
```

When set, Istio decodes the JWT payload (the claims) and puts the base64-encoded JSON payload into the specified header. Your application can then decode this header to access claims without having to validate the JWT itself. This is useful when you want your application to trust that Istio already validated the token.

### Claim to Headers

```yaml
jwtRules:
  - issuer: "https://my-issuer.example.com"
    jwksUri: "https://my-issuer.example.com/.well-known/jwks.json"
    outputClaimToHeaders:
      - header: "x-jwt-sub"
        claim: "sub"
      - header: "x-jwt-email"
        claim: "email"
      - header: "x-jwt-groups"
        claim: "groups"
```

The `outputClaimToHeaders` field extracts specific claims from the JWT and sets them as request headers. Each entry maps a `claim` name to a `header` name. This is cleaner than `outputPayloadToHeader` when you only need a few specific claims.

### Timeout

```yaml
jwtRules:
  - issuer: "https://my-issuer.example.com"
    jwksUri: "https://my-issuer.example.com/.well-known/jwks.json"
    timeout: 10s
```

The `timeout` field sets the maximum time to wait when fetching the JWKS from the remote URI. Defaults to 5 seconds.

## Multiple Issuers

You can configure multiple JWT rules for different identity providers:

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: multi-issuer
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  jwtRules:
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
      audiences:
        - "my-app.example.com"
    - issuer: "https://login.microsoftonline.com/{tenant-id}/v2.0"
      jwksUri: "https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys"
      audiences:
        - "api://my-app-client-id"
    - issuer: "https://my-custom-idp.example.com"
      jwksUri: "https://my-custom-idp.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
      outputClaimToHeaders:
        - header: "x-user-id"
          claim: "sub"
        - header: "x-user-role"
          claim: "role"
```

Each rule is evaluated independently. The token's `iss` claim determines which rule applies.

## Combining with AuthorizationPolicy

RequestAuthentication alone does not deny unauthenticated requests. You need AuthorizationPolicy for that:

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: require-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  jwtRules:
    - issuer: "https://my-issuer.example.com"
      jwksUri: "https://my-issuer.example.com/.well-known/jwks.json"
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
```

The AuthorizationPolicy with `requestPrincipals: ["*"]` ensures that only requests with a valid JWT (any principal) are allowed. Requests without a token or with an invalid token are denied.

## Verifying Your Configuration

Check if the policy is applied correctly:

```bash
istioctl x describe pod <pod-name> -n <namespace>
```

Test with a valid token:

```bash
curl -H "Authorization: Bearer <valid-token>" http://my-service/api
```

Test without a token (should pass RequestAuthentication but may be blocked by AuthorizationPolicy):

```bash
curl http://my-service/api
```

Test with an invalid token (should get 401):

```bash
curl -H "Authorization: Bearer invalid-token" http://my-service/api
```

Understanding all the RequestAuthentication fields lets you build flexible JWT validation that works with any identity provider. Combined with AuthorizationPolicy, it gives you a solid authentication and authorization layer for your mesh.
