# How to Implement Content-Based Routing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Content Routing, Traffic Management, Service Mesh, VirtualService

Description: Implement content-based routing in Istio to route requests based on headers, URI paths, query parameters, and request body attributes using VirtualService rules.

---

Content-based routing means sending requests to different backends based on what is in the request. Not just the destination hostname, but the actual content: headers, URI paths, query parameters, method types, and even request body attributes. This is a fundamental pattern for microservices where a single entry point needs to fan out to many different services based on the request details.

Istio's VirtualService resource is the primary tool for content-based routing. It supports matching on many request attributes and routing matched traffic to specific destinations.

## Routing Based on URI Path

The most common form of content-based routing is path-based. Different API paths go to different microservices:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-router
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /api/users
    route:
    - destination:
        host: user-service
        port:
          number: 80
  - match:
    - uri:
        prefix: /api/orders
    route:
    - destination:
        host: order-service
        port:
          number: 80
  - match:
    - uri:
        prefix: /api/products
    route:
    - destination:
        host: product-service
        port:
          number: 80
  - route:
    - destination:
        host: default-service
        port:
          number: 80
```

Istio supports three URI matching modes:

- `prefix`: Matches the beginning of the URI
- `exact`: Matches the full URI exactly
- `regex`: Matches against a regular expression

```yaml
  http:
  - match:
    - uri:
        exact: /healthz
    route:
    - destination:
        host: health-service
  - match:
    - uri:
        regex: "/api/v[0-9]+/users/.*"
    route:
    - destination:
        host: user-service
```

## Routing Based on HTTP Headers

Header-based routing lets you direct traffic based on custom headers. This is useful for version routing, tenant isolation, and feature flags:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: production
spec:
  hosts:
  - product-service
  http:
  - match:
    - headers:
        x-api-version:
          exact: "v2"
    route:
    - destination:
        host: product-service
        subset: v2
  - match:
    - headers:
        x-api-version:
          exact: "v1"
    route:
    - destination:
        host: product-service
        subset: v1
  - route:
    - destination:
        host: product-service
        subset: v1
```

You can match headers using `exact`, `prefix`, and `regex` - the same modes as URI matching.

## Routing Based on HTTP Method

Different HTTP methods can go to different services. For example, read operations go to a read-optimized service and writes go to a write service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: data-service
  namespace: production
spec:
  hosts:
  - data-service
  http:
  - match:
    - method:
        exact: GET
    route:
    - destination:
        host: data-reader
        port:
          number: 80
  - match:
    - method:
        regex: "POST|PUT|PATCH|DELETE"
    route:
    - destination:
        host: data-writer
        port:
          number: 80
```

## Routing Based on Query Parameters

Istio VirtualService supports matching on query parameters. This can route requests based on parameter values:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: search-service
  namespace: production
spec:
  hosts:
  - search-service
  http:
  - match:
    - queryParams:
        format:
          exact: "json"
    route:
    - destination:
        host: search-json-service
  - match:
    - queryParams:
        format:
          exact: "xml"
    route:
    - destination:
        host: search-xml-service
  - route:
    - destination:
        host: search-json-service
```

A request to `search-service?format=json` goes to the JSON service, and `search-service?format=xml` goes to the XML service.

## Combining Multiple Match Conditions

You can combine match criteria. When you put multiple conditions in the same `match` block, they are all ANDed together - every condition must be true:

```yaml
  http:
  - match:
    - headers:
        x-tenant:
          exact: "premium"
      uri:
        prefix: /api/reports
      method:
        exact: GET
    route:
    - destination:
        host: premium-reports-service
```

This matches only GET requests to `/api/reports` with the header `x-tenant: premium`. All three conditions must be satisfied.

For OR logic, use multiple `match` entries:

```yaml
  http:
  - match:
    - headers:
        x-tenant:
          exact: "premium"
    - headers:
        x-tenant:
          exact: "enterprise"
    route:
    - destination:
        host: premium-service
```

This routes requests from either premium OR enterprise tenants to the premium service.

## Content-Based Routing for Multi-Tenant Systems

Multi-tenant architectures often need to route different tenants to different backends. Maybe you have dedicated infrastructure for large tenants:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tenant-router
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  # Large tenants get dedicated backends
  - match:
    - headers:
        x-tenant-id:
          exact: "acme-corp"
    route:
    - destination:
        host: api-service-acme
        port:
          number: 80
  - match:
    - headers:
        x-tenant-id:
          exact: "mega-inc"
    route:
    - destination:
        host: api-service-mega
        port:
          number: 80
  # Everyone else uses shared infrastructure
  - route:
    - destination:
        host: api-service-shared
        port:
          number: 80
```

## URI Rewriting

When routing based on URI content, you often need to rewrite the URI before forwarding. The upstream service might not expect the routing prefix:

```yaml
  http:
  - match:
    - uri:
        prefix: /api/v2/users
    rewrite:
      uri: /users
    route:
    - destination:
        host: user-service-v2
        port:
          number: 80
```

A request to `/api/v2/users/123` gets rewritten to `/users/123` before reaching the user-service-v2.

## Routing Based on Authority (Host Header)

You can match on the authority (Host header) for services that handle multiple domains:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: multi-domain-router
  namespace: production
spec:
  hosts:
  - "*.example.com"
  gateways:
  - api-gateway
  http:
  - match:
    - authority:
        exact: "api.example.com"
    route:
    - destination:
        host: api-service
  - match:
    - authority:
        exact: "admin.example.com"
    route:
    - destination:
        host: admin-service
  - match:
    - authority:
        regex: ".*\\.example\\.com"
    route:
    - destination:
        host: default-service
```

## Content-Based Routing with Weighted Splits

You can combine content matching with weighted traffic splitting. Route 90% of v2 API traffic to the new backend and 10% to the old one:

```yaml
  http:
  - match:
    - headers:
        x-api-version:
          exact: "v2"
    route:
    - destination:
        host: api-service
        subset: new
      weight: 90
    - destination:
        host: api-service
        subset: legacy
      weight: 10
```

## Debugging Content-Based Routing

When routes do not match as expected, debugging helps:

1. Check the VirtualService is applied:

```bash
kubectl get virtualservice -n production
kubectl describe virtualservice api-router -n production
```

2. Check Envoy routing configuration:

```bash
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET config_dump > envoy_config.json
```

3. Test with explicit headers:

```bash
kubectl exec deploy/sleep -- curl -v http://api-service \
  -H "x-api-version: v2" \
  -H "x-tenant-id: acme-corp"
```

4. Check proxy logs:

```bash
kubectl logs deploy/my-app -c istio-proxy --tail=50
```

## Order Matters

Istio evaluates match rules from top to bottom and uses the first match. Put more specific rules before more general ones:

```yaml
  http:
  # Specific: exact path match
  - match:
    - uri:
        exact: /api/users/me
    route:
    - destination:
        host: profile-service
  # General: prefix match
  - match:
    - uri:
        prefix: /api/users
    route:
    - destination:
        host: user-service
  # Default: catch-all
  - route:
    - destination:
        host: default-service
```

If you put the prefix match first, `/api/users/me` would match it and never reach the exact match rule.

## Summary

Content-based routing in Istio uses VirtualService match rules to inspect URI paths, headers, methods, query parameters, and authority. You can combine conditions with AND/OR logic, rewrite URIs before forwarding, and split traffic by weight. Always order your match rules from most specific to least specific. This pattern is foundational for API gateways, multi-tenant routing, version management, and microservice decomposition.
