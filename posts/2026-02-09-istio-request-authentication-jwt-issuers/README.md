# How to Configure Istio Request Authentication with Multiple JWT Issuers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, JWT, Authentication, Kubernetes, Security, Multi-Tenant

Description: Learn how to configure Istio RequestAuthentication to accept JWTs from multiple identity providers for multi-tenant applications supporting different authentication systems simultaneously.

---

Modern applications often need to accept authentication from multiple sources. Internal users authenticate with corporate SSO while external partners use their own identity providers. Istio RequestAuthentication supports multiple JWT issuers simultaneously, validating tokens from different sources with a single configuration.

## Understanding Multi-Issuer JWT Authentication

RequestAuthentication validates JWTs but doesn't enforce authentication. It extracts and validates JWT claims, making them available for authorization decisions. Supporting multiple issuers means the same service can accept tokens from Auth0, Okta, Keycloak, or custom JWT providers.

Each issuer has its own JWKS endpoint for public key retrieval. Istio validates the JWT signature using the appropriate issuer's keys. If validation succeeds, the request proceeds with claims attached. If validation fails, Istio rejects the request.

This enables multi-tenant scenarios where different customers use different identity providers while accessing the same backend services.

## Prerequisites

You need a Kubernetes cluster with Istio installed:

```bash
istioctl install --set profile=demo
kubectl label namespace default istio-injection=enabled
```

Deploy a sample application:

```yaml
# httpbin.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
      - name: httpbin
        image: kennethreitz/httpbin:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  namespace: default
spec:
  selector:
    app: httpbin
  ports:
  - port: 8000
    targetPort: 80
```

```bash
kubectl apply -f httpbin.yaml
```

## Configuring Multiple JWT Issuers

Create a RequestAuthentication with multiple JWT rules:

```yaml
# requestauth-multi-issuer.yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: multi-issuer-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  jwtRules:
  # Internal corporate SSO
  - issuer: "https://auth.mycompany.com"
    jwksUri: "https://auth.mycompany.com/.well-known/jwks.json"
    audiences:
    - "internal-api"
    fromHeaders:
    - name: Authorization
      prefix: "Bearer "
  # External Auth0
  - issuer: "https://mycompany.auth0.com/"
    jwksUri: "https://mycompany.auth0.com/.well-known/jwks.json"
    audiences:
    - "external-api"
    fromHeaders:
    - name: Authorization
      prefix: "Bearer "
  # Partner Okta
  - issuer: "https://partner.okta.com/oauth2/default"
    jwksUri: "https://partner.okta.com/oauth2/default/v1/keys"
    audiences:
    - "partner-api"
    fromHeaders:
    - name: Authorization
      prefix: "Bearer "
  # Custom JWT issuer
  - issuer: "custom-issuer"
    jwks: |
      {
        "keys": [
          {
            "kty": "RSA",
            "e": "AQAB",
            "n": "your-public-key-n-value",
            "kid": "key-id"
          }
        ]
      }
    audiences:
    - "custom-api"
    fromHeaders:
    - name: X-Custom-Auth
      prefix: "Token "
```

```bash
kubectl apply -f requestauth-multi-issuer.yaml
```

Istio now accepts JWTs from any of these four issuers.

## Testing Multi-Issuer Authentication

Generate JWTs from each issuer and test:

```bash
# Test with corporate SSO token
CORP_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
kubectl run test --image=curlimages/curl --rm -it -- \
  curl -H "Authorization: Bearer $CORP_TOKEN" http://httpbin:8000/headers

# Test with Auth0 token
AUTH0_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
kubectl run test --image=curlimages/curl --rm -it -- \
  curl -H "Authorization: Bearer $AUTH0_TOKEN" http://httpbin:8000/headers

# Test with custom token in different header
CUSTOM_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
kubectl run test --image=curlimages/curl --rm -it -- \
  curl -H "X-Custom-Auth: Token $CUSTOM_TOKEN" http://httpbin:8000/headers
```

All three requests succeed if tokens are valid for their respective issuers.

## Implementing Issuer-Specific Authorization

Apply different authorization policies based on the issuer:

```yaml
# authz-per-issuer.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: issuer-based-authz
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  # Internal users can access everything
  - when:
    - key: request.auth.claims[iss]
      values: ["https://auth.mycompany.com"]
  # External users only GET on public endpoints
  - to:
    - operation:
        methods: ["GET"]
        paths: ["/public/*"]
    when:
    - key: request.auth.claims[iss]
      values: ["https://mycompany.auth0.com/"]
  # Partners access specific API
  - to:
    - operation:
        paths: ["/partner/*"]
    when:
    - key: request.auth.claims[iss]
      values: ["https://partner.okta.com/oauth2/default"]
```

```bash
kubectl apply -f authz-per-issuer.yaml
```

This creates a multi-tenant authorization model where access depends on which identity provider authenticated the user.

## Handling Issuer Priority

When multiple issuers could match, Istio uses the first valid JWT. Order JWT rules by priority:

```yaml
jwtRules:
# Try internal SSO first (most common)
- issuer: "https://auth.mycompany.com"
  jwksUri: "https://auth.mycompany.com/.well-known/jwks.json"
# Then Auth0 (external users)
- issuer: "https://mycompany.auth0.com/"
  jwksUri: "https://mycompany.auth0.com/.well-known/jwks.json"
# Finally custom issuer (rare)
- issuer: "custom-issuer"
  jwks: "..."
```

Istio validates in order and uses the first successful validation.

## Configuring Issuer-Specific Audiences

Different issuers may require different audience values:

```yaml
jwtRules:
- issuer: "https://auth.mycompany.com"
  jwksUri: "https://auth.mycompany.com/.well-known/jwks.json"
  audiences:
  - "api.mycompany.com"
  - "internal-services"
- issuer: "https://mycompany.auth0.com/"
  jwksUri: "https://mycompany.auth0.com/.well-known/jwks.json"
  audiences:
  - "https://api.mycompany.com"
  - "external-api"
```

The JWT's `aud` claim must match one of the configured audiences for that issuer.

## Implementing Fallback Authentication

Accept unauthenticated requests when no JWT is present:

```yaml
# requestauth-optional.yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: optional-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  jwtRules:
  - issuer: "https://auth.mycompany.com"
    jwksUri: "https://auth.mycompany.com/.well-known/jwks.json"
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: optional-authz
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  # Authenticated users get full access
  - from:
    - source:
        requestPrincipals: ["*"]
  # Unauthenticated users get limited access
  - to:
    - operation:
        paths: ["/public/*"]
```

This allows both authenticated and anonymous access with different permissions.

## Monitoring JWT Validation

Query Prometheus for authentication metrics:

```promql
# Successful JWT validations
sum(rate(istio_requests_total{response_code="200"}[5m])) by (source_principal)

# Failed JWT validations
sum(rate(istio_requests_total{response_code="401"}[5m]))

# Requests by issuer
sum by (request_principal) (
  rate(istio_requests_total{request_principal!=""}[5m])
)
```

Check Envoy logs for authentication details:

```bash
kubectl logs deploy/httpbin -c istio-proxy | grep -i jwt
```

## Implementing JWT Claim Extraction

Extract specific claims for use in authorization:

```yaml
# requestauth-claims.yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-with-claims
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  jwtRules:
  - issuer: "https://auth.mycompany.com"
    jwksUri: "https://auth.mycompany.com/.well-known/jwks.json"
    # Extract custom claims
    outputPayloadToHeader: "x-jwt-payload"
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: claim-based-authz
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - when:
    - key: request.auth.claims[department]
      values: ["engineering", "operations"]
    - key: request.auth.claims[clearance_level]
      values: ["high", "critical"]
```

This extracts and validates custom JWT claims for authorization.

## Troubleshooting Multi-Issuer Setup

If authentication fails, check these areas:

Verify JWKS endpoints are accessible:

```bash
kubectl run test --image=curlimages/curl --rm -it -- \
  curl https://auth.mycompany.com/.well-known/jwks.json
```

Check JWT token format:

```bash
echo $TOKEN | cut -d '.' -f2 | base64 -d | jq
```

Verify issuer and audience claims match configuration.

Enable debug logging:

```bash
istioctl proxy-config log deploy/httpbin --level jwt:debug
```

Check logs for JWT validation details:

```bash
kubectl logs deploy/httpbin -c istio-proxy --tail=50 | grep jwt
```

## Conclusion

Istio RequestAuthentication with multiple JWT issuers enables multi-tenant applications that accept authentication from various identity providers. Configure multiple jwtRules with different issuers, JWKS endpoints, and audience requirements.

Implement issuer-specific authorization policies to control access based on which identity provider authenticated the user. This is essential for B2B applications, partner integrations, and hybrid authentication scenarios.

Monitor JWT validation metrics and configure appropriate logging for troubleshooting. Test with tokens from each issuer to verify configuration. This gives you flexible, secure authentication supporting diverse user populations.
