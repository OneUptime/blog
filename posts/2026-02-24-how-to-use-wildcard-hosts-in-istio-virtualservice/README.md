# How to Use Wildcard Hosts in Istio VirtualService

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Wildcard, DNS, Traffic Routing

Description: Learn how to configure wildcard host matching in Istio VirtualService to handle multiple subdomains and dynamic hostnames efficiently.

---

When you have dozens of subdomains or multi-tenant applications where each tenant gets their own subdomain, you do not want to create a separate VirtualService for every single one. Wildcard hosts solve this by letting you write a single routing rule that covers an entire domain and all its subdomains.

## Wildcard Host Syntax

Istio uses a specific syntax for wildcard hosts. The wildcard character `*` can only appear as the first segment of a hostname, followed by a dot:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: wildcard-example
  namespace: default
spec:
  hosts:
    - "*.example.com"
  http:
    - route:
        - destination:
            host: default-backend
            port:
              number: 80
```

This matches `api.example.com`, `www.example.com`, `tenant1.example.com`, and any other subdomain of `example.com`. It does not match `example.com` itself (no subdomain) or `sub.api.example.com` (two levels deep).

## Wildcard Rules

There are some constraints on how wildcards work:

- The wildcard `*` must be the first and only character in the first DNS label
- `*.example.com` is valid
- `api-*.example.com` is not valid
- `*.*.example.com` is not valid
- A bare `*` matches all hosts

For mesh-internal services, you can also use namespace-scoped wildcards:

```yaml
hosts:
  - "*.default.svc.cluster.local"
```

## Multi-Tenant Routing

A common use case is routing different tenants to different backends. Here is how you might set that up:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tenant-router
  namespace: default
spec:
  hosts:
    - "*.myplatform.com"
  gateways:
    - my-gateway
  http:
    - match:
        - headers:
            ":authority":
              regex: "premium-.*[.]myplatform[.]com"
      route:
        - destination:
            host: premium-backend
            port:
              number: 80
    - route:
        - destination:
            host: standard-backend
            port:
              number: 80
```

This sends requests to any subdomain starting with `premium-` to the premium backend, and everything else to the standard backend. The `:authority` pseudo-header contains the Host value, which you can match against with regex to make routing decisions within the wildcard scope.

## Gateway Configuration for Wildcards

To receive traffic for wildcard hosts from outside the mesh, you need a Gateway that also uses a wildcard:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.myplatform.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: wildcard-vs
  namespace: default
spec:
  hosts:
    - "*.myplatform.com"
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: web-app
            port:
              number: 80
```

## Wildcard TLS with Gateway

For HTTPS traffic with wildcard certificates:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: secure-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "*.myplatform.com"
      tls:
        mode: SIMPLE
        credentialName: wildcard-cert
```

The `credentialName` references a Kubernetes Secret that contains your wildcard TLS certificate. You can get one from Let's Encrypt using cert-manager with a DNS01 challenge solver.

## Combining Wildcard and Specific Hosts

You can have both wildcard and specific host VirtualServices. Istio uses the most specific match:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-specific
  namespace: default
spec:
  hosts:
    - "api.myplatform.com"
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: api-service
            port:
              number: 80
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: wildcard-catch-all
  namespace: default
spec:
  hosts:
    - "*.myplatform.com"
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: web-frontend
            port:
              number: 80
```

Requests to `api.myplatform.com` go to `api-service` because the exact match takes precedence over the wildcard. Everything else under `*.myplatform.com` goes to `web-frontend`.

The specificity order is:
1. Exact host match (`api.myplatform.com`)
2. Wildcard match (`*.myplatform.com`)
3. Catch-all (`*`)

## Mesh-Internal Wildcard Routing

For service-to-service traffic within the mesh, wildcards work on Kubernetes service names:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: internal-routing
  namespace: default
spec:
  hosts:
    - "*.default.svc.cluster.local"
  http:
    - fault:
        delay:
          percentage:
            value: 5
          fixedDelay: 2s
      route:
        - destination:
            host: "*.default.svc.cluster.local"
```

This would inject a 2-second delay into 5% of requests to any service in the default namespace. This is useful for chaos testing.

However, be careful with mesh-internal wildcards. They can have unexpected effects because they match all services in the specified namespace.

## Debugging Wildcard Routes

If your wildcard routing is not working, check these things:

```bash
# Verify the VirtualService was created
kubectl get vs -A

# Check the Gateway hosts match the VirtualService hosts
kubectl get gateway my-gateway -o yaml

# Look at the proxy configuration
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json

# Check for conflicting VirtualServices
istioctl analyze
```

Common issues include:

- **Gateway host mismatch** - The VirtualService wildcard must be a subset of the Gateway's hosts
- **Missing DNS records** - The wildcard DNS record (e.g., `*.myplatform.com`) must point to your Istio ingress gateway's external IP
- **Namespace conflicts** - Two VirtualServices in different namespaces matching the same wildcard can conflict

## A Note on Performance

Wildcard matching adds minimal overhead compared to exact host matching. Envoy compiles the host matching rules efficiently, so having a wildcard host does not significantly impact request processing time. That said, if you have a small, fixed set of subdomains, using explicit host entries gives you clearer configuration and avoids accidentally matching unexpected hostnames.

Wildcard hosts are a powerful tool for building multi-tenant platforms and managing large numbers of subdomains with Istio. Combined with regex-based header matching, you can build sophisticated routing logic that handles dynamic hostnames cleanly.
