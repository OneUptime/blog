# How to Use Dapr with Ambient Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Ambient Mesh, Istio, Service Mesh, Networking

Description: Learn how to run Dapr alongside Istio Ambient Mesh to get application-level building blocks and kernel-level service mesh capabilities without sidecar overload.

---

Istio Ambient Mesh moves service mesh functionality out of per-pod sidecars into shared node-level proxies (ztunnel) and L7 waypoint proxies. Running Dapr alongside Ambient Mesh gives you application building blocks and mesh capabilities with minimal container overhead.

## Why Ambient Mesh Complements Dapr

Traditional service mesh sidecars (Envoy) plus Dapr sidecars means each pod runs two proxy containers. With Ambient Mesh:

```text
Pod (before ambient):
  [App Container] + [Dapr Sidecar] + [Envoy Sidecar]  = 3 containers

Pod (with ambient mesh):
  [App Container] + [Dapr Sidecar]  = 2 containers
  Mesh handled by node-level ztunnel (no per-pod Envoy)
```

This reduces resource overhead while keeping Dapr's application-layer features.

## Installing Istio Ambient Mesh

```bash
# Install Istio in ambient mode
istioctl install --set profile=ambient --skip-confirmation

# Verify ambient components
kubectl get pods -n istio-system
# Should show: istiod, ztunnel, istio-cni (no ingress-gateway sidecar injector)
```

## Installing Dapr Alongside Ambient

```bash
# Install Dapr
dapr init -k

# Verify
dapr status -k
```

## Enabling Ambient Mesh for a Namespace

Enable ambient mesh by labeling the namespace:

```bash
kubectl label namespace production istio.io/dataplane-mode=ambient
```

Dapr-enabled pods in that namespace will have their traffic routed through ztunnel for mTLS and L4 policy, while Dapr's sidecar handles application building blocks.

## Configuring Waypoint Proxies for L7 Features

For L7 traffic management (header routing, retries at the mesh layer), deploy a waypoint proxy:

```bash
# Deploy a waypoint for the production namespace
istioctl waypoint apply -n production --enroll-namespace

# Verify waypoint
kubectl get gateway -n production
```

With both Dapr resiliency and the mesh waypoint active, you get two layers of retry/circuit breaker. Configure them to complement rather than duplicate:

```yaml
# Dapr resiliency - handles app-level retries on Dapr building blocks
spec:
  policies:
    retries:
      dapr-retry:
        policy: exponential
        maxRetries: 2   # Keep low; mesh handles network-level retries

# Istio waypoint - handles transport-level retries
```

## mTLS Interaction

Both Dapr and Ambient Mesh can enforce mTLS. To avoid conflicts:

- Keep Dapr's mTLS enabled for Dapr-to-Dapr sidecar communication (building block traffic)
- Let ztunnel handle mTLS for all other pod-to-pod TCP traffic

This provides defense-in-depth without certificate management conflicts.

## Observability

Combine Dapr's distributed traces with Istio's metrics from ztunnel:

```bash
# Dapr traces (application layer)
kubectl port-forward svc/zipkin 9411 -n dapr-monitoring

# Ambient mesh metrics (network layer)
kubectl port-forward svc/prometheus 9090 -n istio-system

# Query ambient TCP metrics (in ambient mode, ztunnel reports as source/destination)
curl http://localhost:9090/api/v1/query \
  --data-urlencode 'query=istio_tcp_connections_opened_total{reporter="source"}'
```

## Summary

Dapr and Istio Ambient Mesh complement each other without sidecar sprawl. Ambient Mesh provides node-level mTLS and L4 policy via ztunnel, while Dapr's sidecar handles application building blocks like state, pub/sub, and service invocation. Label your namespace for ambient mode and deploy a waypoint proxy for L7 features to get the best of both systems.
