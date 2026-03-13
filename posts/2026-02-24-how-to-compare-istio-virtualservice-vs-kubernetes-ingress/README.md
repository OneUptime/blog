# How to Compare Istio VirtualService vs Kubernetes Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Ingresses, VirtualService, Traffic Management

Description: A practical comparison of Istio VirtualService and Kubernetes Ingress resources explaining when to use each for routing external and internal traffic in your cluster.

---

When you start using Istio on an existing Kubernetes cluster, one of the first questions that comes up is what to do with your existing Ingress resources. Kubernetes Ingress and Istio VirtualService both handle traffic routing, but they work at different levels and serve different purposes. Understanding the overlap and differences helps you avoid configuration conflicts and choose the right tool for each routing need.

## What Kubernetes Ingress Does

Kubernetes Ingress is a built-in API resource for managing external access to services in a cluster. It defines rules for routing HTTP traffic from outside the cluster to internal services based on hostnames and URL paths.

A typical Ingress looks like this:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
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
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
```

Ingress is implemented by an ingress controller (NGINX, Traefik, HAProxy, etc.). The Ingress resource is just a spec; the controller does the actual work.

Key characteristics of Ingress:
- Only handles external (north-south) traffic
- Limited to host-based and path-based routing
- Feature extensions are done through annotations (controller-specific)
- No built-in support for traffic splitting, mirroring, or fault injection
- Works with any Kubernetes cluster, no service mesh required

## What Istio VirtualService Does

Istio VirtualService is part of Istio's traffic management API. It defines routing rules for traffic flowing through the Istio mesh. Unlike Ingress, VirtualService handles both external traffic (when paired with an Istio Gateway) and internal mesh traffic (service-to-service communication).

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app-routes
spec:
  hosts:
    - app.example.com
  gateways:
    - my-gateway
  http:
    - match:
        - uri:
            prefix: /api
          headers:
            x-api-version:
              exact: "2"
      route:
        - destination:
            host: api-service-v2
            port:
              number: 80
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: api-service
            port:
              number: 80
          weight: 90
        - destination:
            host: api-service-v2
            port:
              number: 80
          weight: 10
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            host: frontend
            port:
              number: 80
```

Key characteristics of VirtualService:
- Handles both external (with Gateway) and internal (mesh) traffic
- Rich matching on headers, query parameters, methods, URIs
- Built-in traffic splitting, retries, timeouts, fault injection
- Header manipulation (add, remove, modify headers)
- Traffic mirroring
- Works only within an Istio mesh

## Routing Capabilities Comparison

The biggest difference is in what you can match on and what you can do with the traffic.

**Kubernetes Ingress** matches on:
- Hostname
- URL path (Exact, Prefix, or ImplementationSpecific)

That is it. Everything else is done through annotations, which are specific to your ingress controller and not portable.

**Istio VirtualService** matches on:
- URI (exact, prefix, regex)
- Headers (exact, prefix, regex)
- Query parameters
- HTTP method
- Source labels (which service is making the request)
- Port

And for each match, you can:
- Split traffic across multiple destinations with weights
- Add retries with configurable conditions
- Set timeouts
- Inject faults (delays and aborts)
- Mirror traffic to another service
- Rewrite URIs
- Add, remove, or modify request and response headers

```yaml
# Things you can do with VirtualService that Ingress cannot
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: advanced-routing
spec:
  hosts:
    - reviews
  http:
    - match:
        - headers:
            end-user:
              exact: tester
      fault:
        delay:
          percentage:
            value: 50
          fixedDelay: 3s
      route:
        - destination:
            host: reviews
            subset: v2
      mirror:
        host: reviews
        subset: v3
      mirrorPercentage:
        value: 100
```

None of this is possible with a plain Ingress resource.

## External Traffic Handling

For external traffic, Ingress and VirtualService (with Gateway) serve similar roles but with different levels of control.

With Ingress, you define the ingress controller and the routing rules in a single resource. The ingress controller creates the load balancer and handles TLS termination.

With Istio, you separate the infrastructure (Gateway) from the routing (VirtualService):

```yaml
# Gateway defines the listener
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
      tls:
        mode: SIMPLE
        credentialName: app-tls
      hosts:
        - app.example.com
---
# VirtualService defines the routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app-routes
spec:
  hosts:
    - app.example.com
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: api-service
```

This separation is cleaner because the Gateway is reusable across multiple VirtualServices, and the routing rules are independent of the infrastructure.

## Internal Traffic Routing

This is where the two resources diverge completely. Kubernetes Ingress has nothing to say about service-to-service traffic. Once traffic enters the cluster through Ingress, internal routing is handled by Kubernetes Services (round-robin load balancing by default).

VirtualService can control internal mesh traffic. When you omit the `gateways` field or set it to `mesh`, the routing rules apply to traffic between services inside the cluster:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: internal-routing
spec:
  hosts:
    - reviews.default.svc.cluster.local
  http:
    - match:
        - sourceLabels:
            app: productpage
      route:
        - destination:
            host: reviews
            subset: v2
    - route:
        - destination:
            host: reviews
            subset: v1
```

This routes traffic from the productpage service to reviews v2, while all other services get reviews v1. No Ingress resource can do this.

## Can They Coexist?

Yes. You can run Kubernetes Ingress and Istio VirtualService in the same cluster without conflicts. Many teams use Ingress for simple external routing (marketing pages, static sites) and VirtualService for services that need mesh features (traffic splitting, canary deployments, internal routing).

The only thing to watch out for is routing conflicts if both Ingress and VirtualService try to handle the same hostname and path. In that case, the behavior depends on your ingress controller. If you use Istio's ingress gateway, use VirtualService. If you use NGINX or another ingress controller, use Ingress.

## Migration Path

If you are adopting Istio and want to migrate from Ingress to VirtualService, you can do it incrementally:

1. Deploy the Istio ingress gateway
2. Create Gateway and VirtualService resources that mirror your existing Ingress rules
3. Update DNS to point to the Istio ingress gateway
4. Delete the old Ingress resources

```bash
# Verify VirtualService routing before switching DNS
kubectl exec deploy/sleep -- curl -H "Host: app.example.com" http://istio-ingressgateway.istio-system/api
```

## When to Use Which

**Use Kubernetes Ingress when:**
- You have simple host-based and path-based routing needs
- You do not need traffic splitting, fault injection, or mirroring
- You are not running Istio or do not want mesh features for specific services
- You want to use a specific ingress controller (NGINX, Traefik) for its features

**Use Istio VirtualService when:**
- You need traffic splitting for canary deployments
- You need header-based, method-based, or query-based routing
- You need to control internal service-to-service routing
- You want fault injection, traffic mirroring, or advanced retry policies
- You are already running Istio and want consistent traffic management

## Summary

Kubernetes Ingress is the simple, standard way to expose services externally with basic routing. Istio VirtualService is the powerful alternative that handles both external and internal traffic with advanced routing capabilities. They can coexist in the same cluster. Use Ingress for straightforward external routing and VirtualService when you need the traffic management features that come with Istio.
