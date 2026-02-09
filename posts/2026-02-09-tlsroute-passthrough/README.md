# How to configure TLSRoute for TLS passthrough routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, TLS

Description: Learn how to implement TLSRoute resources for TLS passthrough routing where encrypted traffic flows directly to backend services without termination.

---

Not all TLS traffic should be terminated at the gateway. Some applications require end-to-end encryption where the backend service handles TLS termination, or you might want to route different SNI hostnames to different backends without decrypting traffic. TLSRoute provides this capability through TLS passthrough routing, forwarding encrypted streams directly to appropriate backends based on SNI information.

## Understanding TLS Passthrough

TLS passthrough means the gateway doesn't terminate TLS connections. Instead, it inspects the Server Name Indication (SNI) field in the TLS ClientHello message and routes the encrypted stream to the appropriate backend based on hostname. The backend service handles certificate management and TLS termination.

This approach provides end-to-end encryption and allows backends to manage their own certificates independently.

## Creating a Basic TLSRoute

Start with simple SNI-based routing to a backend service.

```yaml
# tlsroute-basic.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: basic-tls-route
  namespace: default
spec:
  parentRefs:
    - name: tls-gateway
      sectionName: tls-passthrough
  hostnames:
    - "secure.example.com"
  rules:
    - backendRefs:
        - name: secure-service
          port: 443

---
# Gateway with TLS passthrough listener
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: tls-gateway
  namespace: default
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: tls-passthrough
      protocol: TLS
      port: 443
      tls:
        mode: Passthrough
      allowedRoutes:
        kinds:
          - kind: TLSRoute
```

The Gateway listener operates in Passthrough mode, and TLSRoute directs traffic based on SNI.

## Implementing Multi-Hostname TLS Routing

Route different SNI hostnames to different backend services.

```yaml
# tlsroute-multi-hostname.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: multi-hostname-tls
  namespace: default
spec:
  parentRefs:
    - name: tls-gateway
      sectionName: tls-passthrough
  rules:
    # Route api.example.com
    - matches:
        - snis:
            - "api.example.com"
      backendRefs:
        - name: api-service
          port: 443

    # Route db.example.com
    - matches:
        - snis:
            - "db.example.com"
      backendRefs:
        - name: database-service
          port: 5432

    # Route *.internal.example.com
    - matches:
        - snis:
            - "*.internal.example.com"
      backendRefs:
        - name: internal-service
          port: 443
```

Each SNI hostname routes to its appropriate backend without decrypting traffic.

## Routing Database Protocols Over TLS

Use TLS passthrough for database connections that require TLS.

```yaml
# tlsroute-postgres.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: postgres-tls-route
  namespace: database
spec:
  parentRefs:
    - name: database-gateway
      namespace: gateway-system
      sectionName: postgres-tls
  hostnames:
    - "postgres.database.svc.cluster.local"
  rules:
    - backendRefs:
        - name: postgres-primary
          port: 5432

---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: database-gateway
  namespace: gateway-system
spec:
  gatewayClassName: istio-gateway
  listeners:
    - name: postgres-tls
      protocol: TLS
      port: 5432
      tls:
        mode: Passthrough
      allowedRoutes:
        kinds:
          - kind: TLSRoute
        namespaces:
          from: All
```

Database clients connect through the gateway with full TLS encryption to the backend.

## Implementing Traffic Splitting with TLS

Split TLS traffic across multiple backends for blue-green or canary deployments.

```yaml
# tlsroute-traffic-split.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: canary-tls-route
  namespace: default
spec:
  parentRefs:
    - name: tls-gateway
      sectionName: tls-passthrough
  hostnames:
    - "app.example.com"
  rules:
    - backendRefs:
        # 90% to stable version
        - name: app-stable
          port: 443
          weight: 90

        # 10% to canary version
        - name: app-canary
          port: 443
          weight: 10
```

Traffic splits based on weight while maintaining end-to-end encryption.

## Routing to Cross-Namespace Backends

Route TLS traffic to services in different namespaces.

```yaml
# tlsroute-cross-namespace.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: cross-namespace-tls
  namespace: frontend
spec:
  parentRefs:
    - name: shared-tls-gateway
      namespace: gateway-system
  hostnames:
    - "api.example.com"
  rules:
    - backendRefs:
        - name: api-service
          namespace: backend
          port: 443

---
# ReferenceGrant to allow cross-namespace access
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-frontend-to-backend-tls
  namespace: backend
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: TLSRoute
      namespace: frontend
  to:
    - group: ""
      kind: Service
      name: api-service
```

## Implementing Redis Over TLS Passthrough

Route Redis connections with TLS through the gateway.

```yaml
# tlsroute-redis.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: redis-tls-route
  namespace: cache
spec:
  parentRefs:
    - name: cache-gateway
      sectionName: redis-tls
  hostnames:
    - "redis.cache.svc.cluster.local"
  rules:
    - backendRefs:
        - name: redis-master
          port: 6379

---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: cache-gateway
  namespace: cache
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: redis-tls
      protocol: TLS
      port: 6379
      tls:
        mode: Passthrough
      allowedRoutes:
        kinds:
          - kind: TLSRoute
        namespaces:
          from: Same
```

Redis clients connect with TLS, and the gateway forwards encrypted traffic to Redis.

## Monitoring TLSRoute Health

Check TLSRoute status and backend attachment.

```bash
# Check TLSRoute status
kubectl get tlsroute basic-tls-route -o wide

# Get detailed status
kubectl describe tlsroute basic-tls-route

# Check parent attachment status
kubectl get tlsroute basic-tls-route -o jsonpath='{.status.parents[*].conditions[*]}'

# Verify backend resolution
kubectl get tlsroute basic-tls-route -o jsonpath='{.status.parents[0].conditions[?(@.type=="ResolvedRefs")]}'
```

## Implementing Fallback Backends

Configure fallback routing when primary backends are unavailable.

```yaml
# tlsroute-fallback.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: tls-with-fallback
  namespace: default
spec:
  parentRefs:
    - name: tls-gateway
  hostnames:
    - "app.example.com"
  rules:
    - backendRefs:
        # Primary backend
        - name: app-primary
          port: 443
          weight: 100

        # Fallback backend (used if primary fails)
        - name: app-backup
          port: 443
          weight: 0
```

When the primary backend is unavailable, traffic automatically fails over to the backup.

## Combining TLS Passthrough with TCP

Use TLS passthrough for custom TCP protocols.

```yaml
# tlsroute-custom-protocol.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: custom-protocol-tls
  namespace: default
spec:
  parentRefs:
    - name: custom-gateway
      sectionName: custom-tls
  hostnames:
    - "custom.example.com"
  rules:
    - backendRefs:
        - name: custom-service
          port: 8443

---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: custom-gateway
spec:
  gatewayClassName: envoy-gateway
  listeners:
    - name: custom-tls
      protocol: TLS
      port: 8443
      tls:
        mode: Passthrough
```

## Debugging TLS Passthrough Issues

Troubleshoot TLS routing problems.

```bash
# Test SNI from client
openssl s_client -connect gateway-address:443 -servername secure.example.com

# Check Gateway listener accepts TLSRoute
kubectl get gateway tls-gateway -o jsonpath='{.spec.listeners[*].allowedRoutes}'

# Verify TLSRoute attached to Gateway
kubectl get tlsroute basic-tls-route -o jsonpath='{.status.parents[*].parentRef.name}'

# Check backend service endpoints
kubectl get endpoints secure-service

# Test connectivity to backend directly
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- \
  openssl s_client -connect secure-service:443
```

## Implementing Multi-Cluster TLS Routing

Route TLS traffic across multiple clusters.

```yaml
# tlsroute-multi-cluster.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: multi-cluster-tls
  namespace: default
spec:
  parentRefs:
    - name: multi-cluster-gateway
  hostnames:
    - "app.example.com"
  rules:
    - backendRefs:
        # Backend in local cluster
        - name: app-local
          port: 443
          weight: 50

        # Backend in remote cluster (via service export)
        - name: app-remote
          group: multicluster.x-k8s.io
          kind: ServiceImport
          port: 443
          weight: 50
```

## Best Practices for TLS Passthrough

Use TLS passthrough when backends require their own certificate management or when regulations mandate end-to-end encryption.

Configure SNI hostnames carefully. Wildcards work but exact matches are more performant.

Monitor backend service health. The gateway can't inspect encrypted traffic, so backend health checks are critical.

Use appropriate weights for traffic splitting. TLS connections can be long-lived, so weight changes affect new connections.

Document why specific routes use passthrough rather than termination to help future maintainers understand the architecture.

Test certificate updates on backends without gateway involvement. Passthrough means the gateway doesn't see certificate changes.

Configure appropriate timeout values for long-lived TLS connections like databases.

Use ReferenceGrants carefully when allowing cross-namespace backend references for security.

Monitor connection metrics to understand TLS routing patterns and identify issues.

Keep TLS passthrough listeners separate from terminating listeners for clearer configuration and troubleshooting.

TLSRoute with passthrough mode provides the flexibility to route encrypted traffic based on SNI while maintaining end-to-end encryption. This capability is essential for database connections, compliance requirements, and scenarios where backends must manage their own certificates independently.
