# How to Invoke External HTTP Endpoints Through Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP, External Service, HTTPEndpoint, Integration

Description: Learn how to use Dapr's HTTPEndpoint component to route calls to external HTTP APIs through the Dapr sidecar, gaining observability and resiliency for outbound traffic.

---

## Overview

Dapr's `HTTPEndpoint` component lets you define external HTTP services as named Dapr components. Your application calls them using the standard service invocation API, and Dapr handles header injection, TLS, and resiliency policies.

## Defining the HTTPEndpoint Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: stripe-api
  namespace: default
spec:
  baseUrl: https://api.stripe.com
  headers:
    - name: Authorization
      secretKeyRef:
        name: stripe-secret
        key: api-key
    - name: Stripe-Version
      value: "2023-10-16"
```

Apply the component:

```bash
kubectl apply -f stripe-api.yaml
kubectl create secret generic stripe-secret \
  --from-literal=api-key="Bearer sk_live_xxxx"
```

## Invoking the External Endpoint

```bash
curl -X POST http://localhost:3500/v1.0/invoke/stripe-api/method/v1/charges \
  -H "Content-Type: application/json" \
  -d '{"amount": 2000, "currency": "usd", "source": "tok_visa"}'
```

Dapr routes this to `https://api.stripe.com/v1/charges` with the Authorization header injected from the secret.

## Using Python

```python
import requests

response = requests.post(
    'http://localhost:3500/v1.0/invoke/stripe-api/method/v1/charges',
    json={"amount": 2000, "currency": "usd", "source": "tok_visa"},
    headers={"Content-Type": "application/json"}
)
print(response.json())
```

## Attaching a Resiliency Policy

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: stripe-resiliency
spec:
  targets:
    httpEndpoints:
      stripe-api:
        retry: retryThrice
        timeout: fiveSeconds
  policies:
    retries:
      retryThrice:
        policy: exponential
        maxRetries: 3
        duration: 1s
    timeouts:
      fiveSeconds: 5s
```

## TLS Configuration

For endpoints with custom TLS certificates:

```yaml
spec:
  baseUrl: https://internal-api.company.com
  clientTLS:
    rootCA:
      secretKeyRef:
        name: tls-secrets
        key: ca.crt
    certificate:
      secretKeyRef:
        name: tls-secrets
        key: tls.crt
    privateKey:
      secretKeyRef:
        name: tls-secrets
        key: tls.key
```

## Summary

Dapr HTTPEndpoint components let you invoke external APIs through the Dapr sidecar without hardcoding base URLs or credentials in your application code. Define the endpoint with a `baseUrl` and header references from Kubernetes secrets, then invoke it like any other Dapr service using the component name as the app ID.
