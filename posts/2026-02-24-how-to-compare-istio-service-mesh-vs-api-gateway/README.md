# How to Compare Istio Service Mesh vs API Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Gateway, Service Mesh, Kubernetes, Architecture

Description: A practical comparison of Istio service mesh and API gateways explaining their different roles, where they overlap, and how they work together in a microservices architecture.

---

"Should we use Istio or an API gateway?" is a question that comes up in almost every microservices architecture discussion. The answer is usually "both," but understanding why requires knowing what each tool actually does and where their responsibilities start and end.

Service meshes and API gateways overlap in some areas, which creates confusion. This guide breaks down the actual differences and explains how they complement each other.

## What an API Gateway Does

An API gateway sits at the edge of your infrastructure and manages traffic from external clients (browsers, mobile apps, third-party integrations). Think of it as the front door to your system.

Common API gateway functions:
- Authentication and API key validation
- Rate limiting per client or API key
- Request/response transformation
- API versioning
- Developer portal and API documentation
- Monetization (usage tracking, billing)
- Protocol translation (REST to gRPC, GraphQL to REST)
- Request aggregation (combining multiple backend calls into one response)

Popular API gateways include Kong, AWS API Gateway, Apigee, Azure API Management, and Tyk.

```yaml
# Kong API Gateway route configuration
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: rate-limited-api
route:
  strip_path: true
  protocols:
    - https
plugin:
  - name: rate-limiting
    config:
      minute: 100
      policy: redis
  - name: key-auth
    config:
      key_names:
        - x-api-key
```

## What Istio Service Mesh Does

Istio manages traffic between your internal services (east-west traffic). It runs alongside your applications and handles the networking concerns that every service needs but should not implement individually.

Common service mesh functions:
- Mutual TLS between services
- Service-to-service authorization
- Traffic routing (canary deployments, A/B testing)
- Retries, timeouts, circuit breaking
- Observability (metrics, traces, access logs)
- Fault injection for resilience testing
- Load balancing across service instances

```yaml
# Istio internal traffic management
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews-routing
spec:
  hosts:
    - reviews
  http:
    - match:
        - sourceLabels:
            app: productpage
      route:
        - destination:
            host: reviews
            subset: v2
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx
```

## Where They Overlap

The confusion comes from the overlap. Both can do:
- TLS termination
- Rate limiting
- Traffic routing
- Authentication
- Load balancing
- Observability

But the context is different. An API gateway does these things for external client traffic. A service mesh does them for internal service-to-service traffic. The policies, identities, and requirements are different in each case.

For example:
- **Rate limiting at the API gateway**: 100 requests per minute per API key for external clients
- **Rate limiting in the service mesh**: circuit breaking that trips if error rate exceeds 50% between two internal services

These are fundamentally different use cases even though they both involve controlling traffic flow.

## The Architecture Together

Here is how they typically work together:

```
External Client
      |
[API Gateway]  <-- Authentication, rate limiting, API key validation,
      |             request transformation, developer-facing concerns
      |
[Istio Ingress Gateway]  <-- TLS termination, mesh entry point
      |
[Service A] ---> [Service B] ---> [Service C]
      |                |                |
    Envoy           Envoy            Envoy

  <-- mTLS, retries, circuit breaking, traffic splitting,
      service-level authorization, observability -->
```

The API gateway handles the "business" layer of API management. The service mesh handles the "infrastructure" layer of service-to-service communication.

## When People Try to Use One for Both

Some teams try to use only an API gateway, pointing it at every service. This breaks down because:

1. **N-squared routing problem**: If you have 50 services, each potentially calling 10 others, you would need to route 500 service-to-service paths through the gateway. The gateway becomes a bottleneck and a single point of failure.

2. **Latency**: Routing internal traffic through a centralized gateway adds a network hop. Instead of Service A calling Service B directly, it goes A -> Gateway -> B.

3. **Missing mesh features**: API gateways do not typically handle mTLS between all services, sidecar-based observability, or service-level circuit breaking.

Other teams try to use only Istio for everything, including external API management. This misses important features:

1. **No API key management**: Istio does not have a concept of API keys, developer plans, or usage quotas for external consumers.

2. **No developer portal**: Istio does not provide API documentation, developer onboarding, or self-service API key provisioning.

3. **No request transformation**: Istio's VirtualService can modify headers but cannot transform request or response bodies.

4. **No protocol translation**: Istio routes traffic; it does not translate between protocols like REST to gRPC.

## The Istio Ingress Gateway Complication

Istio's ingress gateway can look a lot like an API gateway. It sits at the edge, handles TLS, does routing, and can even do JWT validation. So where does the API gateway end and Istio's ingress gateway begin?

The practical answer is:

- **Istio ingress gateway**: Handles mesh-level concerns. TLS termination, mTLS to backend services, VirtualService routing, mesh-wide AuthorizationPolicy.

- **API gateway**: Handles product-level concerns. API key management, per-consumer rate limiting, request transformation, API documentation, monetization.

If your API is purely internal (consumed only by your own services), the Istio ingress gateway might be all you need. If your API is external (consumed by third parties, partners, or public users), you probably need an API gateway in front.

## Using Both: Practical Configuration

Here is what a combined setup looks like:

```yaml
# Kong API Gateway handles external API management
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: external-api
  annotations:
    konghq.com/plugins: rate-limiting,key-auth
spec:
  ingressClassName: kong
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: istio-ingressgateway
                port:
                  number: 80
---
# Istio handles mesh routing from the gateway onward
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
    - api.example.com
  gateways:
    - mesh-gateway
  http:
    - match:
        - uri:
            prefix: /v1/products
      route:
        - destination:
            host: product-service
      retries:
        attempts: 3
    - match:
        - uri:
            prefix: /v1/orders
      route:
        - destination:
            host: order-service
---
# Istio handles service-to-service authorization
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-service-policy
spec:
  selector:
    matchLabels:
      app: order-service
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/product-service
              - cluster.local/ns/default/sa/istio-ingressgateway
```

## Decision Framework

Ask these questions:

1. **Do external consumers (outside your organization) use your API?** If yes, you need an API gateway for API key management, rate limiting, and developer experience.

2. **Do you have more than a few services communicating with each other?** If yes, a service mesh gives you mTLS, observability, and traffic management for internal traffic.

3. **Do you need to transform requests or translate protocols at the edge?** If yes, that is an API gateway function.

4. **Do you need canary deployments and traffic splitting between service versions?** If yes, that is a service mesh function.

5. **Do you need to enforce different security policies for external vs internal traffic?** If yes, use both. The API gateway enforces external policies, and the mesh enforces internal ones.

## Summary

An API gateway and a service mesh serve different roles. The API gateway manages the relationship between your system and external consumers. The service mesh manages the relationships between your internal services. They overlap on basic features like routing and TLS, but the context and requirements are different. Most production microservices architectures benefit from using both, with the API gateway handling external traffic management and Istio handling internal service-to-service concerns.
