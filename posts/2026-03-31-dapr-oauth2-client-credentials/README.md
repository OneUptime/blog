# How to Configure OAuth 2.0 Client Credentials Flow in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OAuth2, Security, Authentication, Microservice

Description: Learn how to configure OAuth 2.0 Client Credentials Flow in Dapr to secure service-to-service communication using standard identity protocols.

---

## Overview

The OAuth 2.0 Client Credentials flow is designed for machine-to-machine authentication. In Dapr, you can use this flow via middleware to validate tokens on incoming requests and attach tokens to outgoing requests. This enables secure API calls between microservices without user interaction.

## Configuring the OAuth2 Client Credentials Middleware

Dapr supports OAuth 2.0 through its middleware pipeline. You configure a `middleware.http.oauth2clientcredentials` component to request tokens from an identity provider and inject them as `Authorization` headers.

Create a component YAML:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-client
  namespace: default
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
  - name: clientId
    value: "my-service-client-id"
  - name: clientSecret
    secretKeyRef:
      name: oauth-secret
      key: clientSecret
  - name: scopes
    value: "api://my-api/.default"
  - name: tokenURL
    value: "https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token"
  - name: headerName
    value: "Authorization"
```

Store the client secret in a Kubernetes secret:

```bash
kubectl create secret generic oauth-secret \
  --from-literal=clientSecret=your-client-secret
```

## Attaching the Middleware to a Pipeline

You need to reference the middleware in a `Configuration` object and attach it to your Dapr sidecar:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pipeline-with-oauth2
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: oauth2-client
      type: middleware.http.oauth2clientcredentials
```

Apply this configuration:

```bash
kubectl apply -f oauth2-middleware.yaml
kubectl apply -f pipeline-config.yaml
```

Annotate your deployment to use the configuration:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "my-service"
  dapr.io/config: "pipeline-with-oauth2"
```

## Validating the Token on the Receiving Service

For the receiving service to validate incoming tokens, use Dapr's `middleware.http.bearer` middleware. This middleware verifies JWT tokens by checking the issuer and audience claims against the identity provider's public keys:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bearer-token-validator
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: audience
    value: "my-api-client-id"
  - name: issuer
    value: "https://login.microsoftonline.com/{tenant-id}/v2.0"
```

## Testing the Flow

Use curl to verify the header is injected correctly by calling the Dapr HTTP API:

```bash
curl -X GET http://localhost:3500/v1.0/invoke/target-service/method/hello \
  -H "Content-Type: application/json"
```

Check the logs of the target service to confirm the `Authorization: Bearer <token>` header arrived.

## Summary

Dapr's OAuth 2.0 Client Credentials middleware lets you add token-based authentication to outbound service calls without changing application code. Combine it with a validator middleware on the receiving end to achieve full machine-to-machine security using standard identity providers like Azure AD or Keycloak.
