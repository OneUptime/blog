# How to Use Istio Ambient Mode to Reduce Resource Costs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Cost Optimization, Service Mesh, Kubernetes

Description: A practical guide to deploying Istio ambient mode and understanding how it eliminates sidecar overhead to dramatically reduce service mesh resource costs.

---

Istio's sidecar model works well, but it has an inherent cost problem. Every pod in the mesh gets its own Envoy proxy that consumes CPU and memory. For a cluster with 500 pods, that is 500 extra containers, each reserving resources whether they are busy or not.

Ambient mode changes this fundamentally. Instead of a sidecar per pod, it uses a shared per-node proxy (ztunnel) for L4 traffic and optional per-service waypoint proxies for L7 features. The result is dramatically fewer proxy instances and significantly lower resource costs.

## How Ambient Mode Works

In the sidecar model, traffic flows like this:

```
App A → Sidecar A → Network → Sidecar B → App B
```

In ambient mode, L4 traffic flows through the ztunnel:

```
App A → ztunnel (Node A) → Network → ztunnel (Node B) → App B
```

For L7 features (HTTP routing, retries, header-based routing), traffic goes through a waypoint proxy:

```
App A → ztunnel → Waypoint Proxy → ztunnel → App B
```

The ztunnel runs as a DaemonSet, so there is one per node regardless of how many pods are on that node. This is the key to the cost savings.

## Installing Istio in Ambient Mode

Install Istio with the ambient profile:

```bash
istioctl install --set profile=ambient -y
```

This installs:
- `istiod` (the control plane)
- `ztunnel` DaemonSet (one per node)
- `istio-cni` DaemonSet (for transparent traffic redirection)

It does not install an ingress gateway by default. Add one if you need it:

```bash
istioctl install --set profile=ambient \
  --set components.ingressGateways[0].enabled=true \
  --set components.ingressGateways[0].name=istio-ingressgateway -y
```

## Enrolling Namespaces in Ambient Mode

Instead of labeling namespaces with `istio-injection=enabled`, use the ambient data plane mode label:

```bash
kubectl label namespace production istio.io/dataplane-mode=ambient
```

That is it. All pods in the `production` namespace are now part of the mesh with mTLS and L4 traffic management. No sidecars injected, no pod restarts needed.

Verify it is working:

```bash
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.containers[*]}{.name} {end}{"\n"}{end}'
```

You should see only your application containers. No `istio-proxy` container.

## Adding L7 Features with Waypoint Proxies

If you need L7 features (HTTP routing, retries, authorization based on HTTP headers), deploy a waypoint proxy:

```bash
istioctl waypoint apply -n production --enroll-namespace
```

This creates a waypoint proxy deployment in the `production` namespace. All L7 policies in that namespace are enforced by the waypoint proxy.

You can also create waypoint proxies for specific service accounts:

```bash
istioctl waypoint apply -n production --name payment-waypoint \
  --for service --service-account payment-service
```

This creates a waypoint only for the `payment-service` service account. Other services in the namespace use only the ztunnel for L4.

## Calculating the Cost Savings

Here is a concrete comparison. Consider a cluster with 10 nodes and 300 pods:

**Sidecar mode:**
- 300 sidecars, each requesting 100m CPU and 128Mi memory
- Total sidecar resources: 30 CPU cores, 37.5 GB memory
- Cost at $35/core/month and $8.76/GB/month: $1,050 + $328 = $1,378/month

**Ambient mode (L4 only):**
- 10 ztunnel pods (one per node), each requesting 200m CPU and 256Mi memory
- Total ztunnel resources: 2 CPU cores, 2.5 GB memory
- Cost: $70 + $22 = $92/month

**Ambient mode (L4 + L7 waypoints for 5 critical services):**
- 10 ztunnel pods: 2 CPU cores, 2.5 GB memory
- 5 waypoint proxies, each requesting 200m CPU and 256Mi memory: 1 CPU core, 1.25 GB memory
- Total: 3 CPU cores, 3.75 GB memory
- Cost: $105 + $33 = $138/month

The savings going from sidecar to ambient L4 only: **93%**. With waypoints for critical services: **90%**.

## Configuring ztunnel Resources

The ztunnel DaemonSet can be configured through the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: ambient
  values:
    ztunnel:
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
```

The ztunnel is a lightweight Rust-based proxy that handles mTLS and L4 routing. It uses significantly less memory than Envoy because it does not need to parse HTTP or maintain L7 state.

## Configuring Waypoint Proxy Resources

Waypoint proxies are full Envoy instances that handle L7 traffic. Size them based on the traffic they handle:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-waypoint
  namespace: production
  labels:
    istio.io/waypoint-for: service
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
```

To set resource limits on waypoint proxies, use the Gateway API with annotations:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-waypoint
  namespace: production
  annotations:
    proxy.istio.io/config: |
      concurrency: 2
  labels:
    istio.io/waypoint-for: service
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
```

## Migrating from Sidecar to Ambient Mode

You can migrate gradually. Sidecar and ambient workloads can coexist in the same mesh.

Step 1: Install ambient components alongside your existing sidecar installation:

```bash
istioctl install --set profile=ambient -y
```

Step 2: Migrate one namespace at a time. Remove the sidecar injection label and add the ambient label:

```bash
kubectl label namespace staging istio-injection-
kubectl label namespace staging istio.io/dataplane-mode=ambient
```

Step 3: Restart pods in the namespace to remove sidecars:

```bash
kubectl rollout restart deployment -n staging
```

Step 4: Verify mTLS is working:

```bash
istioctl proxy-config all deploy/your-service -n staging
```

Step 5: If L7 features are needed, add a waypoint proxy:

```bash
istioctl waypoint apply -n staging --enroll-namespace
```

## What Works Without Waypoint Proxies

With just ztunnel (no waypoint), you get:

- Mutual TLS between all pods
- L4 authorization policies (source namespace, principal)
- TCP traffic metrics
- L4 network policies

You do not get:
- HTTP routing (VirtualService)
- HTTP retries and timeouts
- Header-based authorization
- Request-level metrics (istio_requests_total)
- Traffic mirroring or fault injection

For many services, L4 is all you need. Authentication, encryption, and basic network policies cover the most important security requirements.

## Authorization Policies in Ambient Mode

L4 authorization policies work with ztunnel:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend-api
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/frontend"
```

L7 authorization policies require a waypoint proxy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-get-only
  namespace: production
spec:
  targetRefs:
  - kind: Service
    group: ""
    name: backend-api
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/frontend"
    to:
    - operation:
        methods: ["GET"]
```

## Monitoring Cost Savings

Track the resource reduction:

```promql
# Before: total sidecar resources
sum(kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"})

# After: ztunnel resources
sum(kube_pod_container_resource_requests{container="ztunnel", resource="cpu"})

# Waypoint resources
sum(kube_pod_container_resource_requests{container="istio-proxy", pod=~".*waypoint.*", resource="cpu"})
```

## Summary

Ambient mode is the biggest cost optimization available in Istio today. By replacing per-pod sidecars with per-node ztunnels, you can reduce mesh proxy costs by 90% or more. The key decision is which namespaces need L7 features (and therefore waypoint proxies) versus which only need L4 mTLS. Start with L4 everywhere, add waypoints where you need them, and enjoy the savings.
