# How to Call Non-Dapr Endpoints from a Dapr Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP, Service Invocation, External Service, Integration

Description: Learn how to call non-Dapr HTTP and gRPC endpoints from a Dapr application using HTTP endpoint components, benefiting from Dapr resiliency and observability.

---

## The Challenge of Calling External Services

When your Dapr application needs to call an external service that does not have a Dapr sidecar, you normally bypass Dapr entirely. However, Dapr provides `HTTPEndpoint` components that let you route calls through the sidecar for external services too - gaining retries, circuit breakers, and tracing.

## Defining an HTTP Endpoint Component

Create a component definition for the external service:

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: payment-gateway
spec:
  baseUrl: https://api.payment-provider.com
  headers:
    - name: Authorization
      secretKeyRef:
        name: payment-secrets
        key: api-key
```

Apply to Kubernetes:

```bash
kubectl apply -f payment-gateway.yaml
```

## Calling the External Endpoint via Dapr

Once the component is registered, invoke it using service invocation syntax with the component name:

```bash
curl -X POST http://localhost:3500/v1.0/invoke/payment-gateway/method/v2/charge \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USD"}'
```

Dapr routes the call to `https://api.payment-provider.com/v2/charge` with the authorization header injected automatically.

## Using the Go SDK

```go
import dapr "github.com/dapr/go-sdk/client"

client, _ := dapr.NewClient()
defer client.Close()

resp, err := client.InvokeMethodWithContent(ctx,
    "payment-gateway",
    "v2/charge",
    "POST",
    &dapr.DataContent{
        ContentType: "application/json",
        Data:        []byte(`{"amount": 100}`),
    },
)
```

## Adding Resiliency to External Calls

Attach a resiliency policy to the HTTP endpoint:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: payment-resiliency
spec:
  targets:
    httpEndpoints:
      payment-gateway:
        retry: retryThrice
        circuitBreaker: openOnErrors
  policies:
    retries:
      retryThrice:
        policy: constant
        maxRetries: 3
        duration: 2s
    circuitBreakers:
      openOnErrors:
        maxRequests: 1
        interval: 60s
        timeout: 30s
        trip: consecutiveFailures > 3
```

## When to Use This Approach

- Calling third-party REST APIs from your services
- Integrating with legacy services that cannot be modified
- Applying uniform observability to all outbound HTTP traffic

## Summary

Dapr `HTTPEndpoint` components let you call external non-Dapr services through the Dapr sidecar, injecting headers and gaining resiliency features. Define the endpoint as a component with `baseUrl` and optional header references, then invoke it using standard service invocation syntax with the component name as the app ID.
