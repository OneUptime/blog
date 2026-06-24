# How to Use OAuth2 Authorization Middleware in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OAuth2, Middleware, Security, Authorization

Description: Learn how to configure the Dapr OAuth2 authorization middleware to protect service invocations with OAuth2 authorization code flow and token validation.

---

## Introduction

Dapr's OAuth2 middleware component enables you to protect your services with OAuth2 authorization without adding auth code to each service. When configured, Dapr intercepts incoming HTTP requests and initiates the OAuth2 authorization code flow, redirecting unauthenticated users to the identity provider, exchanging the authorization code for a token, and forwarding the token to your application.

## How It Works

The OAuth2 middleware sits between the Dapr sidecar and your application. For each incoming request, Dapr checks whether the user has completed the OAuth2 authorization code flow. If not, Dapr redirects the client to the authorization server to obtain a token.

## Component Configuration

```yaml
# components/oauth2.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2
spec:
  type: middleware.http.oauth2
  version: v1
  metadata:
    - name: clientId
      value: "your-client-id"
    - name: clientSecret
      secretKeyRef:
        name: oauth-secret
        key: client-secret
    - name: scopes
      value: "openid,profile,email"
    - name: authURL
      value: "https://accounts.google.com/o/oauth2/v2/auth"
    - name: tokenURL
      value: "https://oauth2.googleapis.com/token"
    - name: redirectURL
      value: "https://myapp.example.com/callback"
    - name: authHeaderName
      value: "authorization"
    - name: forceHTTPS
      value: "false"
```

## Applying the Middleware via Configuration

Create a Dapr Configuration resource to apply the middleware to the pipeline:

```yaml
# config/pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pipeline-config
spec:
  httpPipeline:
    handlers:
      - name: oauth2
        type: middleware.http.oauth2
```

## Referencing the Configuration in Your App

```bash
dapr run \
  --app-id my-service \
  --app-port 8080 \
  --config ./config/pipeline.yaml \
  --components-path ./components \
  -- python app.py
```

## Kubernetes Deployment with Config

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/app-port: "8080"
        dapr.io/config: "pipeline-config"
```

## Accessing the Token in Your Application

After Dapr completes the OAuth2 authorization code flow, it forwards the request with the obtained token in the authorization header. Your app can read it directly:

```python
from flask import Flask, request

app = Flask(__name__)

@app.route("/protected")
def protected():
    auth_header = request.headers.get("Authorization", "")
    # Token was obtained via Dapr OAuth2 authorization code flow
    return {"message": "Access granted", "auth": auth_header[:20] + "..."}
```

## Testing OAuth2 Flow Locally

For local development, use a mock OAuth2 server:

```bash
# Run a local OAuth2 mock server
docker run -p 8180:8080 ghcr.io/navikt/mock-oauth2-server:latest

# Update component to point to mock server
# authURL: http://localhost:8180/default/authorization
# tokenURL: http://localhost:8180/default/token
```

## Summary

Dapr OAuth2 middleware offloads the OAuth2 authorization code flow from your services to the sidecar. Configure the middleware component with your OAuth2 provider details, attach it to the HTTP pipeline via a Configuration resource, and apply the config to your app. Dapr handles the redirect to the identity provider, exchanges the authorization code for a token, and forwards authenticated requests with the token to your service.
