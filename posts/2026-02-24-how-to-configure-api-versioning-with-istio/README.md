# How to Configure API Versioning with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Versioning, Traffic Management, Kubernetes, VirtualService

Description: Implement API versioning strategies in Istio using VirtualService routing, header-based matching, and traffic splitting for gradual migrations.

---

API versioning is something every team has to deal with eventually. You need to roll out breaking changes without breaking existing clients, run multiple versions simultaneously, and gradually migrate traffic from the old version to the new one. Istio's traffic management capabilities make API versioning surprisingly clean. You can route requests to different service versions based on URL paths, headers, or query parameters, and you can split traffic between versions during migrations.

## Versioning Strategies with Istio

There are several common approaches to API versioning, and Istio supports all of them:

1. **URL path versioning**: `/v1/users`, `/v2/users`
2. **Header-based versioning**: `X-API-Version: 2` or `Accept: application/vnd.api.v2+json`
3. **Query parameter versioning**: `/users?version=2`
4. **Traffic splitting**: Gradually shift traffic from v1 to v2

Each approach has its trade-offs. URL path versioning is the most explicit and easiest to understand. Header-based versioning keeps URLs clean but is less visible. Traffic splitting is great for canary deployments.

## Setting Up Service Versions

First, deploy both versions of your service with distinct labels:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service-v1
  namespace: backend
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
        image: myregistry/user-service:1.0.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service-v2
  namespace: backend
spec:
  replicas: 3
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
        image: myregistry/user-service:2.0.0
        ports:
        - containerPort: 8080
```

A single Kubernetes Service selects both versions:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: backend
spec:
  ports:
  - port: 8080
    name: http
  selector:
    app: user-service
```

Define subsets in a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: user-service
  namespace: backend
spec:
  host: user-service.backend.svc.cluster.local
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## URL Path Versioning

Route different URL paths to different service versions:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: user-service-versioning
  namespace: backend
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/api-gateway
  http:
  - match:
    - uri:
        prefix: "/v2/users"
    rewrite:
      uri: "/users"
    route:
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v2
        port:
          number: 8080

  - match:
    - uri:
        prefix: "/v1/users"
    rewrite:
      uri: "/users"
    route:
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v1
        port:
          number: 8080
```

The `rewrite` section strips the version prefix before forwarding to the service. Both v1 and v2 see requests at `/users`, not `/v1/users` or `/v2/users`. This means your services don't need to know about the versioning scheme.

## Header-Based Versioning

Route based on a custom header:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: user-service-versioning
  namespace: backend
spec:
  hosts:
  - user-service.backend.svc.cluster.local
  http:
  - match:
    - headers:
        x-api-version:
          exact: "2"
    route:
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v2

  - route:
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v1
```

Clients that send `X-API-Version: 2` get routed to v2. Everyone else gets v1. The default route (no match conditions) acts as the fallback.

For the `Accept` header approach:

```yaml
http:
- match:
  - headers:
      accept:
        regex: "application/vnd\\.api\\.v2\\+json"
  route:
  - destination:
      host: user-service.backend.svc.cluster.local
      subset: v2
- route:
  - destination:
      host: user-service.backend.svc.cluster.local
      subset: v1
```

## Traffic Splitting for Gradual Migration

When migrating from v1 to v2, you don't want to flip all traffic at once. Use weighted routing to gradually shift traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: user-service-migration
  namespace: backend
spec:
  hosts:
  - user-service.backend.svc.cluster.local
  http:
  - route:
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v1
      weight: 90
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v2
      weight: 10
```

Start with 10% on v2 and monitor. If things look good, increase:

```yaml
# Week 2
- destination:
    host: user-service.backend.svc.cluster.local
    subset: v1
  weight: 50
- destination:
    host: user-service.backend.svc.cluster.local
    subset: v2
  weight: 50
```

```yaml
# Week 3
- destination:
    host: user-service.backend.svc.cluster.local
    subset: v1
  weight: 10
- destination:
    host: user-service.backend.svc.cluster.local
    subset: v2
  weight: 90
```

## Combining Strategies

You can combine approaches. For example, route based on headers for testing, and use traffic splitting for everyone else:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: user-service-versioning
  namespace: backend
spec:
  hosts:
  - user-service.backend.svc.cluster.local
  http:
  # Explicit v2 header gets v2 always
  - match:
    - headers:
        x-api-version:
          exact: "2"
    route:
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v2

  # Explicit v1 header gets v1 always
  - match:
    - headers:
        x-api-version:
          exact: "1"
    route:
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v1

  # Everyone else gets traffic splitting
  - route:
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v1
      weight: 80
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v2
      weight: 20
```

This lets internal testers force a specific version with a header while regular users get the gradual rollout.

## Monitoring Version Traffic

Track traffic distribution between versions with Prometheus:

```text
sum(rate(istio_requests_total{destination_workload="user-service-v1",reporter="destination"}[5m]))
sum(rate(istio_requests_total{destination_workload="user-service-v2",reporter="destination"}[5m]))
```

Monitor error rates per version to catch regressions:

```text
sum(rate(istio_requests_total{destination_workload="user-service-v2",response_code=~"5..",reporter="destination"}[5m])) /
sum(rate(istio_requests_total{destination_workload="user-service-v2",reporter="destination"}[5m]))
```

If v2's error rate spikes, you can quickly route all traffic back to v1 by updating the VirtualService weights.

## Deprecating Old Versions

When you're ready to retire v1, update the VirtualService to return an informative error for v1 requests:

```yaml
http:
- match:
  - uri:
      prefix: "/v1/"
  directResponse:
    status: 410
    body:
      string: '{"error": "API v1 has been deprecated. Please use /v2/ endpoints."}'
  headers:
    response:
      set:
        content-type: "application/json"
- match:
  - uri:
      prefix: "/v2/"
  route:
  - destination:
      host: user-service.backend.svc.cluster.local
      subset: v2
```

A 410 Gone response tells clients clearly that the version is no longer available, which is better than just returning a 404.

## Managing Multiple APIs

If you have multiple services that all need versioning, keep your routing organized. One approach is a VirtualService per service:

```bash
kubectl get virtualservice -n backend
# user-service-versioning
# order-service-versioning
# product-service-versioning
```

Another approach is a single VirtualService for the API gateway that handles all versioning:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-versioning
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/api-gateway
  http:
  - match:
    - uri:
        prefix: "/v2/users"
    rewrite:
      uri: "/users"
    route:
    - destination:
        host: user-service.backend.svc.cluster.local
        subset: v2
  - match:
    - uri:
        prefix: "/v2/orders"
    rewrite:
      uri: "/orders"
    route:
    - destination:
        host: order-service.backend.svc.cluster.local
        subset: v2
  # ... more routes
```

API versioning with Istio keeps the versioning logic out of your application code and in the infrastructure layer where it belongs. Your services don't need to know about version negotiation. They just serve requests, and Istio handles the routing.
