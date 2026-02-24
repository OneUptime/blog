# How to Route Traffic Based on URI Path in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, VirtualService, URI Routing, Traffic Management

Description: How to configure URI path-based routing in Istio using VirtualService, including prefix matching, exact matching, regex patterns, and URI rewriting.

---

URI path-based routing is one of the most commonly used traffic management patterns in Istio. It lets you direct requests to different backend services based on the URL path, which is essential for building API gateways, microservice frontends, and multi-version deployments. Instead of running a separate reverse proxy to handle path-based routing, you configure it declaratively through VirtualService resources and Istio handles the rest.

## When to Use URI-Based Routing

URI routing is useful for:

- Directing `/api/v1/*` to API version 1 and `/api/v2/*` to API version 2
- Routing different path prefixes to different microservices behind a single domain
- Migrating from a monolith to microservices by gradually moving paths to new services
- Serving static assets from a CDN service and dynamic content from an application service

## Prerequisites

You need:

- An Istio mesh with a Gateway configured for your domain
- Backend services deployed with sidecar injection
- A DestinationRule for each target service

Here is a Gateway for the examples:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: my-app
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "myapp.example.com"
```

## Prefix Matching

The most common form of URI routing matches path prefixes:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp-routing
  namespace: my-app
spec:
  hosts:
  - "myapp.example.com"
  gateways:
  - my-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /static
    route:
    - destination:
        host: static-service
        port:
          number: 80
  - route:
    - destination:
        host: frontend-service
        port:
          number: 3000
```

This configuration:

- Sends `/api/anything` to `api-service`
- Sends `/static/anything` to `static-service`
- Sends everything else to `frontend-service`

The prefix match includes the prefix itself. A request to `/api/users` is forwarded to `api-service` as `/api/users` (the path is not stripped).

## Exact Matching

Match a specific path exactly:

```yaml
http:
- match:
  - uri:
      exact: /health
  route:
  - destination:
      host: health-service
      port:
        number: 8080
- match:
  - uri:
      exact: /ready
  route:
  - destination:
      host: health-service
      port:
        number: 8080
```

Only `/health` matches. Not `/health/check` or `/healthz`. The match is literal and complete.

## Regex Matching

For complex patterns, use regular expressions:

```yaml
http:
- match:
  - uri:
      regex: "/api/v[0-9]+/users/[0-9]+"
  route:
  - destination:
      host: user-service
      port:
        number: 8080
```

This matches paths like `/api/v1/users/123` or `/api/v2/users/456` but not `/api/v1/users` (no user ID) or `/api/latest/users/123` (version is not a number).

Use regex matching sparingly - it is more expensive to evaluate and harder to debug. Prefix matching covers most use cases.

## URI Rewriting

Often you want to route based on a path prefix but strip or change that prefix before forwarding to the backend. The `rewrite` field handles this:

```yaml
http:
- match:
  - uri:
      prefix: /api/v1
  rewrite:
    uri: /v1
  route:
  - destination:
      host: api-service
      port:
        number: 8080
```

A request to `/api/v1/users` is forwarded to `api-service` as `/v1/users`. The `/api` prefix is stripped and replaced.

A common pattern is stripping the routing prefix entirely:

```yaml
http:
- match:
  - uri:
      prefix: /user-service
  rewrite:
    uri: /
  route:
  - destination:
      host: user-service
      port:
        number: 8080
```

A request to `/user-service/profile` becomes `/profile` when it reaches `user-service`.

Watch out for trailing slashes. `/user-service` rewritten to `/` means a request to `/user-service/path` becomes `//path` (double slash). To avoid this:

```yaml
http:
- match:
  - uri:
      prefix: /user-service/
  rewrite:
    uri: /
  route:
  - destination:
      host: user-service
- match:
  - uri:
      exact: /user-service
  rewrite:
    uri: /
  route:
  - destination:
      host: user-service
```

## API Versioning with URI Routing

Route different API versions to different service deployments:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-versioning
  namespace: my-app
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /v3
    route:
    - destination:
        host: api-service
        subset: v3
  - match:
    - uri:
        prefix: /v2
    route:
    - destination:
        host: api-service
        subset: v2
  - match:
    - uri:
        prefix: /v1
    route:
    - destination:
        host: api-service
        subset: v1
  - route:
    - destination:
        host: api-service
        subset: v3
```

The last rule is a catch-all that sends unversioned requests to the latest version.

## Monolith to Microservices Migration

URI routing is perfect for the strangler fig pattern, where you gradually move endpoints from a monolith to new microservices:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: migration-routing
  namespace: my-app
spec:
  hosts:
  - myapp.example.com
  gateways:
  - my-gateway
  http:
  # Already migrated endpoints
  - match:
    - uri:
        prefix: /api/users
    route:
    - destination:
        host: user-microservice
        port:
          number: 8080
  - match:
    - uri:
        prefix: /api/products
    route:
    - destination:
        host: product-microservice
        port:
          number: 8080
  # Everything else still goes to the monolith
  - route:
    - destination:
        host: monolith
        port:
          number: 8080
```

As you extract more functionality into microservices, add new path rules. The monolith handles less and less over time until it can be retired.

## Combining URI with Other Match Conditions

URI matching can be combined with header matching, method matching, and more:

```yaml
http:
- match:
  - uri:
      prefix: /api
    method:
      exact: GET
    headers:
      accept:
        exact: "application/json"
  route:
  - destination:
      host: api-service
      subset: json
- match:
  - uri:
      prefix: /api
    method:
      exact: GET
    headers:
      accept:
        exact: "application/xml"
  route:
  - destination:
      host: api-service
      subset: xml
```

This routes based on both the path and the Accept header, sending JSON requests to one version and XML requests to another.

## Mesh-Internal URI Routing

The examples above use a Gateway for external traffic, but URI routing also works for mesh-internal traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: internal-routing
  namespace: my-app
spec:
  hosts:
  - backend-service
  http:
  - match:
    - uri:
        prefix: /graphql
    route:
    - destination:
        host: graphql-service
  - match:
    - uri:
        prefix: /rest
    route:
    - destination:
        host: rest-service
  - route:
    - destination:
        host: backend-service
```

When any service in the mesh calls `backend-service`, the path determines which actual service handles the request. This works because the sidecar proxy intercepts the request and applies the routing rules.

## Debugging URI Routes

When path routing does not work as expected:

```bash
# Check what routes the proxy has
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system

# Look for specific route details
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json | jq '.[].virtualHosts[] | select(.name | contains("myapp"))'
```

Send a test request and check the logs:

```bash
# Enable access logging if not already enabled
kubectl logs -n istio-system deploy/istio-ingressgateway --tail=20 | grep "myapp"
```

Common problems:

- **404 Not Found**: No VirtualService rule matches the path. Check your prefix and exact match values.
- **Wrong backend**: Rules are evaluated top-down. A broader prefix match might be catching requests before a more specific one.
- **Double slashes after rewrite**: Watch for `/service//path` when rewriting prefixes. Handle trailing slashes carefully.
- **Case sensitivity**: URI matching is case-sensitive. `/Api` does not match a rule for `/api`.

## Performance Considerations

URI matching is evaluated at the proxy level using Envoy route tables. The performance impact depends on:

- **Number of routes**: A few dozen routes are fine. Thousands of routes can increase proxy memory usage.
- **Regex patterns**: Regex matching is slower than prefix or exact matching. Use prefix matching when possible.
- **Route ordering**: Put the most frequently matched routes first to minimize evaluation time.

For large-scale routing (hundreds of path rules), consider using a dedicated API gateway in front of the mesh rather than encoding everything in VirtualServices.

## Summary

URI path-based routing in Istio VirtualService supports prefix, exact, and regex matching. Combine it with URI rewriting to transform paths before forwarding to backend services. Common use cases include API versioning, monolith-to-microservices migration, and multi-service frontends. Put more specific rules before broader ones, handle trailing slashes carefully in rewrites, and use istioctl to debug when routes do not behave as expected.
