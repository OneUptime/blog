# How to Set Up DMZ Architecture with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DMZ, Security, Kubernetes, Network Architecture

Description: Build a DMZ (demilitarized zone) architecture in Kubernetes using Istio to isolate public-facing services from your internal backend infrastructure.

---

A DMZ (demilitarized zone) is a network segment that sits between your public-facing infrastructure and your internal systems. It adds a buffer layer so that if an attacker compromises a public-facing service, they still have to break through another boundary to reach your internal services. This pattern translates well to Kubernetes with Istio, where you can use namespaces, authorization policies, and gateways to create logical DMZ boundaries.

## DMZ Architecture in Kubernetes

In a traditional network, a DMZ has two firewalls: one between the internet and the DMZ, and another between the DMZ and the internal network. In Kubernetes with Istio, the equivalent looks like:

- **Public zone**: The Istio ingress gateway and any public-facing services
- **DMZ zone**: Services that process public requests but need limited internal access (API gateways, BFFs, authentication services)
- **Internal zone**: Backend services, databases, and internal APIs

Each zone lives in its own namespace with strict policies controlling what crosses zone boundaries.

## Setting Up the Namespaces

Create namespaces for each zone:

```bash
kubectl create namespace dmz
kubectl create namespace internal
kubectl label namespace dmz zone=dmz
kubectl label namespace internal zone=internal
kubectl label namespace dmz istio-injection=enabled
kubectl label namespace internal istio-injection=enabled
```

## Configuring the Ingress Gateway

The ingress gateway is your front door. All public traffic enters here and gets routed to services in the DMZ:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: public-gateway
  namespace: dmz
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
      credentialName: public-tls-cert
    hosts:
    - "api.example.com"
    - "www.example.com"
```

Route traffic to the DMZ services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
  namespace: dmz
spec:
  hosts:
  - "api.example.com"
  gateways:
  - public-gateway
  http:
  - match:
    - uri:
        prefix: "/api/"
    route:
    - destination:
        host: api-gateway.dmz.svc.cluster.local
        port:
          number: 8080
  - match:
    - uri:
        prefix: "/auth/"
    route:
    - destination:
        host: auth-service.dmz.svc.cluster.local
        port:
          number: 8080
```

Nothing from the public internet should route directly to the internal zone. All traffic must pass through the DMZ first.

## Locking Down the Internal Zone

Apply strict isolation to the internal zone:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: internal
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: internal
spec:
  {}
```

Now nothing can reach the internal zone. Add targeted rules for DMZ services that need to call internal backends:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-dmz-to-user-service
  namespace: internal
spec:
  selector:
    matchLabels:
      app: user-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/dmz/sa/api-gateway"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/internal/users/*"]
```

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-dmz-to-order-service
  namespace: internal
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/dmz/sa/api-gateway"
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/internal/orders", "/internal/orders/*"]
```

Notice that internal services expose different API paths for DMZ consumers (prefixed with `/internal/`) compared to what they might expose within the internal zone. This is a good practice for distinguishing internal-only from DMZ-accessible endpoints.

## Securing the DMZ Itself

The DMZ zone also needs policies. Services in the DMZ should only accept traffic from the ingress gateway and from each other (if needed):

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: dmz
spec:
  {}
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-ingress-gateway
  namespace: dmz
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["istio-system"]
        principals:
        - "cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"
```

If the DMZ's auth-service needs to be called by the api-gateway:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-api-to-auth
  namespace: dmz
spec:
  selector:
    matchLabels:
      app: auth-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/dmz/sa/api-gateway"
    to:
    - operation:
        methods: ["POST"]
        paths: ["/auth/validate", "/auth/refresh"]
```

## Preventing Internal-to-DMZ Backflow

An important DMZ property is that internal services should not be able to call DMZ services. Traffic should flow in one direction: internet -> DMZ -> internal. If internal services could call DMZ services, an attacker who compromises an internal service could potentially use a DMZ service as a proxy to exfiltrate data.

Use Sidecar resources to enforce this:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: internal-sidecar
  namespace: internal
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

By only including `./*` (same namespace) and `istio-system/*`, internal services can't see or reach anything in the DMZ namespace.

## Adding a WAF Layer

For production DMZ architectures, you'll want a Web Application Firewall (WAF) in front of your ingress gateway. You can use an EnvoyFilter to add custom Lua or WASM filters at the gateway level:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-filter
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
            name: "envoy.filters.network.http_connection_manager"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          value:
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 100
              tokens_per_fill: 100
              fill_interval: 60s
            filter_enabled:
              runtime_key: local_rate_limit_enabled
              default_value:
                numerator: 100
                denominator: HUNDRED
            filter_enforced:
              runtime_key: local_rate_limit_enforced
              default_value:
                numerator: 100
                denominator: HUNDRED
```

## Monitoring the DMZ

Set up specific monitoring for DMZ traffic patterns. Unusual traffic to internal services from the DMZ could indicate a compromise:

```bash
# Monitor request rates from DMZ to internal
istio_requests_total{source_workload_namespace="dmz",destination_workload_namespace="internal",reporter="destination"}
```

Set up alerts for:
- High error rates from DMZ services
- Unexpected HTTP methods (PUT/DELETE if only GET/POST should be used)
- Traffic from DMZ to internal services that aren't in your allowlist
- Spike in 403 responses (could indicate probing)

```bash
kubectl logs -l app=api-gateway -c istio-proxy -n dmz --tail=100
```

## Testing the DMZ Boundaries

Verify that the boundaries work as expected:

```bash
# Should succeed: ingress -> DMZ
kubectl exec deploy/test-pod -n istio-system -- curl -v http://api-gateway.dmz:8080/health

# Should fail: direct access to internal from outside DMZ
kubectl exec deploy/test-pod -n default -- curl -v http://user-service.internal:8080/internal/users/1

# Should fail: internal -> DMZ (backflow)
kubectl exec deploy/user-service -n internal -- curl -v http://api-gateway.dmz:8080/api/health
```

A well-configured DMZ architecture with Istio gives you the same security properties as traditional DMZ networks but with the flexibility and granularity of a service mesh. Traffic flows in a controlled direction, each zone has strict access policies, and every connection is authenticated and encrypted.
