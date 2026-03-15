# How to Configure JWT Authentication for Cloud Endpoints APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Endpoints, JWT, Authentication, API Security

Description: Learn how to configure JWT-based authentication for Google Cloud Endpoints APIs, including provider setup, OpenAPI configuration, and token validation.

---

Cloud Endpoints supports JWT (JSON Web Token) authentication out of the box through ESPv2. When configured, the proxy validates JWTs on every request before forwarding to your backend. This means your backend code does not need to handle token validation at all - by the time a request reaches your service, you know the token is valid.

This guide covers configuring JWT auth with various identity providers, handling different token sources, and debugging common issues.

## How JWT Authentication Works in Cloud Endpoints

The flow is straightforward:

1. Client obtains a JWT from an identity provider (Google, Auth0, Firebase, custom)
2. Client includes the JWT in the Authorization header
3. ESPv2 intercepts the request and validates the JWT
4. ESPv2 checks the token's signature, expiration, issuer, and audience
5. If valid, ESPv2 forwards the request to your backend with the decoded claims
6. If invalid, ESPv2 returns a 401 error

ESPv2 fetches the public keys from the identity provider's JWKS endpoint and caches them, so validation is fast.

## Prerequisites

- Cloud Endpoints deployed with an OpenAPI spec
- An identity provider that issues JWTs (Google, Auth0, Firebase, Okta, etc.)
- The JWKS URI for your identity provider

## Configuring JWT Auth with Google

The most common setup is authenticating with Google-issued tokens.

```yaml
# openapi-with-google-jwt.yaml
swagger: "2.0"
info:
  title: "My Authenticated API"
  version: "1.0.0"
host: "my-api.endpoints.my-project-id.cloud.goog"
basePath: "/"
schemes:
  - "https"

# Security definitions - configure JWT providers
securityDefinitions:
  google_jwt:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://accounts.google.com"
    x-google-jwks_uri: "https://www.googleapis.com/oauth2/v3/certs"
    x-google-audiences: "my-project-id.apps.googleusercontent.com"

# Apply security globally to all endpoints
security:
  - google_jwt: []

x-google-backend:
  address: "https://my-backend-abc123-uc.a.run.app"

paths:
  /protected:
    get:
      summary: "A protected endpoint"
      operationId: "getProtected"
      responses:
        200:
          description: "Success"
        401:
          description: "Unauthorized"
```

The key fields in the security definition are:

- `x-google-issuer`: The expected `iss` claim in the JWT. Must match exactly.
- `x-google-jwks_uri`: Where ESPv2 fetches the public keys to verify token signatures.
- `x-google-audiences`: The expected `aud` claim. This ensures tokens issued for other services cannot be used with your API.

## Configuring JWT Auth with Firebase

Firebase Auth issues JWTs that you can validate with Cloud Endpoints.

```yaml
# Security definition for Firebase Authentication
securityDefinitions:
  firebase:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://securetoken.google.com/my-project-id"
    x-google-jwks_uri: "https://www.googleapis.com/service_accounts/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    x-google-audiences: "my-project-id"
```

## Configuring JWT Auth with Auth0

For Auth0, use your Auth0 domain as the issuer.

```yaml
# Security definition for Auth0
securityDefinitions:
  auth0:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://my-tenant.us.auth0.com/"
    x-google-jwks_uri: "https://my-tenant.us.auth0.com/.well-known/jwks.json"
    x-google-audiences: "https://my-api.example.com"
```

Note the trailing slash on the Auth0 issuer - it is important. Auth0 includes it in the `iss` claim, so it must match exactly.

## Configuring JWT Auth with a Custom Provider

If you issue your own JWTs, you need to host a JWKS endpoint.

```yaml
# Security definition for a custom JWT issuer
securityDefinitions:
  custom_jwt:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://auth.mycompany.com"
    x-google-jwks_uri: "https://auth.mycompany.com/.well-known/jwks.json"
    x-google-audiences: "my-api"
```

Your JWKS endpoint should return a JSON document with your public keys.

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-id-1",
      "use": "sig",
      "alg": "RS256",
      "n": "base64-encoded-modulus",
      "e": "AQAB"
    }
  ]
}
```

## Supporting Multiple Auth Providers

You can configure multiple JWT providers and let clients use any of them.

```yaml
# Multiple authentication providers
securityDefinitions:
  google_jwt:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://accounts.google.com"
    x-google-jwks_uri: "https://www.googleapis.com/oauth2/v3/certs"
    x-google-audiences: "my-project-id.apps.googleusercontent.com"

  firebase:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://securetoken.google.com/my-project-id"
    x-google-jwks_uri: "https://www.googleapis.com/service_accounts/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    x-google-audiences: "my-project-id"

# Accept tokens from either provider
security:
  - google_jwt: []
  - firebase: []
```

When multiple providers are listed in the security array, ESPv2 accepts a token that validates against any of them.

## Per-Endpoint Security Configuration

You can apply different security requirements to different endpoints.

```yaml
paths:
  /public:
    get:
      summary: "Public endpoint - no auth required"
      operationId: "getPublic"
      # Override global security to allow unauthenticated access
      security: []
      responses:
        200:
          description: "Public data"

  /user/profile:
    get:
      summary: "User profile - any auth provider accepted"
      operationId: "getUserProfile"
      security:
        - google_jwt: []
        - firebase: []
      responses:
        200:
          description: "User profile"

  /admin/settings:
    get:
      summary: "Admin settings - only Google auth accepted"
      operationId: "getAdminSettings"
      security:
        - google_jwt: []
      responses:
        200:
          description: "Admin settings"
```

## Accessing JWT Claims in Your Backend

When ESPv2 validates a JWT, it passes the decoded claims to your backend in the `X-Endpoint-API-UserInfo` header (base64-encoded).

```python
# Python Flask example: reading JWT claims from the ESPv2 header
import base64
import json
from flask import Flask, request

app = Flask(__name__)

@app.route("/protected")
def protected():
    # ESPv2 sets this header with the decoded JWT claims
    user_info_header = request.headers.get("X-Endpoint-API-UserInfo", "")

    if user_info_header:
        # Decode the base64-encoded claims
        claims = json.loads(base64.b64decode(user_info_header))
        user_email = claims.get("email", "unknown")
        user_id = claims.get("sub", "unknown")
        return f"Hello {user_email} (ID: {user_id})"

    return "No user info available", 401
```

## Testing JWT Authentication

Test your authenticated endpoints with a valid token.

```bash
# Get a Google ID token for testing
TOKEN=$(gcloud auth print-identity-token --audiences=my-project-id.apps.googleusercontent.com)

# Call the protected endpoint with the token
curl -H "Authorization: Bearer $TOKEN" \
  "https://my-api.endpoints.my-project-id.cloud.goog/protected"

# Test without a token (should get 401)
curl -v "https://my-api.endpoints.my-project-id.cloud.goog/protected"

# Test with an expired or invalid token (should get 401)
curl -H "Authorization: Bearer invalid-token" \
  "https://my-api.endpoints.my-project-id.cloud.goog/protected"
```

## Deploy and Verify

Deploy the updated OpenAPI spec and verify the authentication.

```bash
# Deploy the updated spec
gcloud endpoints services deploy openapi-with-google-jwt.yaml --project=my-project-id

# Wait a minute for ESPv2 to pick up the new config, then test
curl -v "https://my-api.endpoints.my-project-id.cloud.goog/protected"
# Expected: 401 Unauthorized

TOKEN=$(gcloud auth print-identity-token --audiences=my-project-id.apps.googleusercontent.com)
curl -H "Authorization: Bearer $TOKEN" \
  "https://my-api.endpoints.my-project-id.cloud.goog/protected"
# Expected: 200 OK
```

## Troubleshooting

**401 with "Jwt issuer is not configured"**: The `iss` claim in the token does not match any configured `x-google-issuer`. Check for exact string matching including trailing slashes.

**401 with "Audiences in Jwt are not allowed"**: The token's `aud` claim does not match `x-google-audiences`. Verify the audience value.

**401 with "Jwt is expired"**: The token's `exp` claim is in the past. Get a fresh token.

**JWKS fetch errors in ESP logs**: ESPv2 cannot reach the JWKS endpoint. Check network connectivity and ensure the URL is correct.

## Summary

JWT authentication with Cloud Endpoints offloads token validation to the proxy layer. Configure your identity providers in the OpenAPI spec using Google's extensions, deploy, and ESPv2 handles the rest. You can support multiple providers, apply per-endpoint security, and access the validated claims in your backend through headers. The key things to get right are the issuer string (must match exactly), the JWKS URI (must be reachable), and the audience (must match what the token was issued for).
