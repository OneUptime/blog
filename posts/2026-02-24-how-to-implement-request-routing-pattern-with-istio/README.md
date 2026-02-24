# How to Implement Request Routing Pattern with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Request Routing, VirtualService, Traffic Management, Kubernetes

Description: How to implement request routing in Istio using VirtualService rules for header-based, path-based, and weighted routing across service versions.

---

Request routing is one of the most powerful features Istio provides. Instead of simple round-robin load balancing to all instances of a service, you can route requests based on headers, URI paths, query parameters, source labels, and more. This is the foundation for canary deployments, A/B testing, feature flagging, and API versioning at the infrastructure level.

## Basic Routing to Service Subsets

The most common routing pattern is directing traffic to different versions of a service. First, define the subsets in a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: default
spec:
  host: my-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Then create routing rules in a VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: default
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: v1
      weight: 90
    - destination:
        host: my-service
        subset: v2
      weight: 10
```

This sends 90% of traffic to v1 and 10% to v2. This is the basic pattern for canary deployments.

## Header-Based Routing

Route requests based on HTTP headers. This is useful for testing new versions with specific users or teams:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - match:
    - headers:
        x-user-group:
          exact: beta-testers
    route:
    - destination:
        host: my-service
        subset: v2
  - route:
    - destination:
        host: my-service
        subset: v1
```

Requests with the header `x-user-group: beta-testers` go to v2. All other requests go to v1.

You can match headers in several ways:

```yaml
# Exact match
headers:
  x-api-version:
    exact: "2.0"

# Prefix match
headers:
  x-request-id:
    prefix: "test-"

# Regex match
headers:
  user-agent:
    regex: ".*Chrome.*"
```

## URI-Based Routing

Route based on the request URI path:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - match:
    - uri:
        prefix: /api/v2
    route:
    - destination:
        host: my-service
        subset: v2
  - match:
    - uri:
        prefix: /api/v1
    route:
    - destination:
        host: my-service
        subset: v1
  - route:
    - destination:
        host: my-service
        subset: v1
```

Requests to `/api/v2/*` go to the v2 subset, `/api/v1/*` goes to v1, and everything else defaults to v1.

URI matching options:

```yaml
# Exact match
uri:
  exact: /api/users

# Prefix match
uri:
  prefix: /api/

# Regex match
uri:
  regex: "/api/users/[0-9]+"
```

## Source-Based Routing

Route based on which service is making the call:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - match:
    - sourceLabels:
        app: frontend
        version: canary
    route:
    - destination:
        host: my-service
        subset: v2
  - route:
    - destination:
        host: my-service
        subset: v1
```

When the canary version of the frontend calls my-service, it gets routed to v2. All other callers get v1. This is great for testing an entire chain of canary versions together.

## Query Parameter Routing

Route based on URL query parameters:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - match:
    - queryParams:
        debug:
          exact: "true"
    route:
    - destination:
        host: my-service
        subset: v2
  - route:
    - destination:
        host: my-service
        subset: v1
```

Adding `?debug=true` to a request routes it to v2.

## Combining Match Conditions

You can combine multiple match conditions. All conditions in a single match block must be true (AND logic). Multiple match blocks are evaluated with OR logic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - match:
    - headers:
        x-user-group:
          exact: beta-testers
      uri:
        prefix: /api/v2
    route:
    - destination:
        host: my-service
        subset: v2
  - route:
    - destination:
        host: my-service
        subset: v1
```

This routes to v2 only when both the header AND the URI prefix match.

For OR logic, use separate match entries:

```yaml
http:
- match:
  - headers:
      x-user-group:
        exact: beta-testers
  - headers:
      x-internal:
        exact: "true"
  route:
  - destination:
      host: my-service
      subset: v2
```

This routes to v2 if either `x-user-group: beta-testers` OR `x-internal: true` is present.

## URL Rewriting

You can rewrite the URI before forwarding the request:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - match:
    - uri:
        prefix: /api/v2/users
    rewrite:
      uri: /users
    route:
    - destination:
        host: my-service
        subset: v2
```

A request to `/api/v2/users/123` gets rewritten to `/users/123` before being sent to the v2 backend.

## Header Manipulation

Add, remove, or modify headers before forwarding:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: v1
      headers:
        request:
          set:
            x-routed-by: istio
            x-version: v1
          add:
            x-forwarded-service: my-service
          remove:
          - x-internal-debug
        response:
          set:
            x-served-by: v1
```

## Routing to Different Services

You can route to completely different services based on the request:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-gateway
spec:
  hosts:
  - api.mycompany.com
  gateways:
  - my-gateway
  http:
  - match:
    - uri:
        prefix: /users
    route:
    - destination:
        host: user-service
  - match:
    - uri:
        prefix: /orders
    route:
    - destination:
        host: order-service
  - match:
    - uri:
        prefix: /products
    route:
    - destination:
        host: product-service
```

This turns the Istio ingress gateway into an API gateway that routes to different backend services based on the URL path.

## Verifying Routing Rules

Check that your routing rules are applied correctly:

```bash
# See the routes configured on a sidecar
istioctl proxy-config routes deploy/my-app -n default

# Get detailed JSON output
istioctl proxy-config routes deploy/my-app -n default -o json

# Check for configuration issues
istioctl analyze -n default
```

## Debugging Routing Issues

If traffic is not going where you expect:

```bash
# Check which route a request matches
kubectl logs deploy/my-app -c istio-proxy | grep "my-service"
```

The access logs show the route name that was matched. If you see requests going to the wrong route, check the order of your match rules in the VirtualService. Rules are evaluated top-to-bottom, and the first match wins.

A common mistake is putting a broad match rule above a specific one:

```yaml
# Wrong order - the broad rule matches everything first
http:
- route:
  - destination:
      host: my-service
      subset: v1
- match:
  - headers:
      x-user-group:
        exact: beta-testers
  route:
  - destination:
      host: my-service
      subset: v2
```

The second rule will never be reached because the first rule (with no match conditions) catches everything. Always put specific match rules before the catch-all default route.

Request routing gives you fine-grained control over where traffic goes in your mesh. Combined with weighted routing for canary deployments, header-based routing for testing, and URI-based routing for API versioning, you can implement sophisticated traffic management patterns entirely through configuration.
