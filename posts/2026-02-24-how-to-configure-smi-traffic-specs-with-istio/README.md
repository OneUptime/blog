# How to Configure SMI Traffic Specs with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SMI, Traffic Specs, Kubernetes, HTTPRouteGroup

Description: A hands-on guide to configuring SMI Traffic Specs with Istio to define HTTP and TCP route patterns for access control and traffic management.

---

SMI Traffic Specs define the shape of traffic flowing between services in your mesh. They are the building blocks that other SMI resources reference when they need to describe what kind of requests should be allowed, routed, or measured. Istio does not implement SMI APIs natively, and the original SMI adapter for Istio is archived and targets older Istio and SMI API versions. If you use a compatible SMI controller or adapter, these specs can be translated into the implementation's matching criteria.

## What Are Traffic Specs?

Traffic Specs belong to the `specs.smi-spec.io` API group and come in three flavors:

- **HTTPRouteGroup** - describes HTTP traffic patterns including methods, paths, and headers
- **TCPRoute** - describes TCP-level traffic by port numbers
- **UDPRoute** - describes UDP-level traffic by port numbers

Think of them as reusable traffic pattern definitions. You define a set of patterns once, then reference them from TrafficTarget (for access control) or other SMI resources. This separation keeps your configs DRY and easier to manage.

## Prerequisites

You need a Kubernetes cluster with Istio and SMI CRDs installed. The SMI project and the original Istio adapter are archived, so make sure the controller you use supports the SMI API versions in this guide:

```bash
istioctl install --set profile=demo
kubectl label namespace default istio-injection=enabled

kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-sdk-go/main/crds/httproutegroup.yaml
kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-sdk-go/main/crds/tcproute.yaml
kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-sdk-go/main/crds/udproute.yaml
kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-sdk-go/main/crds/access.yaml
```

Verify the SMI CRDs are registered:

```bash
kubectl get crd | grep smi
```

You should see `httproutegroups.specs.smi-spec.io`, `tcproutes.specs.smi-spec.io`, `udproutes.specs.smi-spec.io`, and `traffictargets.access.smi-spec.io` in the list.

## HTTPRouteGroup Basics

An HTTPRouteGroup contains one or more named matches. Each match can specify HTTP methods, a path regex, and headers:

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: HTTPRouteGroup
metadata:
  name: bookstore-routes
spec:
  matches:
  - name: buy-books
    pathRegex: "/buy"
    methods:
    - GET
    - POST
  - name: sell-books
    pathRegex: "/sell"
    methods:
    - POST
  - name: everything
    pathRegex: ".*"
    methods:
    - "*"
```

Apply it:

```bash
kubectl apply -f bookstore-routes.yaml
```

Each match has a `name` field that acts as an identifier. When other resources reference this HTTPRouteGroup, they can pick specific matches by name instead of applying all of them.

## Path Regex Patterns

The `pathRegex` field supports regular expressions. Here are some common patterns:

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: HTTPRouteGroup
metadata:
  name: api-patterns
spec:
  matches:
  - name: exact-health
    pathRegex: "/health$"
    methods:
    - GET
  - name: api-v1-all
    pathRegex: "/api/v1/.*"
    methods:
    - "*"
  - name: api-v2-readonly
    pathRegex: "/api/v2/.*"
    methods:
    - GET
    - HEAD
  - name: user-by-id
    pathRegex: "/users/[0-9]+"
    methods:
    - GET
  - name: webhook-endpoints
    pathRegex: "/webhooks/.*"
    methods:
    - POST
```

A few things to keep in mind about path matching:

- The regex is anchored to the beginning of the URI, so `/api/v1/.*` matches `/api/v1/users`, `/api/v1/orders`, etc.
- Use `.*` at the end to match any suffix
- Use `$` at the end if you need an exact path match
- Escape dots if you need literal dots: `/api\\.json`
- A compatible implementation converts these regex patterns into its own path matching configuration

## HTTP Methods

The `methods` field accepts standard HTTP methods. You can also use `*` to match all methods:

```yaml
spec:
  matches:
  - name: read-only
    pathRegex: "/.*"
    methods:
    - GET
    - HEAD
    - OPTIONS
  - name: read-write
    pathRegex: "/.*"
    methods:
    - GET
    - POST
    - PUT
    - DELETE
    - PATCH
```

## Adding Header Matching

You can also match on HTTP headers, which is useful for routing based on API versions or other request metadata:

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: HTTPRouteGroup
metadata:
  name: versioned-api
spec:
  matches:
  - name: api-v1
    pathRegex: "/api/.*"
    methods:
    - "*"
    headers:
    - x-api-version: "v1"
  - name: api-v2
    pathRegex: "/api/.*"
    methods:
    - "*"
    headers:
    - x-api-version: "v2"
  - name: internal-only
    pathRegex: "/internal/.*"
    methods:
    - "*"
    headers:
    - x-internal-token: ".*"
```

Header values also support regex patterns. In the current SMI CRD schema, `headers` is represented as a list of single-entry header maps. A compatible implementation maps these to its own header matching capabilities.

## TCPRoute for Non-HTTP Traffic

Not everything in your mesh is HTTP. For TCP services like databases, caches, or custom protocols, use TCPRoute:

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: TCPRoute
metadata:
  name: database-routes
spec:
  matches:
    ports:
    - 5432
    - 3306
```

This defines a TCP route that matches traffic on PostgreSQL (5432) and MySQL (3306) ports.

Another example for a Redis cache:

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: TCPRoute
metadata:
  name: cache-route
spec:
  matches:
    ports:
    - 6379
```

## Using Traffic Specs in TrafficTarget

Traffic Specs on their own don't do anything. They need to be referenced by a TrafficTarget for access control:

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: HTTPRouteGroup
metadata:
  name: order-service-routes
spec:
  matches:
  - name: create-order
    pathRegex: "/orders"
    methods:
    - POST
  - name: list-orders
    pathRegex: "/orders"
    methods:
    - GET
  - name: get-order
    pathRegex: "/orders/[0-9]+"
    methods:
    - GET
---
apiVersion: access.smi-spec.io/v1alpha3
kind: TrafficTarget
metadata:
  name: order-service-access
spec:
  destination:
    kind: ServiceAccount
    name: order-service
    namespace: default
  sources:
  - kind: ServiceAccount
    name: web-frontend
    namespace: default
  rules:
  - kind: HTTPRouteGroup
    name: order-service-routes
    matches:
    - list-orders
    - get-order
```

Notice that the TrafficTarget only references `list-orders` and `get-order` from the route group. The `create-order` match is not included, so POST requests from the frontend will be denied. Another service could reference `create-order` in its own TrafficTarget.

## Organizing Traffic Specs

For larger applications, organizing your Traffic Specs well saves a lot of headaches. Here are some patterns that work:

**Per-service route groups:**

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: HTTPRouteGroup
metadata:
  name: payment-service-routes
  labels:
    app: payment-service
spec:
  matches:
  - name: process-payment
    pathRegex: "/payments"
    methods: ["POST"]
  - name: get-payment-status
    pathRegex: "/payments/[a-z0-9-]+"
    methods: ["GET"]
  - name: refund
    pathRegex: "/payments/[a-z0-9-]+/refund"
    methods: ["POST"]
```

**Shared utility route groups:**

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: HTTPRouteGroup
metadata:
  name: common-routes
spec:
  matches:
  - name: health
    pathRegex: "/health"
    methods: ["GET"]
  - name: readiness
    pathRegex: "/ready"
    methods: ["GET"]
  - name: metrics
    pathRegex: "/metrics"
    methods: ["GET"]
```

## Verifying Traffic Spec Translation

Check the SMI resources and any implementation-specific resources your controller created from your specs:

```bash
# List all HTTPRouteGroups

kubectl get httproutegroups

# Describe a specific one
kubectl describe httproutegroup order-service-routes

# If your controller emits Istio resources, inspect them
kubectl get virtualservice,authorizationpolicy -A
```

## Debugging Tips

If your traffic specs aren't working as expected:

1. Make sure the HTTPRouteGroup name in the TrafficTarget matches exactly
2. Verify that the match names referenced in the TrafficTarget exist in the HTTPRouteGroup
3. Check the path regex syntax - some complex patterns may not translate perfectly
4. Look at your controller logs for translation errors
5. Inspect the generated implementation-specific resources to see what the controller actually created

```bash
kubectl logs -n istio-system -l app=smi-controller | grep -i error
```

## Limitations

SMI Traffic Specs have some limitations compared to native Istio capabilities:

- No support for gRPC-specific matching (like service/method patterns)
- Header matching is more limited than Istio's native header match options
- No support for query parameter matching
- Regex patterns are anchored to the beginning of the URI and may behave slightly differently after translation to Envoy regex

For most REST API patterns, SMI Traffic Specs cover what you need. If you find yourself needing more complex matching rules, you can always create Istio-native resources alongside your SMI configuration, keeping in mind that conflicts are possible when both systems manage the same workloads.

Traffic Specs are the vocabulary that the rest of the SMI system uses to describe traffic. Getting them right makes everything else in your SMI configuration cleaner and more maintainable.
