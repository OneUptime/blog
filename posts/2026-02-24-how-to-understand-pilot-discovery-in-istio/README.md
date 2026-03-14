# How to Understand Pilot-Discovery in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pilot, Service Discovery, XDS, Envoy

Description: A deep look at Pilot-Discovery in Istio, the component responsible for service discovery and configuration distribution to Envoy sidecar proxies.

---

Pilot-Discovery is one of the most important pieces of the Istio control plane. It is the component inside istiod that handles service discovery and pushes configuration to every Envoy sidecar in your mesh. If Pilot is not working correctly, your sidecars will not know about services, routing rules will not apply, and traffic will not flow the way you expect.

## What Pilot-Discovery Does

The name "Pilot-Discovery" comes from the original standalone binary that ran Pilot in older Istio versions. Today, it runs as a module inside istiod, but the binary is still called `pilot-discovery`:

```bash
# Check the process inside istiod
kubectl exec -n istio-system deploy/istiod -- ps aux
# PID   USER   COMMAND
# 1     istio  /usr/local/bin/pilot-discovery discovery --monitoringAddr=...
```

Pilot-Discovery has three main responsibilities:

1. **Watch Kubernetes resources** for services, endpoints, and Istio custom resources
2. **Translate** those resources into Envoy configuration
3. **Push** that configuration to all connected sidecars using the xDS protocol

## The Watch Loop

Pilot-Discovery sets up watches on the Kubernetes API server for these resources:

- Services
- Endpoints / EndpointSlices
- Pods
- Nodes
- Namespaces
- VirtualServices
- DestinationRules
- Gateways
- ServiceEntries
- AuthorizationPolicies
- PeerAuthentications
- And other Istio CRDs

When any of these resources change, Pilot-Discovery receives a notification, recalculates the affected configuration, and pushes updates to the relevant proxies.

You can see the watches in action by checking the istiod logs:

```bash
kubectl logs -n istio-system deploy/istiod --tail=50 | grep "Push"
```

You will see lines like:

```text
2024-01-15T10:30:45.123Z  info  ads  Push debounce stable[50] 1 configs updated, pushing
```

Pilot-Discovery uses a debounce mechanism to batch multiple changes together. If several resources change within a short window (default 100ms), they are combined into a single push. This prevents overwhelming the sidecars with rapid-fire updates.

## The Translation Layer

The translation from Kubernetes/Istio resources to Envoy configuration is where most of the work happens. Here is a simplified view of how resources map:

| Istio/Kubernetes Resource | Envoy Configuration |
|--------------------------|---------------------|
| Service + Endpoints | Cluster + Endpoints |
| VirtualService | Route Configuration |
| DestinationRule | Cluster configuration (LB, circuit breaker) |
| Gateway | Listener configuration |
| AuthorizationPolicy | RBAC filter configuration |
| PeerAuthentication | TLS context configuration |

For example, when Pilot-Discovery sees this VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
  - reviews
  http:
  - match:
    - headers:
        end-user:
          exact: jason
    route:
    - destination:
        host: reviews
        subset: v2
  - route:
    - destination:
        host: reviews
        subset: v1
```

It generates Envoy route configuration with two routes: one matching the `end-user: jason` header that routes to the v2 cluster, and a default route to the v1 cluster.

You can see the generated Envoy routes:

```bash
istioctl proxy-config routes deploy/my-app -n default -o json | \
    python3 -m json.tool | head -80
```

## The xDS Push

Once the configuration is generated, Pilot-Discovery pushes it to sidecars using the xDS protocol. xDS is actually a family of protocols:

- **LDS** (Listener Discovery Service) - Listener configuration
- **RDS** (Route Discovery Service) - Route configuration
- **CDS** (Cluster Discovery Service) - Upstream cluster configuration
- **EDS** (Endpoint Discovery Service) - Endpoint addresses
- **SDS** (Secret Discovery Service) - TLS certificates

Pilot-Discovery decides which xDS types need to be pushed based on what changed. If only endpoints changed (a pod was added/removed), it pushes just EDS. If a VirtualService changed, it pushes RDS and possibly CDS.

Monitor push activity:

```bash
# Push count by type
kubectl exec -n istio-system deploy/istiod -- \
    curl -s localhost:15014/metrics | grep pilot_xds_pushes
```

```text
pilot_xds_pushes{type="cds"} 1234
pilot_xds_pushes{type="eds"} 5678
pilot_xds_pushes{type="lds"} 1234
pilot_xds_pushes{type="rds"} 2345
```

## Proxy Connection Management

Each sidecar maintains a persistent gRPC connection to Pilot-Discovery. You can see all connected proxies:

```bash
istioctl proxy-status
```

Output:

```text
NAME                                 CDS    LDS    EDS    RDS    ECDS   ISTIOD                    VERSION
my-app-abc.default                   SYNCED SYNCED SYNCED SYNCED -      istiod-xyz.istio-system   1.20.0
payment-def.payment                  SYNCED SYNCED SYNCED SYNCED -      istiod-xyz.istio-system   1.20.0
```

The SYNCED status means the proxy has the latest configuration. STALE means a push failed or the proxy disconnected.

Check the number of connected proxies:

```bash
kubectl exec -n istio-system deploy/istiod -- \
    curl -s localhost:15014/metrics | grep pilot_xds_connected
```

## Configuration Debugging

When Pilot-Discovery generates configuration, you can inspect exactly what each sidecar received:

```bash
# What listeners does this sidecar have?
istioctl proxy-config listeners deploy/my-app -n default

# What routes?
istioctl proxy-config routes deploy/my-app -n default

# What upstream clusters?
istioctl proxy-config clusters deploy/my-app -n default

# What endpoints for a specific cluster?
istioctl proxy-config endpoints deploy/my-app -n default \
    --cluster "outbound|8080||reviews.default.svc.cluster.local"
```

For a complete configuration dump:

```bash
istioctl proxy-config all deploy/my-app -n default -o json > proxy-config.json
```

## Performance Tuning

Pilot-Discovery's performance depends on:

- **Number of services/endpoints** - More services mean larger configuration and slower pushes
- **Number of connected proxies** - More proxies means more work during each push
- **Rate of changes** - Frequent endpoint changes (pod scaling) cause frequent pushes

Key tuning parameters:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      discoveryAddress: istiod.istio-system.svc:15012
  values:
    pilot:
      env:
        PILOT_PUSH_THROTTLE: "100"
        PILOT_DEBOUNCE_AFTER: "100ms"
        PILOT_DEBOUNCE_MAX: "1s"
        PILOT_ENABLE_EDS_DEBOUNCE: "true"
```

- `PILOT_PUSH_THROTTLE` - Maximum number of concurrent pushes
- `PILOT_DEBOUNCE_AFTER` - Time to wait for more changes before pushing
- `PILOT_DEBOUNCE_MAX` - Maximum time to wait before forcing a push

## Reducing Push Scope with Sidecar Resources

The single biggest optimization for Pilot-Discovery is using Sidecar resources to limit what each proxy receives:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
  - hosts:
    - "frontend/*"
    - "backend/*"
    - "istio-system/*"
```

Without this, every proxy receives configuration for every service in the mesh. With it, proxies only receive configuration for services they actually need to communicate with.

On a mesh with 500 services, this can reduce the per-proxy configuration size from megabytes to kilobytes and speed up pushes significantly.

## Pilot-Discovery Debug Endpoints

Istiod exposes several debug endpoints that show Pilot-Discovery's internal state:

```bash
# Port-forward to istiod
kubectl port-forward -n istio-system deploy/istiod 15014:15014

# Service registry
curl localhost:15014/debug/registryz | python3 -m json.tool

# Envoy configuration for a specific proxy
curl "localhost:15014/debug/config_dump?proxyID=my-app-abc.default" | python3 -m json.tool

# Push status
curl localhost:15014/debug/syncz | python3 -m json.tool

# Endpoint information
curl localhost:15014/debug/endpointz | python3 -m json.tool
```

These endpoints are invaluable for troubleshooting. If you suspect Pilot-Discovery is not generating the right configuration, dump the config for a specific proxy from istiod's perspective and compare it with what the sidecar reports.

Pilot-Discovery is the bridge between your intent (expressed as Kubernetes and Istio resources) and the reality of how traffic flows (encoded as Envoy configuration). When things work, you never think about it. When things break, knowing how Pilot-Discovery translates, caches, and pushes configuration is what helps you find the problem fast.
