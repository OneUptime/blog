# How to Implement OAuth2 Authentication with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OAuth2, Authentication, Security, Middleware, JWT, Microservice

Description: Learn how to implement OAuth2 token validation in Dapr using middleware components to protect microservice endpoints without adding auth libraries to every service.

---

Adding OAuth2 JWT validation to every microservice creates code duplication and security drift - teams implement validation slightly differently, some forget token expiry checks, others skip audience validation. Dapr's middleware pipeline lets you handle authentication once at the sidecar level: every incoming request passes through an OAuth2 middleware that validates the Bearer token before the request reaches your app. This guide covers configuring Dapr's OAuth2 middleware and integrating with common identity providers.

## How Dapr Middleware Works

Dapr HTTP middleware sits in the request pipeline of the Dapr sidecar:

```text
Incoming HTTP Request
        |
  Dapr Sidecar
        |
  [Middleware 1: OAuth2 token validation]
        |
  [Middleware 2: Rate limiting (optional)]
        |
  Your App (only receives validated requests)
```

If the middleware rejects a request (e.g., invalid token), your app never sees it. This keeps authentication logic out of application code entirely.

## Configuring the OAuth2 Middleware

Dapr supports three OAuth2-related middleware components:

- `middleware.http.oauth2` - performs the OAuth2 authorization code flow (for browser-based flows)
- `middleware.http.oauth2clientcredentials` - performs client credentials flow (service-to-service)
- `middleware.http.bearer` - validates Bearer JWT tokens

For most service APIs, JWT Bearer validation is the right choice:

```yaml
# components/oauth2-middleware.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-middleware
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://your-identity-provider.com/.well-known/jwks.json"
  - name: audience
    value: "https://your-api.example.com"
  - name: issuer
    value: "https://your-identity-provider.com/"
```

For Auth0:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-middleware
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json"
  - name: audience
    value: "https://YOUR_API_IDENTIFIER"
  - name: issuer
    value: "https://YOUR_DOMAIN.auth0.com/"
```

For Azure AD / Microsoft Entra ID:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-middleware
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://login.microsoftonline.com/YOUR_TENANT_ID/discovery/v2.0/keys"
  - name: audience
    value: "api://YOUR_APP_ID"
  - name: issuer
    value: "https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0"
```

## Applying Middleware via Configuration

Create a Dapr Configuration resource that applies the middleware to all incoming requests:

```yaml
# components/config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
    - name: oauth2-middleware
      type: middleware.http.bearer
  tracing:
    samplingRate: "1"
```

Reference this configuration in your app's Dapr annotations:

```yaml
# Kubernetes pod annotation
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/app-port: "8080"
  dapr.io/config: "appconfig"
```

## Accessing the Validated Token in Your App

After the middleware validates the token, Dapr forwards the request to your app with the original Authorization header intact. You can decode the JWT in your app to extract claims without re-validating:

```python
# app.py
import base64
import json
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

def decode_jwt_claims(token: str) -> dict:
    """Decode JWT claims without re-validating (Dapr already validated)."""
    try:
        # JWT format: header.payload.signature
        payload_b64 = token.split(".")[1]
        # Add padding if needed
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes)
    except Exception:
        return {}

def get_current_user() -> dict:
    """Extract user identity from the validated Bearer token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return {}
    token = auth_header[7:]
    return decode_jwt_claims(token)

@app.route("/orders", methods=["POST"])
def create_order():
    # Dapr has already validated the JWT - safe to use claims
    user = get_current_user()
    user_id = user.get("sub", "unknown")
    email = user.get("email", "")
    
    order = request.json
    order["userId"] = user_id
    order["userEmail"] = email
    
    print(f"Order created by user {user_id} ({email})")
    return jsonify({"status": "created", "orderId": order.get("orderId")}), 201

@app.route("/me", methods=["GET"])
def get_profile():
    user = get_current_user()
    return jsonify({
        "userId": user.get("sub"),
        "email": user.get("email"),
        "name": user.get("name"),
        "roles": user.get("roles", [])
    })
```

## Client Credentials Flow for Service-to-Service

For service-to-service calls, use the OAuth2 client credentials middleware as an outbound middleware to automatically attach tokens:

```yaml
# components/oauth2-client-creds.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-outbound
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
  - name: clientId
    secretKeyRef:
      name: oauth2-credentials
      key: clientId
  - name: clientSecret
    secretKeyRef:
      name: oauth2-credentials
      key: clientSecret
  - name: scopes
    value: "https://your-api.example.com/.default"
  - name: tokenURL
    value: "https://login.microsoftonline.com/YOUR_TENANT/oauth2/v2.0/token"
  - name: headerName
    value: "Authorization"
```

Apply this middleware to outbound calls in the Configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
    - name: oauth2-middleware
      type: middleware.http.bearer
  appHttpPipeline:
    handlers:
    - name: oauth2-outbound
      type: middleware.http.oauth2clientcredentials
```

## Testing with a Local Identity Provider

For local development, use Keycloak or a mock JWT issuer:

```bash
# Run Keycloak locally
docker run -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:23.0 start-dev

# Get a token from Keycloak
TOKEN=$(curl -s -X POST \
  "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=admin&password=admin" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Call your Dapr app with the token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3500/v1.0/invoke/order-service/method/orders \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test-1"}'
```

## Summary

Dapr's middleware pipeline centralizes OAuth2 JWT validation at the sidecar level, removing authentication boilerplate from each microservice. Configure the `middleware.http.bearer` component with your identity provider's JWKS endpoint, audience, and issuer, then reference the configuration in your app's Dapr annotations. The validated token is forwarded to your app with the Authorization header intact so you can extract claims without re-validating. For outbound service-to-service calls, use the `oauth2clientcredentials` middleware to automatically attach tokens managed by the Dapr sidecar.
