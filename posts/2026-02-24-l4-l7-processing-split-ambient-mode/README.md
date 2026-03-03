# How to Understand L4 and L7 Processing Split in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, L4, L7, Networking, Kubernetes

Description: Understanding how Istio ambient mode splits L4 and L7 traffic processing between ztunnel and waypoint proxies and what that means for your services.

---

The core architectural decision in Istio ambient mode is splitting traffic processing into two layers: L4 (transport layer) handled by ztunnel, and L7 (application layer) handled by waypoint proxies. This split is not just an implementation detail - it fundamentally changes how you think about configuring and operating your service mesh.

## What L4 Processing Covers

L4 processing deals with TCP connections without looking at the application protocol. In ambient mode, ztunnel handles all L4 concerns:

**Mutual TLS (mTLS):** ztunnel encrypts all traffic between pods in the mesh using mTLS. Every TCP connection gets a TLS handshake with SPIFFE-based identity verification. The application does not need to know about TLS at all.

**TCP-level authorization:** Policies that make decisions based on:
- Source identity (service account / SPIFFE ID)
- Destination port number
- Source and destination namespace
- Source and destination IP address

**TCP metrics:** Connection counts, bytes transferred, connection duration. No HTTP-specific metrics at this layer.

**Load balancing:** ztunnel performs basic L4 load balancing across destination endpoints.

Here is an example of an L4 authorization policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external
  namespace: backend
spec:
  action: DENY
  rules:
  - from:
    - source:
        notNamespaces: ["frontend", "api-gateway"]
```

This policy only looks at the source namespace, so ztunnel can enforce it directly without needing any L7 processing.

## What L7 Processing Covers

L7 processing requires understanding the application protocol (HTTP, gRPC, etc.). In ambient mode, waypoint proxies handle L7 concerns:

**HTTP routing:** Routing based on URL paths, headers, query parameters, or HTTP methods.

**Traffic splitting:** Sending a percentage of traffic to different service versions (canary deployments).

**Retries and timeouts:** Automatically retrying failed requests, setting per-route timeouts.

**Fault injection:** Introducing artificial delays or errors for testing.

**Header manipulation:** Adding, removing, or modifying HTTP headers.

**HTTP-level authorization:** Policies that look at:
- HTTP method (GET, POST, PUT, DELETE)
- URL path
- HTTP headers
- JWT claims
- Request principals from authentication

**L7 metrics:** Request rate, response codes, latency distributions, request/response sizes.

Here is an L7 authorization policy that requires a waypoint:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-get-for-reads
  namespace: backend
spec:
  targetRefs:
  - kind: Service
    group: ""
    name: catalog
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/frontend"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/catalog/*"]
```

This policy references HTTP methods and paths, which means ztunnel cannot enforce it. A waypoint proxy must be present.

## How the Split Works in Practice

When you deploy a service in an ambient-enrolled namespace, it automatically gets L4 processing from ztunnel. No waypoint proxy is needed for this. All traffic is encrypted, L4 authorization policies are enforced, and basic TCP metrics are collected.

When you add a waypoint proxy and associate it with the namespace or service, L7 processing kicks in. Traffic now takes an additional hop through the waypoint, where HTTP-aware policies and routing rules are applied.

The decision flow inside ztunnel is:

```text
1. Intercept outbound traffic from pod
2. Look up destination service
3. Apply L4 authorization policies
4. Check: Does the destination have a waypoint proxy?
   - NO: Forward directly to destination ztunnel via HBONE
   - YES: Forward to waypoint proxy via HBONE
5. Waypoint applies L7 policies and forwards to destination ztunnel
```

## Identifying Which Layer Handles Your Policy

A common source of confusion is knowing whether a policy will be enforced at L4 (ztunnel) or L7 (waypoint). Here is a simple rule:

**L4 (ztunnel) if the policy only uses:**
- `source.principal` / `source.namespace`
- `destination.port`
- `source.ip` / `destination.ip`

**L7 (waypoint required) if the policy uses:**
- `operation.methods`
- `operation.paths`
- `operation.hosts`
- `request.headers`
- `request.auth` fields

Example of each:

```yaml
# This is L4 - ztunnel handles it
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: l4-policy
  namespace: backend
spec:
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/web"]
    to:
    - operation:
        ports: ["8080"]
---
# This is L7 - needs a waypoint
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: l7-policy
  namespace: backend
spec:
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/web"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/v1/*"]
```

## What Happens When You Apply L7 Policies Without a Waypoint

If you apply an L7 authorization policy (one that references HTTP methods or paths) to a service that does not have a waypoint proxy, the policy will not be enforced. Istio does not silently fail or fall back to L4. The policy simply has no effect because there is no component capable of evaluating it.

You can detect this situation by checking:

```bash
# Check if there are L7 policies without a waypoint
kubectl get authorizationpolicy -n my-namespace -o yaml | grep -E "methods|paths|headers"

# Check if the namespace has a waypoint
kubectl get gateway -n my-namespace -l gateway.istio.io/managed=istio.io-mesh-controller
```

If you have L7 policies but no waypoint, you need to deploy one:

```bash
istioctl waypoint apply -n my-namespace --enroll-namespace
```

## Traffic Metrics Comparison

The metrics you get depend on which layer processes the traffic:

**L4-only metrics (from ztunnel):**

```promql
# Connection count
istio_tcp_connections_opened_total{destination_service="my-service.my-ns.svc.cluster.local"}

# Bytes transferred
rate(istio_tcp_sent_bytes_total{destination_service="my-service.my-ns.svc.cluster.local"}[5m])
```

**L7 metrics (from waypoint, only available when waypoint is deployed):**

```promql
# Request rate by response code
rate(istio_requests_total{destination_service="my-service.my-ns.svc.cluster.local"}[5m])

# P99 latency
histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_service="my-service.my-ns.svc.cluster.local"}[5m]))

# Error rate
sum(rate(istio_requests_total{destination_service="my-service.my-ns.svc.cluster.local", response_code=~"5.."}[5m]))
```

## Performance Implications

The L4/L7 split has direct performance implications:

**L4 only (ztunnel):** Very low overhead. ztunnel does not need to parse application protocol, buffer request bodies, or maintain HTTP state machines. The per-connection overhead is minimal - just the mTLS handshake and TCP proxying.

**L7 (waypoint):** Higher overhead because the waypoint must parse HTTP/2 or gRPC frames, evaluate routing rules, apply header matching, and potentially buffer requests for retries. This is the same overhead you would get with sidecar Envoy, but concentrated in fewer proxy instances.

The performance benefit of the split is that you only pay for L7 processing where you actually need it. In a typical microservices application, maybe 30-40% of services need HTTP-level features. The rest can run with just L4, saving significant CPU and memory.

## Migrating from Sidecar to Ambient

When migrating from sidecar mode, you need to audit your Istio configuration to understand which services need L7 features:

```bash
# Find all VirtualServices (these need L7)
kubectl get virtualservice --all-namespaces

# Find AuthorizationPolicies with L7 fields
kubectl get authorizationpolicy --all-namespaces -o yaml | grep -B 10 -E "methods:|paths:|headers:"

# Find DestinationRules with L7 traffic policy
kubectl get destinationrule --all-namespaces -o yaml | grep -B 5 "trafficPolicy"
```

Services that only have L4 policies and PeerAuthentication can run with just ztunnel. Services with VirtualServices, L7 AuthorizationPolicies, or advanced DestinationRules need waypoint proxies.

## Summary

The L4/L7 processing split is what makes ambient mode efficient. ztunnel provides universal mTLS and L4 authorization with minimal overhead, while waypoint proxies add L7 features only where needed. Understanding which layer handles which features helps you deploy the right components for your services and avoid common pitfalls like applying L7 policies without a waypoint proxy in place.
