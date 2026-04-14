# How to Choose Between Dapr Service Invocation and Direct HTTP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Microservice, Architecture, HTTP

Description: Compare Dapr service invocation with direct HTTP calls to understand when each approach is appropriate for your microservices architecture.

---

## Overview

When building microservices, you can communicate between services using direct HTTP/gRPC calls or by routing through Dapr's service invocation API. Both approaches work, but they serve different purposes. This guide compares the two and helps you decide which fits your situation.

## How Direct HTTP Works

Direct HTTP calls use a service's IP or DNS name to communicate:

```javascript
// Direct HTTP call - Node.js
const axios = require('axios');

async function getOrder(orderId) {
  const response = await axios.get(
    `http://order-service:3001/orders/${orderId}`
  );
  return response.data;
}
```

You manage service discovery, retries, and error handling yourself.

## How Dapr Service Invocation Works

With Dapr, all calls go through the local sidecar, which handles discovery and routing:

```javascript
// Via Dapr service invocation - Node.js
const axios = require('axios');

async function getOrder(orderId) {
  const response = await axios.get(
    `http://localhost:3500/v1.0/invoke/order-service/method/orders/${orderId}`
  );
  return response.data;
}
```

Or using the Dapr SDK:

```javascript
const { DaprClient, HttpMethod } = require('@dapr/dapr');

const client = new DaprClient();

async function getOrder(orderId) {
  const result = await client.invoker.invoke(
    'order-service',
    `orders/${orderId}`,
    HttpMethod.GET
  );
  return result;
}
```

## Key Differences

### Service Discovery

Direct HTTP requires a service registry or DNS-based discovery (Kubernetes DNS, Consul, etc.). Dapr service invocation uses the Dapr name resolution component, which works with Kubernetes DNS, mDNS (self-hosted), or Consul.

```yaml
# Dapr name resolution configuration (Kubernetes default)
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
spec:
  nameResolution:
    component: "kubernetes"
```

### Retries and Resiliency

Direct HTTP requires custom retry logic:

```python
# Python - manual retry with backoff
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

session = requests.Session()
retry = Retry(total=3, backoff_factor=1)
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)
response = session.get('http://order-service:3001/orders/123')
```

Dapr handles retries via a Resiliency policy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
spec:
  policies:
    retries:
      retryPolicy:
        policy: constant
        maxRetries: 3
        duration: 5s
  targets:
    apps:
      order-service:
        retry: retryPolicy
```

### Observability

Dapr automatically generates distributed traces for every service invocation call. Direct HTTP requires manual trace context propagation:

```go
// Go - manual trace propagation for direct HTTP
import (
  "go.opentelemetry.io/otel"
  "go.opentelemetry.io/otel/propagation"
)

req, _ := http.NewRequest("GET", "http://order-service:3001/orders/123", nil)
otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))
resp, _ := http.DefaultClient.Do(req)
```

With Dapr, tracing is automatic - no code changes needed.

### mTLS Security

Dapr automatically encrypts service-to-service traffic with mTLS using its certificate authority. With direct HTTP, you must configure TLS certificates for each service.

## When to Use Dapr Service Invocation

Use Dapr service invocation when:
- You want automatic retries and circuit breakers via Resiliency policies
- You need automatic distributed tracing without code changes
- You want mTLS encryption without managing certificates
- Your team uses multiple programming languages
- You need access control policies (Dapr ACL)

## When to Use Direct HTTP

Use direct HTTP when:
- You need maximum performance with minimal latency overhead
- You are calling external services outside your Dapr-managed cluster
- Your service does not have a Dapr sidecar (batch jobs, CLIs)
- You need full control over connection pooling and keep-alive settings

## Performance Comparison

Dapr service invocation adds an extra network hop (app - sidecar - sidecar - app), which typically adds 1-3ms of latency:

```bash
# Benchmark direct HTTP
ab -n 1000 -c 10 http://order-service:3001/orders/1

# Benchmark via Dapr
ab -n 1000 -c 10 http://localhost:3500/v1.0/invoke/order-service/method/orders/1
```

For most applications, 1-3ms overhead is negligible compared to database query times or business logic. For ultra-low-latency requirements (sub-millisecond), direct gRPC is preferred.

## Summary

Dapr service invocation provides built-in retries, distributed tracing, mTLS, and service discovery at the cost of a small latency overhead. Direct HTTP offers maximum control and performance but requires you to implement resiliency and observability yourself. For most microservices teams, Dapr service invocation is the better default because it reduces boilerplate code and enforces consistent reliability policies across polyglot services. Reserve direct HTTP for external calls or performance-critical hot paths.
