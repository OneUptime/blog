# How to Compare Istio Gateway API vs Istio Classic APIs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Kubernetes, Traffic Management, Service Mesh

Description: A comparison of the Kubernetes Gateway API and Istio classic APIs covering resource mapping, feature support, and migration considerations for Istio users.

---

Istio has historically used its own set of custom resources for traffic management: VirtualService, DestinationRule, Gateway, ServiceEntry, and others. These are often called the "Istio classic APIs" or "Istio networking APIs." Starting with recent releases, Istio also supports the Kubernetes Gateway API, which is an official Kubernetes project aiming to be the standard for traffic management across all implementations.

If you are using Istio today or planning to adopt it, you need to understand both APIs and decide which one to use. This guide breaks down the differences and helps you make that call.

## Background: Why Two APIs?

The Istio classic APIs were created because Kubernetes Ingress was too limited for what a service mesh needs. VirtualService and DestinationRule gave Istio users powerful traffic management capabilities that Ingress simply could not provide.

The Kubernetes Gateway API was born out of the same frustration with Ingress, but as a community-wide effort. It is designed to be expressive enough to support the needs of service meshes, API gateways, and ingress controllers alike. Istio is one of the conformant implementations of the Gateway API.

The goal is that eventually the Gateway API becomes the standard, and implementations like Istio, Envoy Gateway, Traefik, and others all work with the same resource types.

## Resource Mapping

Here is how the classic Istio resources map to Gateway API resources:

| Istio Classic | Gateway API |
|---|---|
| Gateway | Gateway |
| VirtualService (external) | HTTPRoute |
| VirtualService (internal mesh) | HTTPRoute (with parentRefs to mesh) |
| DestinationRule (subsets) | No direct equivalent (use Service selectors) |
| DestinationRule (traffic policy) | Partially covered by BackendLBPolicy |
| ServiceEntry | ServiceImport (limited) |
| AuthorizationPolicy | No equivalent (still Istio-specific) |
| PeerAuthentication | No equivalent (still Istio-specific) |
| EnvoyFilter | No equivalent (still Istio-specific) |

The mapping is not one-to-one, and some Istio features do not have Gateway API equivalents.

## Basic Routing Comparison

Here is the same routing rule expressed in both APIs.

**Istio Classic:**

```yaml
apiVersion: networking.istio.io/v1beta1
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
        - app.example.com
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routes
spec:
  hosts:
    - app.example.com
  gateways:
    - app-gateway
  http:
    - match:
        - uri:
            prefix: /api
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
```

**Gateway API:**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: app-gateway
spec:
  gatewayClassName: istio
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      hostname: app.example.com
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-routes
spec:
  parentRefs:
    - name: app-gateway
  hostnames:
    - app.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-service
          port: 80
    - backendRefs:
        - name: frontend
          port: 80
```

The structure is different but the end result is the same. The Gateway API uses `gatewayClassName` to specify the implementation (Istio), while the classic API uses `selector` to bind to specific gateway pods.

## Traffic Splitting

Both APIs support weighted traffic splitting for canary deployments.

**Istio Classic:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: canary
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

**Gateway API:**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary
spec:
  parentRefs:
    - kind: Service
      group: ""
      name: reviews
  rules:
    - backendRefs:
        - name: reviews-v1
          port: 80
          weight: 90
        - name: reviews-v2
          port: 80
          weight: 10
```

Notice that the Gateway API routes to different Services rather than subsets of a single Service. This means you need separate Kubernetes Services for each version, while Istio's classic API uses DestinationRule subsets to select pods within a single Service.

## Header-Based Routing

Both support header matching.

**Istio Classic:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: header-routing
spec:
  hosts:
    - api-service
  http:
    - match:
        - headers:
            x-api-version:
              exact: "2"
      route:
        - destination:
            host: api-service
            subset: v2
    - route:
        - destination:
            host: api-service
            subset: v1
```

**Gateway API:**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-routing
spec:
  parentRefs:
    - kind: Service
      group: ""
      name: api-service
  rules:
    - matches:
        - headers:
            - name: x-api-version
              value: "2"
      backendRefs:
        - name: api-service-v2
          port: 80
    - backendRefs:
        - name: api-service-v1
          port: 80
```

## Features Only Available in Istio Classic APIs

Several Istio features do not have Gateway API equivalents:

**Fault injection**: VirtualService supports injecting delays and HTTP errors for testing. The Gateway API does not have this.

```yaml
# Only in Istio Classic
http:
  - fault:
      delay:
        percentage:
          value: 10
        fixedDelay: 5s
      abort:
        percentage:
          value: 5
        httpStatus: 503
    route:
      - destination:
          host: reviews
```

**Traffic mirroring**: VirtualService can mirror traffic to a secondary service. Not available in Gateway API.

```yaml
# Only in Istio Classic
http:
  - route:
      - destination:
          host: reviews-v1
    mirror:
      host: reviews-v2
    mirrorPercentage:
      value: 100
```

**DestinationRule traffic policies**: Circuit breaking, connection pool settings, load balancing algorithms, and outlier detection are configured through DestinationRule. The Gateway API has limited equivalents through BackendLBPolicy (experimental).

**EnvoyFilter**: Direct Envoy configuration is only possible through the Istio classic API. The Gateway API does not and will not have an equivalent.

**Security policies**: AuthorizationPolicy and PeerAuthentication are Istio-specific resources with no Gateway API counterpart.

## The Role-Oriented Model

One of the Gateway API's design principles is role-oriented configuration. It separates concerns:

- **Infrastructure provider**: Manages GatewayClass
- **Cluster operator**: Manages Gateway (controls which ports, protocols, and TLS certs are available)
- **Application developer**: Manages HTTPRoute (controls how traffic reaches their service)

This separation means an app developer can create HTTPRoutes without needing permissions to modify the Gateway. In the Istio classic model, a VirtualService can modify the Gateway binding, which is not as cleanly separated.

```yaml
# Developer creates HTTPRoute, attaching to an existing Gateway
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-route
  namespace: team-a
spec:
  parentRefs:
    - name: shared-gateway
      namespace: istio-system
  rules:
    - backendRefs:
        - name: my-app
          port: 80
```

## Portability

The Gateway API is designed to be portable across implementations. An HTTPRoute that works with Istio should also work with Envoy Gateway, Traefik, or any other conformant implementation. This is a significant advantage if you want to avoid lock-in to Istio's specific APIs.

Istio classic APIs are Istio-specific. If you move to a different service mesh or API gateway, your VirtualService and DestinationRule configurations are not portable.

## Which One Should You Use?

**Use the Gateway API when:**
- You want portability across implementations
- You are starting a new Istio deployment and want to use the standard
- Your routing needs are covered by HTTPRoute (host, path, header matching, traffic splitting)
- You want the role-oriented configuration model
- You are building a platform and want to provide a standard API to your developers

**Use Istio Classic APIs when:**
- You need fault injection, traffic mirroring, or advanced traffic policies
- You need DestinationRule features (circuit breaking, connection pool settings)
- You need EnvoyFilter for custom Envoy configuration
- You have existing Istio configurations that would be costly to migrate
- You need features that Gateway API does not yet support

**Use both when:**
- You want to use Gateway API for standard routing but need classic APIs for advanced features. Both can coexist in the same cluster.

## Summary

The Kubernetes Gateway API is the future standard for traffic management, and Istio fully supports it. For basic and moderate routing needs, the Gateway API provides a cleaner, more portable, and role-oriented configuration model. For advanced Istio features like fault injection, traffic mirroring, circuit breaking, and EnvoyFilter customization, you still need the classic APIs. Most teams will end up using a mix of both, and that is perfectly fine since Istio handles both APIs seamlessly.
