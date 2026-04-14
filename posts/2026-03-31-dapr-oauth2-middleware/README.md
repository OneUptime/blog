# How to Use OAuth 2.0 Authorization with Dapr Middleware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OAuth, Security, Middleware, API

Description: Configure Dapr's OAuth 2.0 middleware to protect service endpoints with token-based authorization without modifying application code.

---

Dapr middleware runs in the request pipeline of the sidecar, enabling you to add OAuth 2.0 token validation to any service without writing authentication code. This guide covers the OAuth2 client credentials and bearer token validation middleware configurations.

## OAuth 2.0 Middleware in Dapr

Dapr supports two OAuth 2.0 middleware patterns:

1. **OAuth2 Client Credentials** - Dapr fetches a token from an IdP and forwards it to upstream services
2. **Bearer Token Validation** - Dapr validates incoming JWT tokens before forwarding requests to your app

## Pattern 1 - OAuth2 Client Credentials

Use this when your service needs to call an OAuth-protected external API. Dapr handles token acquisition and injection.

### Create the OAuth2 Middleware Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2
  namespace: default
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
  - name: clientId
    secretKeyRef:
      name: oauth-credentials
      key: client-id
  - name: clientSecret
    secretKeyRef:
      name: oauth-credentials
      key: client-secret
  - name: scopes
    value: "api://myapi/.default"
  - name: tokenURL
    value: "https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/token"
  - name: headerName
    value: "Authorization"
```

Create the credentials secret:

```bash
kubectl create secret generic oauth-credentials \
  --from-literal=client-id=myapp-client-id \
  --from-literal=client-secret=myapp-client-secret
```

## Pattern 2 - Bearer Token Validation (JWT)

Use this when your service receives calls that should include a valid JWT.

### Create the JWT Middleware Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jwt-validator
  namespace: default
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://login.microsoftonline.com/YOUR_TENANT_ID/discovery/v2.0/keys"
  - name: audience
    value: "api://myapi"
  - name: issuer
    value: "https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0"
```

## Applying Middleware via Dapr Configuration

Reference the middleware in a Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pipeline
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: jwt-validator
      type: middleware.http.bearer
```

Apply the configuration:

```bash
kubectl apply -f jwt-middleware.yaml
kubectl apply -f pipeline-config.yaml
```

Reference the configuration in your deployment:

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "order-service"
    dapr.io/config: "pipeline"
```

## Testing the Middleware

Test with a valid token:

```bash
# Get a token from your IdP
TOKEN=$(curl -s -X POST https://login.microsoftonline.com/TENANT/oauth2/v2.0/token \
  -d "grant_type=client_credentials&client_id=CLIENT_ID&client_secret=SECRET&scope=api://myapi/.default" \
  | jq -r .access_token)

# Call the protected service via Dapr
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3500/v1.0/invoke/order-service/method/orders
```

Test without a token (should return 401):

```bash
curl http://localhost:3500/v1.0/invoke/order-service/method/orders
# Expected: 401 Unauthorized
```

## Combining with Dapr Access Control

Layer OAuth validation with Dapr's access control policies:

```yaml
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: api-gateway
      defaultAction: allow
      namespace: "default"
```

This allows only the `api-gateway` service to call the protected service, and the JWT middleware validates that incoming tokens are valid.

## Summary

Dapr's OAuth 2.0 middleware enables token-based authorization without application code changes. Use the client credentials middleware when your service needs to call OAuth-protected APIs, and the bearer token validation middleware to protect your service's endpoints. Reference middleware in a Dapr Configuration resource and annotate your deployment to apply it. This approach keeps authentication logic in infrastructure configuration rather than application code.
