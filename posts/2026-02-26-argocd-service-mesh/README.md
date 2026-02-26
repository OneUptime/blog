# How to Configure ArgoCD with Service Mesh (Istio/Linkerd)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Service Mesh, Istio

Description: Configure ArgoCD to work within Istio and Linkerd service meshes with mTLS, sidecar injection, health checks, and traffic management policies.

---

Running ArgoCD inside a service mesh adds mutual TLS (mTLS), observability, and traffic management to your GitOps platform. But service meshes also add complexity that can break ArgoCD if not configured carefully. Sidecars intercept traffic, mTLS can block unauthenticated connections, and health checks may fail through the proxy. This guide covers how to make ArgoCD work seamlessly with both Istio and Linkerd.

## The Challenge

Service meshes inject sidecar proxies into every pod. These proxies intercept all network traffic and enforce policies like mTLS. For ArgoCD, this creates several challenges:

1. **Startup ordering**: The sidecar might not be ready when ArgoCD tries to connect to Redis or the API server
2. **mTLS conflicts**: ArgoCD components use their own TLS for internal communication, which can conflict with the mesh's mTLS
3. **Health check failures**: Kubernetes health probes might not work through the sidecar proxy
4. **gRPC handling**: The sidecar needs to understand gRPC to properly proxy ArgoCD's internal communication

## Istio Configuration

### Enabling Sidecar Injection

Label the ArgoCD namespace to enable Istio sidecar injection:

```bash
kubectl label namespace argocd istio-injection=enabled
kubectl rollout restart deployment -n argocd
```

### Selective Injection

Not all ArgoCD components work well with sidecars. You may want to exclude some:

```yaml
# Exclude the repo-server if it has issues with sidecars
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    metadata:
      annotations:
        # Disable sidecar for repo-server if needed
        sidecar.istio.io/inject: "false"
```

### PeerAuthentication Policy

Configure mTLS mode for the ArgoCD namespace. Start with PERMISSIVE mode to avoid breaking existing connections:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: argocd-mtls
  namespace: argocd
spec:
  mtls:
    mode: PERMISSIVE
  # Or STRICT if all components have sidecars:
  # mtls:
  #   mode: STRICT
```

For individual services that need different modes:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: argocd-redis-mtls
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-redis
  mtls:
    mode: PERMISSIVE
  portLevelMtls:
    6379:
      mode: DISABLE
```

### DestinationRules

Configure how traffic reaches ArgoCD components through the mesh:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: argocd-server
  namespace: argocd
spec:
  host: argocd-server.argocd.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
      tcp:
        maxConnections: 100
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  host: argocd-repo-server.argocd.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: argocd-redis
  namespace: argocd
spec:
  host: argocd-redis.argocd.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

### Handling Startup Order

Istio's sidecar may not be ready when ArgoCD containers start. Use the holdApplicationUntilProxyStarts annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    metadata:
      annotations:
        # Wait for Istio proxy to be ready before starting
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

Apply this to all ArgoCD deployments:

```bash
# Patch all ArgoCD deployments
for deploy in argocd-server argocd-repo-server argocd-application-controller argocd-dex-server; do
  kubectl patch deployment $deploy -n argocd --type merge -p '{
    "spec": {
      "template": {
        "metadata": {
          "annotations": {
            "proxy.istio.io/config": "{\"holdApplicationUntilProxyStarts\": true}"
          }
        }
      }
    }
  }'
done
```

### Custom Health Checks for Istio Resources

ArgoCD needs custom health checks to understand Istio resources:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.networking.istio.io_VirtualService: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "VirtualService is configured"
    return hs
  resource.customizations.health.networking.istio.io_DestinationRule: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "DestinationRule is configured"
    return hs
  resource.customizations.health.networking.istio.io_Gateway: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "Gateway is configured"
    return hs
```

## Linkerd Configuration

Linkerd is simpler than Istio and generally works with ArgoCD with fewer adjustments.

### Injecting Linkerd Proxy

```bash
# Annotate the namespace
kubectl annotate namespace argocd linkerd.io/inject=enabled

# Restart ArgoCD pods
kubectl rollout restart deployment -n argocd
```

Or annotate individual deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    metadata:
      annotations:
        linkerd.io/inject: enabled
```

### Handling opaque ports

ArgoCD uses non-HTTP protocols (Redis, gRPC). Tell Linkerd to treat these as opaque (TCP-level proxying):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    metadata:
      annotations:
        linkerd.io/inject: enabled
        # Treat gRPC and Redis ports as opaque
        config.linkerd.io/opaque-ports: "6379,8081"
```

For Redis specifically:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-redis
  namespace: argocd
spec:
  template:
    metadata:
      annotations:
        linkerd.io/inject: enabled
        config.linkerd.io/opaque-ports: "6379"
```

### Startup Order with Linkerd

Linkerd also has a startup ordering concern. Use the wait-before-exit annotation:

```yaml
annotations:
  linkerd.io/inject: enabled
  config.linkerd.io/proxy-await: "enabled"
```

### Skip Outbound Ports

If ArgoCD needs to reach external services that are not part of the mesh:

```yaml
annotations:
  config.linkerd.io/skip-outbound-ports: "443"
```

This tells Linkerd to not proxy traffic to port 443, which is useful for reaching external Git repositories and the Kubernetes API server.

## ArgoCD Managing Mesh Resources

When ArgoCD deploys applications that include service mesh resources (VirtualServices, ServiceProfiles, etc.), you need to handle ignore differences for mesh-injected annotations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.ignoreDifferences.all: |
    jqPathExpressions:
      - .metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jqPathExpressions:
      - .spec.template.metadata.annotations["sidecar.istio.io/status"]
      - .spec.template.metadata.labels["security.istio.io/tlsMode"]
```

## Monitoring ArgoCD Through the Mesh

Both Istio and Linkerd provide metrics for ArgoCD traffic automatically:

### Istio Metrics

```bash
# View ArgoCD traffic metrics in Kiali
istioctl dashboard kiali

# Check mTLS status
istioctl x check-inject -n argocd

# Verify mTLS is working
istioctl authn tls-check argocd-server.argocd.svc.cluster.local
```

### Linkerd Metrics

```bash
# View ArgoCD in Linkerd dashboard
linkerd dashboard

# Check ArgoCD stats
linkerd stat deployment -n argocd

# Check live traffic
linkerd top deployment/argocd-server -n argocd
```

## Troubleshooting

**Application Controller Cannot Reach Managed Clusters**: The sidecar may intercept traffic to external cluster API servers. Skip those ports:

```yaml
# Istio
annotations:
  traffic.sidecar.istio.io/excludeOutboundPorts: "6443"

# Linkerd
annotations:
  config.linkerd.io/skip-outbound-ports: "6443"
```

**Redis Connection Failures**: Redis uses a binary protocol that sidecars may not handle well. Disable mTLS for Redis or mark the port as opaque.

**Slow Application Sync**: Sidecar overhead adds latency. For high-throughput environments, increase resource limits on the sidecar:

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "200m"
  sidecar.istio.io/proxyMemory: "256Mi"
```

For more on exposing ArgoCD through Istio specifically, see [ArgoCD with Istio Virtual Service](https://oneuptime.com/blog/post/2026-02-26-argocd-istio-virtual-service/view). For general ArgoCD networking, check [configuring ArgoCD with Network Policies](https://oneuptime.com/blog/post/2026-02-26-argocd-network-policies/view).
