# How to Write VirtualService YAML (Cheat Sheet)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, YAML, Cheat Sheet, Traffic Management, Kubernetes

Description: A complete cheat sheet for writing Istio VirtualService YAML with examples covering routing, retries, timeouts, and traffic splitting.

---

VirtualService is the most commonly used Istio traffic management resource. It defines how requests are routed to services in the mesh, and it supports a wide range of routing features including path-based routing, header matching, traffic splitting, retries, timeouts, fault injection, and more.

Here is a complete reference with copy-paste-ready YAML examples for every common use case.

## Basic Structure

Every VirtualService follows this structure:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-vs
  namespace: default
spec:
  hosts:
    - my-service
  gateways:          # Optional: defaults to "mesh" if omitted
    - mesh
  http:              # HTTP routing rules
    - route:
        - destination:
            host: my-service
            port:
              number: 8080
```

## Simple Routing

Route all traffic to a single service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: simple-route
spec:
  hosts:
    - reviews
  http:
    - route:
        - destination:
            host: reviews
            port:
              number: 9080
```

## Traffic Splitting (Canary)

Split traffic between two versions by weight:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: canary-route
spec:
  hosts:
    - reviews
  http:
    - route:
        - destination:
            host: reviews
            subset: v1
          weight: 90
        - destination:
            host: reviews
            subset: v2
          weight: 10
```

Subsets must be defined in a matching DestinationRule.

## Path-Based Routing

Route different URL paths to different services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: path-route
spec:
  hosts:
    - my-app
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
            host: cdn-service
            port:
              number: 80
    - route:
        - destination:
            host: frontend-service
            port:
              number: 80
```

### URI Match Types

```yaml
# Exact match
- match:
    - uri:
        exact: /api/v1/users

# Prefix match
- match:
    - uri:
        prefix: /api/

# Regex match
- match:
    - uri:
        regex: "/api/v[0-9]+/.*"
```

## Header-Based Routing

Route based on request headers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: header-route
spec:
  hosts:
    - reviews
  http:
    - match:
        - headers:
            end-user:
              exact: jason
      route:
        - destination:
            host: reviews
            subset: v2
    - route:
        - destination:
            host: reviews
            subset: v1
```

### Header Match Types

```yaml
# Exact match
headers:
  x-custom-header:
    exact: "my-value"

# Prefix match
headers:
  x-custom-header:
    prefix: "test-"

# Regex match
headers:
  x-custom-header:
    regex: "v[0-9]+"
```

## Ingress Gateway Routing

Route traffic from an Istio ingress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ingress-route
spec:
  hosts:
    - "app.example.com"
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: frontend
            port:
              number: 80
```

To apply for both ingress and mesh traffic:

```yaml
  gateways:
    - my-gateway
    - mesh
```

## Timeouts

Set a timeout for requests:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: timeout-route
spec:
  hosts:
    - my-service
  http:
    - timeout: 10s
      route:
        - destination:
            host: my-service
```

## Retries

Configure automatic retries:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: retry-route
spec:
  hosts:
    - my-service
  http:
    - retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes
        retryRemoteLocalities: true
      route:
        - destination:
            host: my-service
```

## Fault Injection

### Inject Delays

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: delay-fault
spec:
  hosts:
    - my-service
  http:
    - fault:
        delay:
          percentage:
            value: 10
          fixedDelay: 5s
      route:
        - destination:
            host: my-service
```

### Inject Aborts

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: abort-fault
spec:
  hosts:
    - my-service
  http:
    - fault:
        abort:
          percentage:
            value: 5
          httpStatus: 503
      route:
        - destination:
            host: my-service
```

### Combined Fault Injection

```yaml
    - fault:
        delay:
          percentage:
            value: 10
          fixedDelay: 3s
        abort:
          percentage:
            value: 5
          httpStatus: 500
      route:
        - destination:
            host: my-service
```

## URL Rewrite

Rewrite the URL path before forwarding:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: rewrite-route
spec:
  hosts:
    - my-service
  http:
    - match:
        - uri:
            prefix: /v1/api
      rewrite:
        uri: /api
      route:
        - destination:
            host: api-service
```

Rewrite the authority/host header:

```yaml
    - match:
        - uri:
            prefix: /api
      rewrite:
        authority: backend.example.com
      route:
        - destination:
            host: backend-service
```

## HTTP Redirect

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: redirect-route
spec:
  hosts:
    - old-app
  http:
    - redirect:
        uri: /new-path
        authority: new-app.example.com
        redirectCode: 301
```

## Mirror Traffic

Copy traffic to a secondary service for testing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: mirror-route
spec:
  hosts:
    - my-service
  http:
    - mirror:
        host: my-service-canary
        port:
          number: 8080
      mirrorPercentage:
        value: 100.0
      route:
        - destination:
            host: my-service
```

## CORS Policy

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: cors-route
spec:
  hosts:
    - my-service
  http:
    - corsPolicy:
        allowOrigins:
          - exact: "https://example.com"
        allowMethods:
          - GET
          - POST
          - PUT
        allowHeaders:
          - Authorization
          - Content-Type
        maxAge: "24h"
      route:
        - destination:
            host: my-service
```

## Header Manipulation

Add, set, or remove headers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: header-ops
spec:
  hosts:
    - my-service
  http:
    - headers:
        request:
          add:
            x-custom-header: "my-value"
          set:
            x-forwarded-proto: https
          remove:
            - x-internal-header
        response:
          add:
            x-powered-by: "istio"
      route:
        - destination:
            host: my-service
```

## TCP Routing

For non-HTTP services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tcp-route
spec:
  hosts:
    - my-db
  tcp:
    - match:
        - port: 5432
      route:
        - destination:
            host: my-db
            port:
              number: 5432
```

## TLS Routing

Route based on SNI:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tls-route
spec:
  hosts:
    - "*.example.com"
  gateways:
    - my-gateway
  tls:
    - match:
        - port: 443
          sniHosts:
            - api.example.com
      route:
        - destination:
            host: api-service
            port:
              number: 8080
```

## Multiple Match Conditions (AND/OR)

Multiple conditions within a single match block are AND-ed:

```yaml
# AND: must match both header AND path
- match:
    - headers:
        x-env:
          exact: staging
      uri:
        prefix: /api
```

Multiple match blocks are OR-ed:

```yaml
# OR: matches header OR path
- match:
    - headers:
        x-env:
          exact: staging
    - uri:
        prefix: /test
```

## Delegate to Another VirtualService

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: root-vs
spec:
  hosts:
    - my-service
  http:
    - match:
        - uri:
            prefix: /api
      delegate:
        name: api-vs
        namespace: backend
    - route:
        - destination:
            host: frontend
```

This cheat sheet covers the vast majority of VirtualService configurations you will encounter. Keep it as a quick reference when you are writing or modifying routing rules for your Istio mesh.
