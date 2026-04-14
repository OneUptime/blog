# How to Write Dapr HTTPEndpoint YAML Specifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTPEndpoint, YAML, Service Invocation, API

Description: Learn how to write Dapr HTTPEndpoint YAML specifications to define named, versioned HTTP endpoints for external service invocation.

---

## What Is a Dapr HTTPEndpoint?

The `HTTPEndpoint` resource lets you reference external HTTP APIs by a logical name instead of hardcoding URLs. Dapr injects the base URL at runtime, keeping your service code decoupled from environment-specific addresses.

## Minimal HTTPEndpoint YAML

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: payment-gateway
  namespace: production
spec:
  baseUrl: https://api.payment-provider.com
```

With this in place, your app can call `http://localhost:3500/v1.0/invoke/payment-gateway/method/charge` and Dapr forwards the request to the real URL.

## Adding Auth Headers

Use `headers` to attach static or secret-backed values:

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: stripe-api
  namespace: production
spec:
  baseUrl: https://api.stripe.com
  headers:
    - name: Authorization
      secretKeyRef:
        name: stripe-secret
        key: api-key
```

The secret must exist in the same namespace:

```bash
kubectl create secret generic stripe-secret \
  --from-literal=api-key=sk_live_xxxx \
  -n production
```

## Scoping Access

Use `scopes` to restrict which app IDs can use the endpoint:

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: internal-crm
  namespace: production
scopes:
  - billing-service
  - sales-service
spec:
  baseUrl: https://crm.internal.corp
```

## Calling the Endpoint from Code

```javascript
const axios = require('axios');

async function chargeCustomer(amount) {
  const daprPort = process.env.DAPR_HTTP_PORT || 3500;
  const response = await axios.post(
    `http://localhost:${daprPort}/v1.0/invoke/stripe-api/method/v1/charges`,
    { amount, currency: 'usd' }
  );
  return response.data;
}
```

## Combining with Resiliency

Reference a Resiliency policy to add retries and circuit breaking to external calls:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: external-api-resiliency
  namespace: production
spec:
  policies:
    retries:
      api-retry:
        policy: exponential
        maxRetries: 3
        maxInterval: 10s
    timeouts:
      api-timeout: 15s
  targets:
    apps:
      stripe-api:
        retry: api-retry
        timeout: api-timeout
```

## Verifying the Endpoint

```bash
# List all HTTPEndpoints in the namespace
kubectl get httpendpoints -n production

# Describe a specific endpoint
kubectl describe httpendpoint stripe-api -n production
```

## Summary

Dapr HTTPEndpoint YAML specs decouple your services from the concrete URLs of external APIs. By combining base URL, secret-backed auth headers, scopes, and resiliency policies, you create a governed and observable integration layer without changing application code.
