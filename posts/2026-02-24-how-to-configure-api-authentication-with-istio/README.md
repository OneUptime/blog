# How to Configure API Authentication with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authentication, JWT, API Security, Kubernetes

Description: Set up API authentication in Istio using JWT validation, RequestAuthentication, and AuthorizationPolicy for secure API access control.

---

API authentication verifies that callers are who they claim to be. Without it, anyone who can reach your API can use it. Istio provides built-in support for JWT (JSON Web Token) authentication at the proxy level, which means you can enforce authentication without modifying your application code. The authentication happens in the Envoy sidecar before the request ever reaches your service.

## How Istio Authentication Works

Istio uses two main resources for API authentication:

- **RequestAuthentication**: Defines how to validate JWT tokens. It specifies the token issuer, the JWKS (JSON Web Key Set) URI for verifying signatures, and where to find the token in the request.

- **AuthorizationPolicy**: Defines who is allowed to access what. After the token is validated, the authorization policy checks the token's claims to decide if the request should be allowed.

These two work together: RequestAuthentication validates the token, and AuthorizationPolicy enforces access rules based on the validated claims.

## Setting Up JWT Authentication

### Step 1: Configure RequestAuthentication

Create a RequestAuthentication resource that tells Istio how to validate JWTs:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
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

Key fields:

- `issuer`: The expected value of the `iss` claim in the JWT. Tokens with a different issuer are rejected.
- `jwksUri`: The URL where Istio can fetch the public keys to verify token signatures. Istio fetches and caches these keys automatically.
- `forwardOriginalToken`: When true, the original JWT is passed to the backend service in the Authorization header.

### Step 2: Handle Token Location

By default, Istio looks for the JWT in the `Authorization` header with a `Bearer` prefix. If your tokens are in a different location, specify it:

```yaml
jwtRules:
- issuer: "https://auth.example.com"
  jwksUri: "https://auth.example.com/.well-known/jwks.json"
  fromHeaders:
  - name: x-jwt-token
  - name: authorization
    prefix: "Bearer "
```

For tokens in query parameters (common for WebSocket connections):

```yaml
jwtRules:
- issuer: "https://auth.example.com"
  jwksUri: "https://auth.example.com/.well-known/jwks.json"
  fromParams:
  - "access_token"
```

### Step 3: Require Authentication

RequestAuthentication only validates tokens that are present. It does NOT reject requests without tokens. To require authentication, add an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
  - from:
    - source:
        notRequestPrincipals: ["*"]
    to:
    - operation:
        paths: ["/v1/*"]
        notPaths: ["/v1/public/*", "/health"]
```

This denies any request to `/v1/*` that doesn't have a valid JWT, while keeping `/v1/public/*` and `/health` accessible without authentication.

## Supporting Multiple Identity Providers

Many applications support multiple authentication providers (Google, GitHub, corporate SSO). Add multiple jwtRules:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: multi-provider-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
  - issuer: "https://accounts.google.com"
    jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
    forwardOriginalToken: true

  - issuer: "https://token.actions.githubusercontent.com"
    jwksUri: "https://token.actions.githubusercontent.com/.well-known/jwks"
    forwardOriginalToken: true

  - issuer: "https://sso.company.com"
    jwksUri: "https://sso.company.com/.well-known/jwks.json"
    forwardOriginalToken: true
```

Istio tries each rule until it finds one that matches the token's issuer. If no rule matches, the token is rejected (but the request might still proceed if no AuthorizationPolicy requires authentication).

## Role-Based Access Control

Use JWT claims for fine-grained access control:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: role-based-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
  # Any authenticated user can read
  - from:
    - source:
        requestPrincipals: ["*"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/v1/users/*", "/v1/products/*"]

  # Only users with "editor" role can create/update
  - from:
    - source:
        requestPrincipals: ["*"]
    to:
    - operation:
        methods: ["POST", "PUT"]
        paths: ["/v1/*"]
    when:
    - key: request.auth.claims[role]
      values: ["editor", "admin"]

  # Only admins can delete
  - from:
    - source:
        requestPrincipals: ["*"]
    to:
    - operation:
        methods: ["DELETE"]
        paths: ["/v1/*"]
    when:
    - key: request.auth.claims[role]
      values: ["admin"]
```

The `request.auth.claims[role]` syntax extracts the `role` claim from the validated JWT. You can use any claim in the token.

For nested claims:

```yaml
when:
- key: request.auth.claims[realm_access][roles]
  values: ["admin"]
```

## Passing Authentication Context to Services

Backend services often need to know who made the request. Istio can extract JWT claims and pass them as headers:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-with-claims
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
    outputPayloadToHeader: "x-jwt-payload"
    outputClaimToHeaders:
    - header: "x-user-id"
      claim: "sub"
    - header: "x-user-email"
      claim: "email"
    - header: "x-user-role"
      claim: "role"
```

The `outputClaimToHeaders` field extracts specific claims and sets them as request headers. Your backend service can read `x-user-id`, `x-user-email`, and `x-user-role` without parsing the JWT itself.

## Per-Service Authentication

Not every service needs the same authentication. Apply different rules to different services:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: admin-service-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: admin-service
  jwtRules:
  - issuer: "https://sso.company.com"
    jwksUri: "https://sso.company.com/.well-known/jwks.json"
    audiences:
    - "admin-portal"
```

The `audiences` field adds an additional check: the token's `aud` claim must include "admin-portal." This prevents tokens issued for other applications from being used to access the admin service.

## Handling Authentication Failures

When authentication fails, Istio returns different HTTP status codes:

- **401 Unauthorized**: The JWT is present but invalid (expired, wrong signature, wrong issuer)
- **403 Forbidden**: The JWT is valid but the AuthorizationPolicy denies the request

Customize the error response:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-unauthenticated
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
  - from:
    - source:
        notRequestPrincipals: ["*"]
    to:
    - operation:
        paths: ["/v1/*"]
```

## Testing Authentication

Test with a valid token:

```bash
TOKEN=$(curl -s -X POST https://auth.example.com/oauth/token \
  -d "grant_type=client_credentials&client_id=test&client_secret=secret" | jq -r .access_token)

curl -H "Authorization: Bearer $TOKEN" https://api.example.com/v1/users
```

Test without a token (should get 403 if AuthorizationPolicy requires it):

```bash
curl -v https://api.example.com/v1/users
```

Test with an invalid token (should get 401):

```bash
curl -v -H "Authorization: Bearer invalid-token" https://api.example.com/v1/users
```

## Debugging Authentication Issues

Check if the RequestAuthentication is applied:

```bash
istioctl analyze -n istio-system
```

Check proxy logs for authentication decisions:

```bash
kubectl logs -l istio=ingressgateway -n istio-system | grep "jwt"
```

Verify the JWKS is cached:

```bash
istioctl proxy-config secret deploy/istio-ingressgateway -n istio-system
```

If Istio can't fetch the JWKS, all token validation will fail. Make sure the gateway can reach the JWKS URI.

Decode and inspect a JWT to verify its claims:

```bash
echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

API authentication with Istio removes the burden from your application code and centralizes it in the infrastructure. Your services receive pre-validated requests with authentication context in the headers. This is cleaner, more secure, and easier to maintain than implementing JWT validation in every service.
