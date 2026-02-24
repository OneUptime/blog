# How to Bind a VirtualService to a Specific Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Gateway, Ingress, Traffic Management

Description: Learn how to bind Istio VirtualService to specific Gateways to control which routing rules apply to external vs internal traffic.

---

When you create a VirtualService without specifying any gateways, it applies to mesh-internal traffic only. When you bind it to a Gateway, it applies to traffic coming through that gateway. Understanding this binding is important because you often want different routing rules for external traffic (coming through an ingress gateway) versus internal traffic (service-to-service within the mesh).

## The Gateways Field

The `gateways` field in a VirtualService controls which traffic the routing rules apply to:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  gateways:
    - my-gateway          # External traffic through this gateway
    - mesh                # Internal mesh traffic
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 80
```

There are three scenarios:

1. **No gateways field** - Rules apply to mesh-internal traffic only (equivalent to `gateways: [mesh]`)
2. **Specific gateway listed** - Rules apply only to traffic through that gateway
3. **Both gateway and mesh** - Rules apply to both external and internal traffic

## Creating a Gateway

First, you need a Gateway resource:

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
        - "app.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "app.example.com"
      tls:
        mode: SIMPLE
        credentialName: app-tls-cert
```

The Gateway defines which ports and hostnames the ingress gateway should listen on. The VirtualService defines what to do with the traffic once it arrives.

## Binding VirtualService to Gateway

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - web-gateway
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 80
```

This VirtualService only applies to traffic coming through `web-gateway`. Internal service-to-service calls to `my-app` are not affected by these rules.

## Separate Rules for External and Internal Traffic

A common pattern is having different routing rules for external and internal traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app-external
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - web-gateway
  http:
    - match:
        - uri:
            prefix: "/api"
      route:
        - destination:
            host: api-service
            port:
              number: 80
    - route:
        - destination:
            host: frontend
            port:
              number: 80
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app-internal
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            subset: v2
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
```

The first VirtualService handles external traffic with path-based routing. The second handles internal mesh traffic with retries and a timeout. They are completely independent.

## Gateway in a Different Namespace

If your Gateway is in a different namespace (common when the platform team manages gateways), reference it with the namespace prefix:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: my-app-namespace
spec:
  hosts:
    - "app.example.com"
  gateways:
    - istio-system/shared-gateway
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 80
```

The format is `namespace/gateway-name`. This lets application teams define their own routing rules while using a centrally managed gateway.

## Multiple Gateways

You can bind a VirtualService to multiple gateways:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - "app.example.com"
    - my-app
  gateways:
    - public-gateway
    - internal-gateway
    - mesh
  http:
    - match:
        - gateways:
            - public-gateway
          uri:
            prefix: "/api/public"
      route:
        - destination:
            host: public-api
            port:
              number: 80
    - match:
        - gateways:
            - internal-gateway
          uri:
            prefix: "/api/admin"
      route:
        - destination:
            host: admin-api
            port:
              number: 80
    - route:
        - destination:
            host: my-app
            port:
              number: 80
```

The `gateways` field in the match condition lets you apply different rules based on which gateway the traffic came through. Public gateway traffic only gets access to `/api/public`, while internal gateway traffic can access `/api/admin`.

## The mesh Gateway

The special `mesh` keyword represents the internal mesh. When you include it in the gateways list, the VirtualService rules also apply to service-to-service traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - "app.example.com"
    - my-app
  gateways:
    - web-gateway
    - mesh
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

This applies the 90/10 traffic split to both external gateway traffic AND internal mesh traffic.

## Host Matching Between Gateway and VirtualService

The VirtualService hosts must be a subset of the Gateway hosts. If your Gateway accepts `app.example.com` and your VirtualService specifies `other.example.com`, the rules will not apply.

```yaml
# Gateway accepts *.example.com
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: wildcard-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"

---
# VirtualService for a specific subdomain (subset of *.example.com - OK)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-vs
spec:
  hosts:
    - "api.example.com"
  gateways:
    - wildcard-gateway
  http:
    - route:
        - destination:
            host: api-service
```

## Debugging Gateway Binding

If your VirtualService is not working with a Gateway:

```bash
# Check that the Gateway exists and is configured
kubectl get gateway web-gateway -o yaml

# Check the ingress gateway pod is receiving traffic
kubectl logs deploy/istio-ingressgateway -n istio-system | tail -20

# Check routes on the ingress gateway
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system

# Validate the configuration
istioctl analyze -n default

# Check for host mismatches
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json | grep "domains"
```

Common problems:
- **Namespace mismatch** - VirtualService is in namespace A but references a Gateway in namespace B without the namespace prefix
- **Host mismatch** - Gateway accepts `app.example.com` but VirtualService specifies a different host
- **Missing TLS certificate** - Gateway references a credential that does not exist
- **Port conflict** - Multiple gateways trying to listen on the same port

## Best Practices

1. **Separate external and internal VirtualServices** - Keep gateway-bound rules separate from mesh-internal rules for clarity.
2. **Use namespace prefixes for shared gateways** - Always reference cross-namespace gateways explicitly.
3. **Include mesh when needed** - If you want rules to apply to both external and internal traffic, include `mesh` in the gateways list.
4. **Match hosts correctly** - Make sure VirtualService hosts are a subset of Gateway hosts.

Binding VirtualServices to Gateways is what connects your routing rules to actual traffic entry points. Getting this right is essential for controlling how external traffic flows into your mesh while keeping internal traffic management separate.
