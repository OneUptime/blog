# How to Understand Istio's Virtual Service vs Kubernetes Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Kubernetes Ingress, Traffic Routing, Networking

Description: A detailed comparison of Istio VirtualService and Kubernetes Ingress, covering their differences in routing capabilities, use cases, and when to use each one.

---

Both Istio VirtualService and Kubernetes Ingress deal with routing HTTP traffic. But they work at different levels, have very different capabilities, and solve different problems. If you are running Istio, understanding the boundary between these two is important for designing your traffic management correctly.

## Kubernetes Ingress: The Basics

Kubernetes Ingress is a built-in resource for routing external HTTP/HTTPS traffic to services inside the cluster:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
```

Ingress is conceptually simple: match incoming requests by host and path, then forward them to a backend service.

An Ingress requires an Ingress Controller to actually implement the routing. Common controllers include nginx-ingress, HAProxy, and Traefik.

## Istio VirtualService: Full Traffic Control

Istio VirtualService is a much more powerful routing primitive. It handles both external (north-south) and internal (east-west) traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
  - api-service
  gateways:
  - my-gateway  # For external traffic
  - mesh         # For internal mesh traffic
  http:
  - match:
    - uri:
        prefix: /api/v2
      headers:
        x-beta-user:
          exact: "true"
    route:
    - destination:
        host: api-service
        subset: v2
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-service
        subset: v1
      weight: 90
    - destination:
        host: api-service
        subset: v2
      weight: 10
    timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
```

## The Key Differences

### 1. Scope: External Only vs Everywhere

**Kubernetes Ingress** only handles traffic coming from outside the cluster. It sits at the edge and routes requests to internal services.

**VirtualService** handles both external and internal traffic. When you attach it to a Gateway, it manages external traffic. When you specify `mesh` as the gateway (or omit gateways entirely), it manages service-to-service traffic within the mesh.

This is a fundamental difference. Kubernetes Ingress has no way to control how service A talks to service B. VirtualService can.

### 2. Routing Capabilities

**Kubernetes Ingress** can match on:
- Hostname
- URL path (prefix or exact)

That is about it. Some Ingress controllers add more features through annotations, but the core spec is limited.

**VirtualService** can match on:
- Hostname
- URL path (prefix, exact, regex)
- HTTP headers (exact, prefix, regex)
- Query parameters
- HTTP method
- Source labels (which service is making the request)
- Port

```yaml
# VirtualService with complex matching
http:
- match:
  - headers:
      x-request-id:
        regex: ".*debug.*"
    uri:
      prefix: /api
    method:
      exact: POST
    queryParams:
      version:
        exact: "2"
  route:
  - destination:
      host: debug-service
```

This kind of matching is impossible with standard Ingress.

### 3. Traffic Splitting

**Kubernetes Ingress** routes all traffic to a single backend per path. There is no way to split traffic between two versions of a service.

**VirtualService** supports weighted routing:

```yaml
http:
- route:
  - destination:
      host: my-service
      subset: v1
    weight: 80
  - destination:
      host: my-service
      subset: v2
    weight: 20
```

This is the foundation of canary deployments and A/B testing.

### 4. Resilience Features

**Kubernetes Ingress** has no built-in retry, timeout, or fault injection support.

**VirtualService** supports all of these:

```yaml
http:
- route:
  - destination:
      host: my-service
  timeout: 10s
  retries:
    attempts: 3
    perTryTimeout: 3s
    retryOn: 5xx,reset,connect-failure
  fault:
    delay:
      percentage:
        value: 10
      fixedDelay: 2s
```

### 5. Mirror/Shadow Traffic

**Kubernetes Ingress** cannot mirror traffic.

**VirtualService** can send a copy of live traffic to another service for testing:

```yaml
http:
- route:
  - destination:
      host: my-service
      subset: v1
  mirror:
    host: my-service
    subset: v2
  mirrorPercentage:
    value: 100
```

### 6. Header Manipulation

**Kubernetes Ingress** has limited header manipulation (through controller-specific annotations).

**VirtualService** has full header control:

```yaml
http:
- route:
  - destination:
      host: my-service
    headers:
      request:
        add:
          x-custom-header: "added-by-istio"
        remove:
        - x-internal-header
      response:
        add:
          x-served-by: "mesh"
```

### 7. External Traffic Integration

**Kubernetes Ingress** works with an Ingress Controller.

**VirtualService** works with an Istio Gateway (for external traffic):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "app.example.com"
    tls:
      mode: SIMPLE
      credentialName: app-tls-cert
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routes
spec:
  hosts:
  - "app.example.com"
  gateways:
  - my-gateway
  http:
  - route:
    - destination:
        host: frontend-service
        port:
          number: 80
```

The Gateway handles TLS termination and protocol configuration. The VirtualService handles routing. This separation of concerns is cleaner than cramming everything into one Ingress resource.

## When to Use Which

### Use Kubernetes Ingress when:

- You do not use Istio
- You have simple host/path routing needs
- You want a standard Kubernetes API that works across any cluster
- You are using a non-Istio ingress controller (nginx, Traefik)

### Use Istio VirtualService when:

- You are running Istio in your cluster
- You need traffic splitting for canary deployments
- You need header-based routing
- You need retries, timeouts, or fault injection
- You need to manage both external and internal traffic routing
- You need traffic mirroring

### Can they coexist?

Yes, but it is not recommended. If you are running Istio, using both Ingress and VirtualService for the same service creates confusion about which rules apply. Pick one approach.

If you must use Ingress (maybe some services are not in the mesh), keep them on separate domains or paths to avoid conflicts.

## Migration from Ingress to VirtualService

If you are migrating from Ingress to Istio, here is how common patterns translate:

### Simple Path Routing

```yaml
# Ingress
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080

# VirtualService equivalent
spec:
  hosts:
  - app.example.com
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
```

### TLS Termination

```yaml
# Ingress
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls

# Gateway equivalent
spec:
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls
    hosts:
    - app.example.com
```

## Performance Considerations

Kubernetes Ingress is typically implemented by a dedicated proxy (like nginx) that sits at the edge of the cluster. It adds one proxy hop.

Istio VirtualService for external traffic uses the Istio Ingress Gateway (which is an Envoy proxy). It also adds one proxy hop at the edge. Then the request goes through the destination sidecar, adding another hop.

For internal traffic, VirtualService adds no extra hops beyond the sidecars that are already present.

The choice between VirtualService and Kubernetes Ingress really comes down to whether you need Istio's advanced routing features. If you are already running Istio, using VirtualService for everything gives you a consistent routing model for both external and internal traffic. If you do not need traffic splitting, header routing, or resilience features, standard Ingress works fine and is simpler to understand.
