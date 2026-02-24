# How to Configure VirtualService for Multiple Hostnames

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Multiple Hosts, DNS, Traffic Management

Description: Learn how to configure a single Istio VirtualService to handle traffic for multiple hostnames with shared or host-specific routing rules.

---

A single VirtualService can handle traffic for multiple hostnames. This is useful when you have several domain names pointing to the same application, or when you want to consolidate routing rules for related services. Instead of creating separate VirtualServices for each hostname, you can manage them all in one place.

## Multiple Hosts in One VirtualService

The `hosts` field accepts a list of hostnames:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: multi-host
  namespace: default
spec:
  hosts:
    - "app.example.com"
    - "www.example.com"
    - "example.com"
  gateways:
    - web-gateway
  http:
    - route:
        - destination:
            host: web-app
            port:
              number: 80
```

All three hostnames route to the same backend. This is common when you want `example.com`, `www.example.com`, and `app.example.com` to all serve the same application.

## Shared Rules with Different Hosts

When all hosts share the same routing rules, a single VirtualService keeps things simple:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: shared-rules
  namespace: default
spec:
  hosts:
    - "api.example.com"
    - "api.example.io"
    - "api.example.net"
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: "/v2"
      route:
        - destination:
            host: api-v2
            port:
              number: 80
    - route:
        - destination:
            host: api-v1
            port:
              number: 80
```

The same routing rules (v2 path routing) apply regardless of which hostname the client used.

## Host-Specific Routing

If you need different behavior per hostname, use the `authority` match condition:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: host-specific
  namespace: default
spec:
  hosts:
    - "api.example.com"
    - "admin.example.com"
    - "www.example.com"
  gateways:
    - web-gateway
  http:
    - match:
        - authority:
            exact: "api.example.com"
      route:
        - destination:
            host: api-service
            port:
              number: 80
    - match:
        - authority:
            exact: "admin.example.com"
      route:
        - destination:
            host: admin-service
            port:
              number: 80
    - route:
        - destination:
            host: web-frontend
            port:
              number: 80
```

`api.example.com` goes to the API service, `admin.example.com` goes to the admin service, and `www.example.com` (or anything else) goes to the web frontend.

## Combining Mesh and External Hosts

You can mix internal service names with external hostnames:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - "app.example.com"        # External hostname
    - my-app                    # Internal mesh name
  gateways:
    - web-gateway              # For external traffic
    - mesh                      # For internal traffic
  http:
    - route:
        - destination:
            host: my-app
            subset: v1
          weight: 90
        - destination:
            host: my-app
            subset: v2
          weight: 10
```

The 90/10 traffic split applies to both external users hitting `app.example.com` and internal services calling `my-app`.

## Multiple Hostnames with Redirects

A common pattern is redirecting some hostnames to a canonical one:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: canonical-redirect
  namespace: default
spec:
  hosts:
    - "example.com"
    - "www.example.com"
    - "app.example.com"
  gateways:
    - web-gateway
  http:
    - match:
        - authority:
            exact: "example.com"
      redirect:
        authority: "www.example.com"
        redirectCode: 301
    - match:
        - authority:
            exact: "app.example.com"
      redirect:
        authority: "www.example.com"
        redirectCode: 301
    - route:
        - destination:
            host: web-app
            port:
              number: 80
```

Requests to `example.com` and `app.example.com` get redirected to `www.example.com`. Only `www.example.com` actually routes to the backend.

## Gateway Configuration for Multiple Hosts

Your Gateway needs to accept all the hostnames:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: web-gateway
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
        - "example.com"
        - "www.example.com"
        - "api.example.com"
        - "admin.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "example.com"
        - "www.example.com"
        - "api.example.com"
        - "admin.example.com"
      tls:
        mode: SIMPLE
        credentialName: multi-domain-cert
```

For TLS, you will need a certificate that covers all the hostnames. This can be a multi-domain (SAN) certificate or separate certificates per host.

## Multiple TLS Certificates per Host

If different hostnames use different TLS certificates, split them into separate server entries:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: web-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https-app
        protocol: HTTPS
      hosts:
        - "app.example.com"
      tls:
        mode: SIMPLE
        credentialName: app-cert
    - port:
        number: 443
        name: https-admin
        protocol: HTTPS
      hosts:
        - "admin.example.com"
      tls:
        mode: SIMPLE
        credentialName: admin-cert
```

Istio uses SNI to determine which certificate to present to the client.

## Wildcard and Specific Host Combinations

You can combine wildcards with specific hostnames:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: mixed-hosts
  namespace: default
spec:
  hosts:
    - "api.example.com"
    - "*.example.com"
  gateways:
    - web-gateway
  http:
    - match:
        - authority:
            exact: "api.example.com"
      route:
        - destination:
            host: api-service
            port:
              number: 80
    - route:
        - destination:
            host: web-frontend
            port:
              number: 80
```

Requests to `api.example.com` go to the API service. Everything else under `*.example.com` goes to the web frontend. The exact match takes precedence over the wildcard.

## One VirtualService vs Multiple

Should you use one VirtualService with multiple hosts or separate VirtualServices?

**Use one VirtualService when:**
- All hosts share the same routing rules
- You want to manage everything in one place
- The hosts are closely related (same app, different domains)

**Use separate VirtualServices when:**
- Hosts have completely different routing logic
- Different teams manage different hostnames
- You want to deploy routing changes independently

```yaml
# Option A: One VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: all-hosts
spec:
  hosts: ["api.example.com", "admin.example.com"]
  # shared rules

# Option B: Separate VirtualServices
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-host
spec:
  hosts: ["api.example.com"]
  # API-specific rules
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: admin-host
spec:
  hosts: ["admin.example.com"]
  # Admin-specific rules
```

## Debugging Multiple Hosts

```bash
# See all hosts configured for a gateway
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json | jq '.[].virtualHosts[].domains'

# Check which VirtualService handles a specific host
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json | jq '.[].virtualHosts[] | select(.domains[] | contains("api.example.com"))'

# Validate no conflicts
istioctl analyze -n default
```

## Common Pitfalls

1. **Gateway host mismatch** - Every host in the VirtualService must be included in the Gateway's host list.
2. **Authority vs Host** - For matching purposes, the `authority` field is the HTTP Host header. For gateway traffic, this is the domain name the client connected to.
3. **Wildcard overlap** - If you have both `*.example.com` and `api.example.com`, make sure the more specific one has higher priority rules.
4. **TLS certificate coverage** - The TLS certificate must cover all listed hostnames.

Managing multiple hostnames in a single VirtualService keeps your configuration organized and makes it easy to apply consistent policies across domains. Use the `authority` match condition when you need host-specific behavior.
