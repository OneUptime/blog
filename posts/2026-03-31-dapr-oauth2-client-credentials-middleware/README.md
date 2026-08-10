# How to Use OAuth2 Client Credentials Middleware in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OAuth2, Middleware, Security, Client Credentials

Description: Learn how to configure the Dapr OAuth2 client credentials middleware to automatically inject access tokens into outbound service-to-service calls.

---

## Introduction

The Dapr OAuth2 Client Credentials middleware (`middleware.http.oauth2clientcredentials`) handles the OAuth2 client credentials flow for machine-to-machine authentication. Unlike the authorization code flow, client credentials uses a client ID and secret to obtain tokens, making it ideal for service-to-service calls that happen without user interaction.

## Use Case

When service A invokes service B through Dapr, the client credentials middleware automatically:
1. Obtains an access token from your identity provider using client credentials
2. Injects the token into the `Authorization` header of the outbound request
3. Refreshes the token transparently when it expires

## Component Configuration

```yaml
# components/oauth2-client-creds.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2clientcredentials
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
    - name: clientId
      value: "service-a-client-id"
    - name: clientSecret
      secretKeyRef:
        name: oauth-credentials
        key: client-secret
    - name: scopes
      value: "api://service-b/.default"
    - name: tokenURL
      value: "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
    - name: headerName
      value: "authorization"
    - name: authStyle
      value: "1"
```

## Pipeline Configuration

Apply the middleware to outbound requests:

```yaml
# config/outbound-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: outbound-pipeline
spec:
  httpPipeline:
    handlers:
      - name: oauth2clientcredentials
        type: middleware.http.oauth2clientcredentials
```

## Applying to Your App

```bash
dapr run \
  --app-id service-a \
  --app-port 8080 \
  --config ./config/outbound-pipeline.yaml \
  --components-path ./components \
  -- python service_a.py
```

## Service A Invoking Service B

With the middleware configured, service invocation automatically includes the token:

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    # Dapr middleware injects the Bearer token automatically
    response = client.invoke_method(
        app_id="service-b",
        method_name="data",
        http_verb="GET",
        data=b""
    )
    print(response.text())
```

## Service B Validating the Token

Service B receives the request with the injected Bearer token and can validate it:

```python
from flask import Flask, request

app = Flask(__name__)

@app.route("/data")
def get_data():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return {"error": "missing token"}, 401
    token = auth.removeprefix("Bearer ")
    # TODO: Validate the token using your JWKS endpoint
    print(f"Received token: {token[:20]}...")
    return {"data": "protected resource"}
```

## Kubernetes Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: outbound-pipeline
  namespace: default
spec:
  httpPipeline:
    handlers:
      - name: oauth2clientcredentials
        type: middleware.http.oauth2clientcredentials
```

```yaml
# deployment annotation
dapr.io/config: "outbound-pipeline"
```

## Token Caching

The middleware caches tokens and refreshes them automatically before expiry. You do not need to manage token lifecycle in your application code.

## Summary

The Dapr OAuth2 Client Credentials middleware automates machine-to-machine authentication for service invocations. It obtains and refreshes tokens from your identity provider, injects them into outbound requests, and handles token expiry transparently. This eliminates auth boilerplate from your service code while enforcing secure service-to-service communication.
