# Dapr vs Envoy: Building Blocks vs Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Envoy, Proxy, Service Mesh, Microservice

Description: Compare Dapr and Envoy Proxy to understand their different abstraction levels and when each is the right tool for your microservices architecture.

---

Dapr and Envoy are often mentioned together in microservices conversations, but comparing them directly is somewhat like comparing a database ORM to a network switch. They operate at fundamentally different levels of abstraction.

## What Envoy Is

Envoy is a high-performance L4/L7 proxy written in C++. It is the data plane component used by service meshes like Istio, Consul Connect, and AWS App Mesh. On its own, Envoy handles:

- TCP, HTTP/1.1, HTTP/2, and HTTP/3 (QUIC) proxying
- Load balancing (round-robin, least request, ring hash)
- Circuit breaking
- Rate limiting
- TLS termination and origination
- Observability through access logs and metrics

Envoy is configured through its xDS API - a set of discovery services that push routes, clusters, listeners, and endpoints dynamically.

## What Dapr Is

Dapr operates one layer above Envoy. Instead of managing network connections, Dapr provides application-level APIs:

```bash
# Dapr state management - no database driver needed
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"user-123","value":{"name":"Alice"}}]'

# Dapr pub/sub - no Kafka client needed
curl -X POST http://localhost:3500/v1.0/publish/pubsub/user-events \
  -H "Content-Type: application/json" \
  -d '{"userId":"123","event":"login"}'
```

## Where They Overlap

Both Dapr and Envoy handle service-to-service communication. Dapr uses gRPC internally to route invocations between services. Envoy can intercept that gRPC traffic and add load balancing and observability. The overlap is specifically in the service invocation building block.

## Dapr Middleware and Envoy Filters

Dapr supports HTTP middleware that runs in the sidecar for requests going to your app. Envoy HTTP filters do a similar job but at the network layer. For complex routing logic (JWT verification, request transformation), either can work:

```yaml
# Dapr middleware for OAuth2
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2
spec:
  type: middleware.http.oauth2
  version: v1
  metadata:
  - name: clientId
    value: myclientid
```

Envoy does this via its JWT authentication filter, with no application awareness required.

## When to Choose Envoy (via a Service Mesh)

- You need advanced traffic management with no application changes
- You have polyglot services that cannot easily integrate an SDK
- You need fine-grained L7 policies across the entire cluster

## When to Choose Dapr

- You need portable infrastructure abstractions (state, messaging, secrets)
- You want to build actor-based or workflow-driven services
- Your team values API-driven component swapping over infrastructure configuration

## Running Both

Dapr and Envoy (via Istio or Consul) coexist well. Envoy handles the network layer while Dapr handles the application layer:

```yaml
# Disable Dapr mTLS when Envoy/Istio handles it
spec:
  mtls:
    enabled: false
```

## Summary

Envoy is a network proxy operating at the TCP/HTTP layer, forming the backbone of many service meshes. Dapr is an application runtime providing building blocks like state management, pub/sub, and actors. They are complementary - Envoy manages the network, Dapr manages application-level infrastructure concerns. Use both together for maximum flexibility.
