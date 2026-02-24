# How to Set Up API Versioning Strategy with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Versioning, Traffic Management, VirtualService, Routing

Description: How to implement different API versioning strategies using Istio including URL path, header-based, and query parameter versioning approaches.

---

API versioning is one of those decisions that haunts you for years if you get it wrong. With Istio, you can implement and manage multiple versioning strategies at the mesh level without changing your application code. Whether you prefer URL path versioning, header-based versioning, or something more creative, Istio's traffic management gives you the flexibility to handle it cleanly.

## URL Path Versioning

This is the most common approach. The API version is part of the URL path: `/api/v1/users`, `/api/v2/users`, etc.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-versioning
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /api/v2/users
      rewrite:
        uri: /users
      route:
        - destination:
            host: user-service
            subset: v2
          headers:
            request:
              set:
                x-api-version: "v2"
    - match:
        - uri:
            prefix: /api/v1/users
      rewrite:
        uri: /users
      route:
        - destination:
            host: user-service
            subset: v1
          headers:
            request:
              set:
                x-api-version: "v1"
```

The DestinationRule defines the subsets:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: user-service
spec:
  host: user-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

Each subset maps to pods with the corresponding version label. You deploy both versions of the service simultaneously with different labels.

## Header-Based Versioning

Some APIs use a custom header like `Api-Version` or `Accept-Version`:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-header-versioning
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - headers:
            api-version:
              exact: "2"
      route:
        - destination:
            host: user-service
            subset: v2
    - match:
        - headers:
            api-version:
              exact: "1"
      route:
        - destination:
            host: user-service
            subset: v1
    # Default to latest version when no header is provided
    - route:
        - destination:
            host: user-service
            subset: v2
```

Clients set the version in their requests:

```bash
curl -H "Api-Version: 2" https://api.example.com/users
curl -H "Api-Version: 1" https://api.example.com/users
```

## Accept Header Versioning (Content Negotiation)

A more RESTful approach uses the Accept header with a vendor MIME type:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-accept-versioning
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - headers:
            accept:
              regex: ".*application/vnd\\.myapi\\.v2\\+json.*"
      route:
        - destination:
            host: api-service
            subset: v2
          headers:
            request:
              set:
                x-api-version: "v2"
    - match:
        - headers:
            accept:
              regex: ".*application/vnd\\.myapi\\.v1\\+json.*"
      route:
        - destination:
            host: api-service
            subset: v1
          headers:
            request:
              set:
                x-api-version: "v1"
    - route:
        - destination:
            host: api-service
            subset: v2
```

Clients use:

```bash
curl -H "Accept: application/vnd.myapi.v2+json" https://api.example.com/users
```

## Query Parameter Versioning

Some APIs accept the version as a query parameter: `/users?version=2`. Istio does not natively support query parameter matching in VirtualService, but you can handle this with an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: query-param-versioning
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              function envoy_on_request(request_handle)
                local path = request_handle:headers():get(":path")
                local version = path:match("[?&]version=(%d+)")
                if version then
                  request_handle:headers():add("x-api-version", version)
                end
              end
```

Then route based on the extracted header:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-query-versioning
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - headers:
            x-api-version:
              exact: "2"
      route:
        - destination:
            host: api-service
            subset: v2
    - match:
        - headers:
            x-api-version:
              exact: "1"
      route:
        - destination:
            host: api-service
            subset: v1
    - route:
        - destination:
            host: api-service
            subset: v2
```

## Gradual Version Migration

When migrating users from v1 to v2, use weighted routing to gradually shift traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-migration
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    # Explicit v2 requests always go to v2
    - match:
        - uri:
            prefix: /api/v2
      route:
        - destination:
            host: api-service
            subset: v2
    # v1 requests get gradually migrated
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api-service
            subset: v1
          weight: 80
        - destination:
            host: api-service
            subset: v2
          weight: 20
          headers:
            request:
              set:
                x-migration-redirect: "true"
```

Start at 100/0 and gradually shift to 0/100 as you verify v2 works correctly.

## Multiple Services, Multiple Versions

In a real system, you have many services each with their own versions:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-v1-routes
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1/users
      rewrite:
        uri: /users
      route:
        - destination:
            host: user-service
            subset: v1
    - match:
        - uri:
            prefix: /api/v1/orders
      rewrite:
        uri: /orders
      route:
        - destination:
            host: order-service
            subset: v1
    - match:
        - uri:
            prefix: /api/v2/users
      rewrite:
        uri: /users
      route:
        - destination:
            host: user-service
            subset: v2
    - match:
        - uri:
            prefix: /api/v2/orders
      rewrite:
        uri: /orders
      route:
        - destination:
            host: order-service
            subset: v2
```

## Deploying Multiple Versions

Each version runs as a separate deployment with version labels:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service-v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
      version: v1
  template:
    metadata:
      labels:
        app: user-service
        version: v1
    spec:
      containers:
        - name: user-service
          image: myregistry/user-service:1.0
          ports:
            - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service-v2
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-service
      version: v2
  template:
    metadata:
      labels:
        app: user-service
        version: v2
    spec:
      containers:
        - name: user-service
          image: myregistry/user-service:2.0
          ports:
            - containerPort: 8080
```

Both deployments share the same Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
    - port: 8080
      targetPort: 8080
```

The DestinationRule subsets determine which pods receive traffic based on the version label.

## Version Deprecation Headers

When you are deprecating an API version, add deprecation headers to inform clients:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: deprecated-v1
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api-service
            subset: v1
          headers:
            response:
              add:
                deprecation: "true"
                sunset: "Sat, 01 Jun 2026 00:00:00 GMT"
                link: '<https://api.example.com/api/v2>; rel="successor-version"'
```

These headers follow the HTTP Deprecation and Sunset standards, letting API consumers know they need to migrate.

## Testing Version Routing

```bash
# Test v1
curl -s https://api.example.com/api/v1/users | head -20

# Test v2
curl -s https://api.example.com/api/v2/users | head -20

# Test header-based versioning
curl -s -H "Api-Version: 2" https://api.example.com/users | head -20

# Check deprecation headers
curl -sI https://api.example.com/api/v1/users | grep -i "deprecation\|sunset"
```

API versioning with Istio keeps the versioning logic out of your application code and centralizes it in the routing layer. This makes it easy to manage, monitor, and change versioning strategies as your API evolves.
