# How to Use OpenID Connect Bearer Middleware in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenID Connect, Middleware, Security, JWT

Description: Learn how to configure the Dapr OpenID Connect bearer token middleware to validate JWTs on incoming requests before they reach your application.

---

## Introduction

The Dapr OpenID Connect (OIDC) bearer middleware (`middleware.http.bearer`) validates JWT bearer tokens on incoming HTTP requests. It fetches the JWKS from your identity provider's discovery endpoint, verifies the token signature and claims, and only forwards requests with valid tokens to your application.

## Component Configuration

```yaml
# components/bearer-auth.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bearerauth
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
    - name: issuer
      value: "https://accounts.google.com"
    - name: audience
      value: "your-client-id.apps.googleusercontent.com"
```

## For Azure AD / Entra ID

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bearerauth
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
    - name: issuer
      value: "https://login.microsoftonline.com/{tenant-id}/v2.0"
    - name: audience
      value: "api://{your-app-id}"
```

## Pipeline Configuration

```yaml
# config/bearer-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: bearer-pipeline
spec:
  httpPipeline:
    handlers:
      - name: bearerauth
        type: middleware.http.bearer
```

## Running with the Middleware

```bash
dapr run \
  --app-id protected-service \
  --app-port 8080 \
  --config ./config/bearer-pipeline.yaml \
  --components-path ./components \
  -- python app.py
```

## Application Code

Your app does not need to validate tokens - Dapr handles it. Only authenticated requests reach your application. If you need to access token claims, parse the JWT from the `Authorization` header:

```python
import json
import base64
from flask import Flask, request

app = Flask(__name__)

@app.route("/api/profile")
def profile():
    # Dapr has already validated the token; only authenticated requests arrive here.
    # To access claims, decode the JWT payload (signature already verified by Dapr).
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
        payload = token.split(".")[1]
        # Add padding for base64 decoding
        payload += "=" * (-len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload))
        user_sub = claims.get("sub", "unknown")
    else:
        user_sub = "unknown"
    return {"message": "Access granted", "user": user_sub}
```

## Kubernetes Deployment

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
        dapr.io/config: "bearer-pipeline"
```

## Testing

```bash
TOKEN=$(curl -s -X POST \
  "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token" \
  -d "grant_type=client_credentials&client_id={id}&client_secret={secret}&scope=api://{app}/.default" \
  | jq -r .access_token)

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3500/v1.0/invoke/protected-service/method/api/profile
```

## Summary

The Dapr OIDC bearer middleware eliminates JWT validation boilerplate from your microservices. Configure the issuer and audience in the component YAML, attach it to the HTTP pipeline via a Configuration resource, and Dapr handles all token verification. Your application code receives only authenticated requests, simplifying security implementation significantly.
