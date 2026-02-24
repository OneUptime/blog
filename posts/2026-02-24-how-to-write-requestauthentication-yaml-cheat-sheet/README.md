# How to Write RequestAuthentication YAML (Cheat Sheet)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RequestAuthentication, JWT, YAML, Cheat Sheet, Security

Description: Complete cheat sheet for writing Istio RequestAuthentication YAML to validate JWT tokens and implement end-user authentication.

---

RequestAuthentication is the Istio resource that validates JSON Web Tokens (JWTs) at the proxy level. It checks that incoming requests carry valid tokens issued by trusted identity providers. This gives you end-user authentication at the infrastructure layer without changing your application code.

Here is a complete reference with practical YAML for every common JWT validation scenario.

## Basic Structure

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: my-req-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
```

## Important Behavior Note

RequestAuthentication only validates tokens that are present. It does NOT reject requests without tokens. To require tokens, you need to pair it with an AuthorizationPolicy.

The pattern is:
1. RequestAuthentication: "If a token is present, validate it against these issuers"
2. AuthorizationPolicy: "Only allow requests that have valid token principals"

## Single Issuer with JWKS URI

The most common setup. Tokens are validated against the issuer's public keys fetched from a JWKS endpoint:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
```

## Multiple Issuers

Accept tokens from different identity providers:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: multi-issuer-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
    - issuer: "https://auth0.example.com/"
      jwksUri: "https://auth0.example.com/.well-known/jwks.json"
    - issuer: "https://login.microsoftonline.com/tenant-id/v2.0"
      jwksUri: "https://login.microsoftonline.com/tenant-id/discovery/v2.0/keys"
```

Each JWT rule independently validates tokens with the matching issuer claim.

## Audience Validation

Restrict accepted tokens to specific audiences:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: audience-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "api-server"
        - "https://api.example.com"
```

The token's `aud` claim must match one of the listed audiences. If `audiences` is not specified, the audience is not checked.

## Custom Token Location

By default, Istio looks for JWTs in the `Authorization: Bearer <token>` header. You can change where tokens are extracted from:

### From a Custom Header

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: custom-header-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      fromHeaders:
        - name: x-jwt-token
        - name: Authorization
          prefix: "Bearer "
```

### From Query Parameters

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: query-param-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      fromParams:
        - access_token
        - token
```

### Both Headers and Parameters

```yaml
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      fromHeaders:
        - name: Authorization
          prefix: "Bearer "
      fromParams:
        - access_token
```

Istio checks headers first, then query parameters.

## Forward Original Token

Pass the original JWT to the backend service:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: forward-token-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
```

When `forwardOriginalToken` is true, the original JWT is preserved in the request headers and forwarded to the upstream service. This is useful when your backend also needs to inspect the token.

## Output Payload to Headers

Extract specific JWT claims and add them as request headers:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: output-claims-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      outputPayloadToHeader: x-jwt-payload
```

The entire decoded JWT payload is base64-encoded and placed in the `x-jwt-payload` header. Your backend can decode it to access claims without needing to validate the JWT again.

## Inline JWKS (Static Keys)

Instead of fetching keys from a URL, provide them inline:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: inline-jwks-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwks: |
        {
          "keys": [
            {
              "kty": "RSA",
              "e": "AQAB",
              "use": "sig",
              "kid": "key-id-1",
              "alg": "RS256",
              "n": "your-rsa-modulus-here..."
            }
          ]
        }
```

This is useful in air-gapped environments or when the JWKS endpoint is not accessible from the mesh.

## Apply at Ingress Gateway

Validate tokens at the mesh edge before traffic enters any service:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: gateway-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
```

## Mesh-Wide Policy

Apply to all workloads:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
```

No selector means it applies to everything in the namespace. In `istio-system`, this becomes mesh-wide.

## Pairing with AuthorizationPolicy

RequestAuthentication alone does not reject requests without tokens. Add an AuthorizationPolicy to enforce token presence:

### Require Valid Token

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
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
  namespace: default
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

The `requestPrincipals: ["*"]` matches any valid token principal, which means requests without tokens are denied.

### Require Specific Claims

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-admin
  namespace: default
spec:
  selector:
    matchLabels:
      app: admin-panel
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://auth.example.com/*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

### Allow Some Paths Without Token

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mixed-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    # Public endpoints - no token needed
    - to:
        - operation:
            paths: ["/health", "/public/*"]
    # Protected endpoints - require valid token
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/api/*"]
```

## Debugging Token Validation

If tokens are being rejected, check the proxy logs:

```bash
istioctl proxy-config log deploy/api-server -n default --level jwt:debug
kubectl logs deploy/api-server -n default -c istio-proxy | grep jwt
```

Common issues:
- **Token expired**: Check the `exp` claim
- **Wrong issuer**: The `iss` claim must exactly match the `issuer` field
- **Wrong audience**: The `aud` claim must match the `audiences` field
- **Key not found**: The JWKS might not include the key matching the token's `kid`
- **Clock skew**: The proxy's clock might differ from the token issuer's clock

## Full Production Example

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: production-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "api-server"
      forwardOriginalToken: true
      fromHeaders:
        - name: Authorization
          prefix: "Bearer "
      outputPayloadToHeader: x-jwt-payload
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-auth-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/health", "/ready"]
    - from:
        - source:
            requestPrincipals: ["https://auth.example.com/*"]
      to:
        - operation:
            paths: ["/api/*"]
```

This setup validates JWTs from a single issuer, forwards the original token to the backend, extracts the payload as a header, and allows unauthenticated access to health endpoints while requiring valid tokens for API paths.
