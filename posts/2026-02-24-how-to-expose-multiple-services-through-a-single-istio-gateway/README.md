# How to Expose Multiple Services Through a Single Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, Routing, Kubernetes, Microservices

Description: How to expose multiple backend services through a single Istio Gateway using path-based and host-based routing strategies.

---

Running a separate gateway for every service is a waste of resources and adds operational overhead. In practice, you want a single Istio Gateway that routes traffic to many backend services based on the hostname, URL path, or both. This is one of the most common Istio configurations, and getting it right makes your infrastructure much cleaner.

## The Two Routing Strategies

There are two main ways to route traffic from a single gateway to multiple services:

1. **Host-based routing** - Different hostnames go to different services
2. **Path-based routing** - Different URL paths go to different services

You can also combine them.

```mermaid
graph TD
    A[Single Istio Gateway] --> B{Routing Strategy}
    B -->|Host-based| C[api.example.com -> API Service]
    B -->|Host-based| D[web.example.com -> Web Service]
    B -->|Path-based| E[/api/* -> API Service]
    B -->|Path-based| F[/web/* -> Web Service]
```

## Host-Based Routing

With host-based routing, each service gets its own subdomain. The Gateway accepts traffic for all hosts, and separate VirtualServices handle the routing:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: shared-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "api.example.com"
    - "web.example.com"
    - "admin.example.com"
```

Each service gets its own VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-vs
spec:
  hosts:
  - "api.example.com"
  gateways:
  - shared-gateway
  http:
  - route:
    - destination:
        host: api-service
        port:
          number: 8080
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: web-vs
spec:
  hosts:
  - "web.example.com"
  gateways:
  - shared-gateway
  http:
  - route:
    - destination:
        host: web-frontend
        port:
          number: 3000
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: admin-vs
spec:
  hosts:
  - "admin.example.com"
  gateways:
  - shared-gateway
  http:
  - route:
    - destination:
        host: admin-panel
        port:
          number: 8080
```

This scales well because each team can own their VirtualService while sharing the gateway infrastructure.

## Path-Based Routing

When all services share a single hostname, use path-based routing. Everything can go in one VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: app-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-routes
spec:
  hosts:
  - "app.example.com"
  gateways:
  - app-gateway
  http:
  - match:
    - uri:
        prefix: /api/v1
    route:
    - destination:
        host: api-v1-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /api/v2
    route:
    - destination:
        host: api-v2-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /auth
    route:
    - destination:
        host: auth-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /docs
    route:
    - destination:
        host: docs-service
        port:
          number: 3000
  - route:
    - destination:
        host: web-frontend
        port:
          number: 3000
```

Rules are evaluated in order, so more specific paths should be listed first. The last route without a match acts as the default catch-all.

## Combined Host and Path Routing

You can combine both strategies for more complex setups:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
  - "api.example.com"
  gateways:
  - shared-gateway
  http:
  - match:
    - uri:
        prefix: /v1
    route:
    - destination:
        host: api-v1
        port:
          number: 8080
  - match:
    - uri:
        prefix: /v2
    route:
    - destination:
        host: api-v2
        port:
          number: 8080
  - route:
    - destination:
        host: api-v2
        port:
          number: 8080
```

Traffic to `api.example.com/v1/*` goes to api-v1, traffic to `api.example.com/v2/*` goes to api-v2, and everything else defaults to api-v2.

## Path Rewriting

When your backend service does not expect the same path prefix, use rewrite:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: rewrite-routes
spec:
  hosts:
  - "app.example.com"
  gateways:
  - app-gateway
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
  - match:
    - uri:
        prefix: /order-service
    rewrite:
      uri: /
    route:
    - destination:
        host: order-service
        port:
          number: 8080
```

A request to `/user-service/users/123` becomes `/users/123` when it reaches the user-service backend.

## HTTPS with Multiple Services

For HTTPS, use a wildcard certificate or separate certs per host:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: shared-https-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "*.example.com"
    tls:
      mode: SIMPLE
      credentialName: wildcard-tls-credential
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*.example.com"
    tls:
      httpsRedirect: true
```

A wildcard certificate simplifies things significantly when all your services are subdomains of the same domain.

## Cross-Namespace VirtualServices

In larger organizations, each team manages their own namespace. They can create VirtualServices that reference a shared gateway in another namespace:

```yaml
# In team-orders namespace
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: orders-vs
  namespace: team-orders
spec:
  hosts:
  - "orders.example.com"
  gateways:
  - istio-system/shared-gateway
  http:
  - route:
    - destination:
        host: orders-api.team-orders.svc.cluster.local
        port:
          number: 8080
```

The gateway reference uses the `namespace/name` format, and the destination host uses the fully qualified service name since it is in a different namespace than the gateway.

## Weighted Routing Across Services

You can split traffic between services with weighted routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: canary-routes
spec:
  hosts:
  - "app.example.com"
  gateways:
  - app-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-stable
        port:
          number: 8080
      weight: 90
    - destination:
        host: api-canary
        port:
          number: 8080
      weight: 10
```

## Debugging Multi-Service Routing

When traffic is not reaching the right service, check the route configuration:

```bash
# See all routes configured in the proxy
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json

# Run configuration analysis
istioctl analyze

# Check for conflicting VirtualServices
kubectl get virtualservice --all-namespaces
```

Look for overlapping match rules between VirtualServices. If two VirtualServices match the same host and path, the behavior can be unpredictable.

## Performance Tips

- Use a single Gateway resource with all hosts rather than multiple Gateway resources
- Prefer host-based routing over path-based when possible (simpler and faster matching)
- If you have many VirtualServices for the same host, consider merging them to reduce configuration complexity
- Monitor the ingress gateway pod memory usage as the number of routes grows

Exposing multiple services through a single gateway is how most production Istio deployments work. The combination of host-based and path-based routing gives you enough flexibility to handle almost any routing requirement, and the shared gateway pattern keeps your infrastructure costs down while giving teams autonomy over their own routing configuration.
