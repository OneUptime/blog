# Model Istio Routing Without Chaining VirtualServices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, VirtualService, Traffic Routing, Service Mesh, Kubernetes Service, ServiceEntry, Troubleshooting

Description: Model Istio routing correctly by distinguishing rule objects from network destinations and choosing delegation, services, subsets, redirects, or gateways.

---

An Istio `VirtualService` is a set of rules, not a network endpoint. It has no socket, IP address, port, or Envoy cluster of its own. Therefore this route is conceptually invalid:

```yaml
route:
- destination:
    host: another-virtualservice
```

`destination.host` must name a service in Istio's service registry: typically a Kubernetes Service, another platform registry service, or a host declared by `ServiceEntry`. It does not name the Kubernetes metadata object that contains another rule set.

The right model depends on the intended meaning of route to another VirtualService. It may mean reuse a block of HTTP rules, send traffic to another application, redirect the client to another authority, or force a real second proxy hop. Each has a different Istio primitive.

## Separate Rule Identity from Traffic Identity

Consider these names:

```yaml
kind: VirtualService
metadata:
  name: public-api-routes
spec:
  hosts:
  - api.example.com
```

`public-api-routes` is a Kubernetes object name used to manage the rule. `api.example.com` is a traffic host against which the rules apply. Neither is automatically an upstream endpoint.

A route destination such as:

```yaml
destination:
  host: orders.orders.svc.cluster.local
  subset: v2
```

names a real registry service and optionally a subset defined in a DestinationRule. Istiod can translate it into an Envoy cluster populated with endpoints.

This distinction explains several symptoms:

- `istioctl analyze` reports a host not found in the registry;
- Envoy returns `503 NC` because a route references no cluster;
- a cluster exists for the real Service but not for the VirtualService object name; or
- two rule objects overlap on one host and merge or conflict instead of forming a chain.

## Inspect the Effective Failure

Analyze configuration and inspect the proxy that should route the request:

```bash
istioctl analyze --all-namespaces
istioctl proxy-config routes pod/client-7ccfd5b8d7-s8m2q.apps
istioctl proxy-config clusters pod/client-7ccfd5b8d7-s8m2q.apps
```

At a gateway, query the gateway proxy instead of the application sidecar. Capture the access-log response flag, response-code detail, route name, authority, and upstream cluster. `NR` means no matching HTTP route or no matching listener filter chain; `NC` means the selected upstream cluster was not found. A `503 UH` means the cluster exists but has no healthy endpoints, which is a later problem.

Read the relevant objects:

```bash
kubectl get virtualservice,destinationrule,serviceentry -A -o yaml
kubectl get service -A
```

Use filtered output in large or sensitive clusters. For every destination host, prove that a corresponding registry service exists and is visible to the routing proxy.

## Model Rule Reuse with VirtualService Delegation

If the real goal is to let one team own a portion of a large HTTP rule tree, use `delegate`, not `destination`. A root VirtualService can match a path and delegate its HTTP route definition to another VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: storefront-root
  namespace: gateways
spec:
  hosts:
  - shop.example.com
  gateways:
  - public-gateway
  http:
  - name: orders-root
    match:
    - uri:
        prefix: /orders
    delegate:
      name: orders-routes
      namespace: orders
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: orders-routes
  namespace: orders
spec:
  http:
  - name: orders-v2
    match:
    - uri:
        prefix: /orders/v2
    route:
    - destination:
        host: orders.orders.svc.cluster.local
        subset: v2
  - name: orders-default
    route:
    - destination:
        host: orders.orders.svc.cluster.local
        subset: v1
```

The delegate VirtualService has no top-level `hosts`; it supplies HTTP routes to be merged into the root. Official Istio semantics impose important constraints:

- only one level of delegation is supported;
- the delegate applies to HTTP routes, not arbitrary TCP or TLS route chaining;
- the delegate's match must be a strict subset of the root match;
- a delegating HTTP rule cannot also forward or redirect; and
- regex matches on the same property across root and delegate have additional restrictions.

Use delegation to divide configuration ownership, not to insert a network hop. After compilation, Envoy receives one effective route tree that still forwards to a real service.

## Model Application Handoff with a Real Service

If route A should send the request to application B, target B's Kubernetes Service directly:

```yaml
http:
- match:
  - uri:
      prefix: /billing
  route:
  - destination:
      host: billing.billing.svc.cluster.local
      port:
        number: 8080
```

Put B's version labels in a DestinationRule and select a subset when needed:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: billing
  namespace: billing
spec:
  host: billing.billing.svc.cluster.local
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
```

A subset is a label filter over endpoints of one service, not a second route object. Verify the labels exist on Pods selected by the Service and that the routing proxy can see the DestinationRule.

Use fully qualified service names across namespaces. Istio resolves a short destination name relative to the namespace of the VirtualService, not relative to the namespace where the Service happens to live.

If B is external or otherwise absent from the platform registry, create a carefully scoped ServiceEntry with explicit resolution, ports, and `exportTo`, then route to its host. A ServiceEntry is still a service-registry record, which gives Istiod enough information to build a cluster.

## Model Client Redirection Explicitly

If the client should make a new request to another public host, use an HTTP redirect:

```yaml
http:
- match:
  - uri:
      prefix: /legacy
  redirect:
    authority: api-v2.example.com
    uri: /
    redirectCode: 308
```

The client sees a redirect response and decides whether to follow it. This changes browser behavior, method handling, authentication scope, caching, and cross-origin policy. Choose `301`, `302`, `307`, or `308` according to the application contract; do not use redirect as an internal, invisible service hop.

A rewrite is different. It changes URI or authority inside Envoy before forwarding, but the same route must still name a real destination service:

```yaml
http:
- match:
  - uri:
      prefix: /legacy
  rewrite:
    uri: /v2
  route:
  - destination:
      host: api-v2.apps.svc.cluster.local
```

Use rewrite when the upstream application expects another path, not as a substitute for a registry destination.

## Model a Real Second Proxy Hop with a Gateway Service

Sometimes another policy boundary must inspect the request before the final service-for example, an egress gateway or an internal shared gateway. That requires an actual network-addressable gateway workload and Service:

```text
source sidecar
  -> internal-gateway.gateways.svc.cluster.local
  -> gateway Envoy
  -> final service
```

The first VirtualService routes to the gateway **Service**, not to the second VirtualService. Another VirtualService bound to the gateway configures the gateway's onward route. This is the documented egress-gateway pattern.

Be explicit about host and TLS behavior on both hops. A careless two-stage rule can loop traffic back to the same gateway or apply TLS origination twice. Inspect both proxies' routes and clusters, and use distinct match contexts such as `gateways: [mesh]` for the sidecar leg and the named Gateway for the gateway leg.

A second hop adds latency, capacity requirements, failure modes, and an additional authorization boundary. Do not add it merely to make configuration files feel composable; delegation is cheaper when no network enforcement point is needed.

## Avoid Overlapping VirtualServices as an Accidental Chain

Istio allows the traffic properties for a host to be spread across multiple VirtualServices in some scenarios, but their rules are merged into configuration for that host. They do not execute as a guaranteed object-by-object pipeline. Overlapping catch-all routes, duplicate match conditions, or inconsistent gateway bindings can produce conflicts and order surprises.

Prefer one clear owner per host, delegation for HTTP ownership boundaries, and explicit route names. If multiple resources are required, document merge expectations and test the generated route order:

```bash
istioctl analyze -f candidate/
kubectl apply --dry-run=server -f candidate/
# After applying candidate/ to a test cluster and waiting for proxy synchronization:
istioctl proxy-config routes pod/GATEWAY_POD.gateway-namespace -o json
```

The first matching HTTP rule wins. Put specific matches before catch-all routes in the effective configuration. A rule that is never reached may be accepted by Kubernetes and still be operationally useless.

## Choose the Primitive from the Intent

| Intent | Correct model |
| --- | --- |
| Split ownership of HTTP rules | Root and delegate VirtualServices |
| Send traffic to another app | Route to its Service or ServiceEntry host |
| Select a version | DestinationRule subset on a real service |
| Ask client to use another URL | HTTP redirect |
| Change upstream path or authority internally | Rewrite plus real destination |
| Apply policy at another proxy | Route to a gateway Service, then gateway-bound rules |
| Return without an upstream | Direct response |

This table also clarifies observability. Delegation produces one compiled routing decision; the illustrated gateway path has two proxy routing stages and two upstream legs, with connections potentially reused from pools. Trace spans depend on tracing configuration and sampling. A redirect produces a second client request only if the client follows it.

## Verify the Compiled Result

After applying the intended model, check:

```bash
istioctl analyze --all-namespaces
istioctl proxy-status
istioctl proxy-config routes pod/ROUTING_PROXY.namespace
istioctl proxy-config clusters pod/ROUTING_PROXY.namespace \
  --fqdn orders.orders.svc.cluster.local
istioctl proxy-config endpoints pod/ROUTING_PROXY.namespace \
  --cluster 'outbound|8080|v2|orders.orders.svc.cluster.local'
```

Use names copied from live summaries. Confirm the request's authority and path select the named route, the destination cluster exists, and its endpoints are healthy. For delegation, inspect that root and delegate matches compiled in the intended order. For a gateway hop, repeat at both proxies and ensure the first upstream is the gateway Service.

Test positive, fallback, and nonmatching requests. A successful primary path can hide a catch-all that sends unrelated traffic to the same service.

## Conclusion

VirtualServices describe routing; they are not things traffic can connect to. Route destinations must be services from Istio's registry. Use delegation to compose HTTP rule ownership, a Service or ServiceEntry for an application handoff, a subset for versions, a redirect for a new client request, or a real gateway Service for a second proxy hop. Once the intent is explicit, Envoy's route-to-cluster-to-endpoint result becomes straightforward to verify.

## Official Documentation

- [Istio: Virtual Service](https://istio.io/latest/docs/reference/config/networking/virtual-service/)
- [Istio: Traffic Management Concepts](https://istio.io/latest/docs/concepts/traffic-management/)
- [Istio: Destination Rule](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio: Service Entry](https://istio.io/latest/docs/reference/config/networking/service-entry/)
- [Istio: Egress Gateways](https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/)
- [Istio: Configuration Scoping](https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/)
- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
