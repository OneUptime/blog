# How to Use Dapr HTTP Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP, Binding, Microservice, Output Binding

Description: Learn how to use the Dapr HTTP output binding to call external HTTP services from your microservices without hardcoding URLs or managing HTTP clients.

---

## What Is the Dapr HTTP Output Binding

The Dapr HTTP output binding lets your application invoke external HTTP endpoints through the Dapr sidecar. Instead of making HTTP calls directly and managing retry logic, TLS configuration, and service discovery yourself, you offload that to Dapr via a component configuration.

This is useful when calling third-party webhooks, REST APIs, or internal services where you want Dapr to manage the transport concerns.

## Prerequisites

- Dapr CLI installed and initialized
- An application that needs to call an external HTTP endpoint
- Basic familiarity with Dapr components

## Define the HTTP Binding Component

Create a component YAML file:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: external-api
  namespace: default
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: "https://api.example.com/webhook"
```

The `url` field is the base URL of the external service. You can override the path at invocation time via metadata and set the HTTP method via the `operation` field.

## Invoke the HTTP Binding from Your Application

Use the Dapr HTTP API or SDK to trigger the binding. Here is an example using the Dapr HTTP API directly:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/external-api \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "event": "order_created",
      "orderId": "12345"
    },
    "metadata": {
      "path": "/orders/notify"
    },
    "operation": "post"
  }'
```

The `metadata.path` overrides the path appended to the base URL. The `operation` field maps to the HTTP method.

## Use the Node.js SDK

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function notifyExternalService(orderId) {
  const response = await client.binding.send('external-api', 'post', {
    event: 'order_created',
    orderId: orderId,
  }, {
    path: '/orders/notify',
  });

  console.log('Response from external API:', response);
}

notifyExternalService('12345');
```

## Use the Python SDK

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    resp = client.invoke_binding(
        binding_name='external-api',
        operation='post',
        data='{"event":"order_created","orderId":"12345"}',
        binding_metadata={
            "path": "/orders/notify",
            "Content-Type": "application/json"
        }
    )
    print("Response:", resp.text())
```

## Supported Operations

The HTTP output binding supports several operations that map to HTTP methods:

```text
create  - HTTP PUT
get     - HTTP GET
post    - HTTP POST
put     - HTTP PUT
patch   - HTTP PATCH
delete  - HTTP DELETE
options - HTTP OPTIONS
head    - HTTP HEAD
trace   - HTTP TRACE
```

## Pass Custom Headers

You can pass request headers through the binding metadata:

```javascript
const response = await client.binding.send('external-api', 'post',
  { payload: 'data' },
  {
    path: '/notify',
    Authorization: 'Bearer my-token',
    'X-Custom-Header': 'my-value',
  }
);
```

## Handle Errors and Retries

Configure Dapr resiliency policies to retry failed HTTP calls:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: binding-resiliency
spec:
  policies:
    retries:
      http-retry:
        policy: exponential
        maxRetries: 3
        duration: 2s
  targets:
    components:
      external-api:
        outbound:
          retry: http-retry
```

## Summary

The Dapr HTTP output binding provides a clean abstraction for calling external HTTP services from your microservices, centralizing URL configuration in component YAML and supporting all standard HTTP methods via a simple API. It integrates with Dapr's resiliency policies for automatic retries and works transparently across self-hosted and Kubernetes deployments without changing your application code.
