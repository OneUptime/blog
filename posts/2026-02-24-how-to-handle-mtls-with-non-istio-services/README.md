# How to Handle mTLS with Non-Istio Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Non-Mesh Services, Migration, Kubernetes

Description: Strategies for handling communication between Istio mesh services using mTLS and services that are not part of the mesh.

---

Not everything in your cluster will have an Istio sidecar. Maybe you have a legacy service that breaks with the sidecar injected. Maybe a third-party operator deploys pods that you cannot modify. Maybe you have services running outside Kubernetes entirely that need to talk to mesh services.

Whatever the reason, handling the boundary between mTLS-enabled mesh services and non-mesh services is something you will deal with in every real-world Istio deployment.

## The Core Problem

When a mesh service uses strict mTLS, it requires every incoming connection to present a valid client certificate issued by Istio's CA. A service without a sidecar does not have this certificate and cannot obtain one. The connection gets rejected at the TLS handshake.

Going the other direction, when a mesh service calls a non-mesh service, the sidecar's auto mTLS detects that the destination does not have a sidecar and sends plain text. This direction usually works without configuration, but the traffic is unencrypted.

## Strategy 1: Permissive Mode for Mixed Environments

The simplest approach is to use PERMISSIVE mTLS mode for services that receive traffic from both mesh and non-mesh clients:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: accept-all-clients
  namespace: production
spec:
  selector:
    matchLabels:
      app: shared-api
  mtls:
    mode: PERMISSIVE
```

This tells the sidecar to accept both mTLS and plain text connections. Mesh clients automatically use mTLS (through auto mTLS), and non-mesh clients connect with plain text.

The downside: you lose the guarantee that all traffic to this service is encrypted and authenticated.

## Strategy 2: Port-Level Exceptions

If the non-mesh service only needs access to a specific port, use port-level mTLS to limit the exception:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: limited-exception
  namespace: production
spec:
  selector:
    matchLabels:
      app: shared-api
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: PERMISSIVE
```

The non-mesh service connects on port 8081 (plain text allowed), while mesh services use port 8080 (strict mTLS). You will need to configure your Service to expose both ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: shared-api
  namespace: production
spec:
  selector:
    app: shared-api
  ports:
  - name: mesh-port
    port: 8080
    targetPort: 8080
  - name: external-port
    port: 8081
    targetPort: 8080
```

Both ports route to the same container port, but the sidecar applies different mTLS policies.

## Strategy 3: Use an Ingress Gateway

For non-mesh services outside the cluster (or in a different network), route traffic through an Istio ingress gateway. The gateway handles TLS termination and then uses mTLS to communicate with the destination service inside the mesh:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: non-mesh-gateway
  namespace: production
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "shared-api.example.com"
    tls:
      mode: SIMPLE
      credentialName: shared-api-tls-cert
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: shared-api-vs
  namespace: production
spec:
  hosts:
  - "shared-api.example.com"
  gateways:
  - non-mesh-gateway
  http:
  - route:
    - destination:
        host: shared-api
        port:
          number: 8080
```

The non-mesh service connects to the gateway using standard HTTPS. The gateway then forwards the request to the mesh service using mTLS. The destination service can remain in STRICT mode.

## Strategy 4: Add the Sidecar

If possible, the best solution is to add a sidecar to the non-mesh service. This gives it full mesh capabilities including mTLS.

For services that break with automatic sidecar injection, try manual injection to customize the configuration:

```bash
istioctl kube-inject -f deployment.yaml > deployment-injected.yaml
```

Edit the injected YAML to adjust sidecar settings, then apply it:

```bash
kubectl apply -f deployment-injected.yaml
```

Common sidecar customizations for problematic services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "true"
        # Exclude specific ports from sidecar interception
        traffic.sidecar.istio.io/excludeInboundPorts: "9042"
        traffic.sidecar.istio.io/excludeOutboundPorts: "9042"
        # Increase sidecar resource limits for heavy traffic services
        sidecar.istio.io/proxyCPU: "200m"
        sidecar.istio.io/proxyMemory: "256Mi"
```

The `excludeInboundPorts` and `excludeOutboundPorts` annotations tell the sidecar to skip interception on those ports. Traffic on excluded ports bypasses the proxy entirely, going directly to/from the application container.

## Strategy 5: DestinationRule for Outbound Plain Text

When a mesh service needs to call a non-mesh service explicitly (without relying on auto mTLS detection), create a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: non-mesh-service-dr
  namespace: production
spec:
  host: legacy-service.legacy-namespace.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

This explicitly tells the source sidecar to use plain text when connecting to the legacy service. With auto mTLS enabled, this should not be necessary (auto mTLS detects non-mesh destinations automatically), but it can help in edge cases where detection fails.

## Handling External Non-Mesh Services

For services running outside Kubernetes (VMs, bare metal, other clusters), use a ServiceEntry to register them and a DestinationRule to set the TLS mode:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-legacy-api
  namespace: production
spec:
  hosts:
  - legacy-api.internal.company.com
  ports:
  - number: 8080
    name: http
    protocol: HTTP
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-legacy-api-dr
  namespace: production
spec:
  host: legacy-api.internal.company.com
  trafficPolicy:
    tls:
      mode: DISABLE
```

If the external service supports standard TLS (not Istio mTLS), use `mode: SIMPLE` instead:

```yaml
trafficPolicy:
  tls:
    mode: SIMPLE
    sni: legacy-api.internal.company.com
```

## Authorization Policies for Non-Mesh Traffic

When you allow plain text connections from non-mesh services, you lose identity-based authentication. To compensate, use AuthorizationPolicy with IP-based rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-legacy-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: shared-api
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/*"
    - source:
        ipBlocks:
        - "10.244.3.0/24"
  to:
  - operation:
      methods: ["GET", "POST"]
```

This allows connections from mesh services (identified by SPIFFE principal) AND from a specific IP range (where the legacy service runs).

## Monitoring Non-Mesh Traffic

Track the ratio of mTLS to plain text connections to understand your migration progress:

```text
sum(rate(istio_requests_total{connection_security_policy="none", reporter="destination"}[5m])) by (destination_service, source_workload)
```

Each entry in this query represents a service receiving plain text traffic and the source workload responsible. Use this to prioritize which non-mesh services to migrate next.

## Migration Path

The long-term goal should be full mesh coverage. Here is a practical migration order:

1. Start with permissive mode everywhere
2. Add sidecars to all services that can support them
3. Monitor to identify remaining non-mesh traffic sources
4. Address each non-mesh source (add sidecar, use gateway, or create permanent exception)
5. Switch to strict mode namespace by namespace
6. Document any permanent exceptions

Non-mesh services are a fact of life in real Kubernetes clusters. The key is to have clear visibility into where they are and a plan for handling each one, whether that means adding a sidecar, routing through a gateway, or accepting a documented exception.
