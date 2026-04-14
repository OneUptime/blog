# How to Implement OAuth2 Authorization Code Flow with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OAuth2, Security, Middleware, Authentication

Description: Learn how to implement the OAuth2 Authorization Code flow with Dapr middleware to protect HTTP endpoints with identity provider authentication automatically.

---

The OAuth2 Authorization Code flow is the most secure OAuth2 grant type for web applications. Dapr's OAuth2 middleware intercepts incoming requests, redirects unauthenticated users to an identity provider, and injects the access token into upstream requests - all without modifying application code.

## Prerequisites

Register your application with an OAuth2 identity provider (Azure AD, Google, Okta, etc.) and obtain:
- Client ID
- Client Secret
- Authorization endpoint
- Token endpoint

## Store OAuth2 Credentials in a Secret Store

```bash
kubectl create secret generic oauth2-secret \
  --from-literal=clientSecret=your-client-secret \
  -n default
```

## OAuth2 Middleware Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2
  namespace: default
spec:
  type: middleware.http.oauth2
  version: v1
  metadata:
  - name: clientId
    value: "your-client-id"
  - name: clientSecret
    secretKeyRef:
      name: oauth2-secret
      key: clientSecret
  - name: scopes
    value: "openid,profile,email"
  - name: authURL
    value: "https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize"
  - name: tokenURL
    value: "https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token"
  - name: redirectURL
    value: "https://myapp.example.com/oauth2/callback"
  - name: authHeaderName
    value: "Authorization"
  - name: forceHTTPS
    value: "false"
```

## Apply Middleware via Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: oauth2-config
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: oauth2
      type: middleware.http.oauth2
```

## Annotate the Protected Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: protected-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "protected-service"
        dapr.io/app-port: "8080"
        dapr.io/config: "oauth2-config"
```

## Application Code - Reading the Injected Token

Once the middleware handles authentication, your app receives the token in the `Authorization` header:

```python
from flask import Flask, request, jsonify
import jwt

app = Flask(__name__)

@app.route('/api/profile', methods=['GET'])
def get_profile():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Unauthorized"}), 401

    token = auth_header.split(' ')[1]
    # Decode without verification (token was obtained directly from the IdP by Dapr)
    claims = jwt.decode(token, options={"verify_signature": False})

    return jsonify({
        "user": claims.get("preferred_username"),
        "email": claims.get("email"),
        "name": claims.get("name")
    })
```

## Testing the OAuth2 Flow

```bash
# Access the protected endpoint (will redirect to IdP if not authenticated)
curl -v http://localhost:3500/v1.0/invoke/protected-service/method/api/profile

# Test with a pre-obtained access token
ACCESS_TOKEN=$(curl -X POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token \
  -d "grant_type=client_credentials&client_id=...&client_secret=...&scope=...api/.default" \
  | jq -r '.access_token')

curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:3500/v1.0/invoke/protected-service/method/api/profile
```

## Summary

Dapr's OAuth2 middleware implements the Authorization Code flow transparently - your application code receives pre-authenticated requests with tokens already injected into headers. Configure the middleware with your identity provider's endpoints and apply it via a Configuration resource. This separates authentication concerns from business logic cleanly.
