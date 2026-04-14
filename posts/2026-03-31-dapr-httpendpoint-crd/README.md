# How to Use Dapr HTTPEndpoint CRD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTPEndpoint, CRD, Service Invocation, External API

Description: Use Dapr's HTTPEndpoint CRD to invoke external HTTP APIs through Dapr's service invocation with automatic header injection, mTLS, and resiliency policies applied to external endpoints.

---

## What is the HTTPEndpoint CRD?

The `HTTPEndpoint` CRD allows you to register external HTTP services (outside your Kubernetes cluster) as named Dapr targets. This lets you invoke external APIs using the same Dapr service invocation API, gaining automatic header injection, resiliency policies, and consistent observability.

## Basic HTTPEndpoint CRD

Register an external payment API:

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: payments-gateway
  namespace: default
spec:
  baseUrl: "https://api.payments.example.com/v1"
```

Now invoke it through Dapr:

```bash
curl http://localhost:3500/v1.0/invoke/payments-gateway/method/charge \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USD"}'
```

Dapr resolves `payments-gateway` to the `baseUrl` and forwards the request to `https://api.payments.example.com/v1/charge`.

## Adding Authentication Headers

Inject API keys or tokens from Kubernetes Secrets:

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: payments-gateway
  namespace: default
spec:
  baseUrl: "https://api.payments.example.com/v1"
  headers:
  - name: Authorization
    secretKeyRef:
      name: payments-api-secret
      key: api-key
  - name: X-Client-Id
    value: "my-service"
  - name: Content-Type
    value: "application/json"
```

The `Authorization` header is injected from the Kubernetes Secret on every request, keeping credentials out of application code.

## Using HTTPEndpoint with Resiliency

Apply a resiliency policy to all calls to the external endpoint:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: external-api-resiliency
  namespace: default
spec:
  policies:
    retries:
      externalRetry:
        policy: exponential
        duration: 1s
        maxInterval: 30s
        maxRetries: 3
    circuitBreakers:
      externalCB:
        maxRequests: 1
        interval: 60s
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      payments-gateway:
        timeout: 10s
        retry: externalRetry
        circuitBreaker: externalCB
```

## Invoking HTTPEndpoints in Application Code

```javascript
const daprClient = new DaprClient();

async function chargeCustomer(amount, currency) {
  const result = await daprClient.invoker.invoke(
    'payments-gateway',
    'charge',
    HttpMethod.POST,
    { amount, currency }
  );
  return result;
}
```

## Scoping HTTPEndpoints

Restrict which apps can use a specific HTTPEndpoint:

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: payments-gateway
  namespace: default
spec:
  baseUrl: "https://api.payments.example.com/v1"
  headers:
  - name: Authorization
    secretKeyRef:
      name: payments-api-secret
      key: api-key
scopes:
- billing-api
- checkout-api
```

## Listing and Inspecting HTTPEndpoints

```bash
kubectl get httpendpoints -n default
kubectl describe httpendpoint payments-gateway -n default
```

## Summary

The Dapr HTTPEndpoint CRD extends Dapr's service invocation to external HTTP APIs, enabling header injection from Kubernetes Secrets, resiliency policies via the Resiliency CRD, and app-level scoping. Applications invoke external services through the same Dapr API used for internal services, providing consistent observability and fault tolerance without embedding credentials in application code.
