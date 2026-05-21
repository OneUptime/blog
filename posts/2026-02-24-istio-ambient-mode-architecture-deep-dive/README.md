# How to Understand Istio Ambient Mode Architecture Deep Dive

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Service Mesh, Kubernetes, Cloud Native

Description: A deep dive into Istio's ambient mode architecture explaining how it eliminates sidecars and splits L4/L7 processing across ztunnel and waypoint proxies.

---

Istio's ambient mode represents a fundamental shift in how service mesh data planes work. Instead of injecting a sidecar proxy into every pod, ambient mode uses a shared infrastructure approach that separates L4 and L7 concerns into different components. If you have been running Istio with sidecars and wondering whether ambient mode is worth the switch, this post breaks down the architecture so you can make that call.

## The Problem with Sidecars

The traditional Istio sidecar model works well but comes with overhead. Every pod gets an Envoy proxy container, which means:

- Memory usage scales linearly with pod count
- CPU overhead on every single pod
- Sidecar injection can break certain workloads
- Upgrades require restarting every pod to pick up new proxy versions

Ambient mode solves these problems by moving proxy functionality out of individual pods and into shared node-level and namespace-level components.

## The Two-Layer Architecture

Ambient mode splits the data plane into two distinct layers:

**Layer 1 - ztunnel (Zero Trust Tunnel):** A per-node proxy that handles L4 concerns like mTLS, TCP routing, and basic authorization policies. It runs as a DaemonSet on every node.

**Layer 2 - Waypoint Proxy:** An optional per-namespace or per-service proxy that handles L7 concerns like HTTP routing, header-based policies, and traffic management. It only gets deployed when you actually need L7 features.

This split is the key architectural insight. Most workloads only need mTLS and basic network policies (L4). Only a subset needs full HTTP-level traffic management (L7). Ambient mode lets you pay for L7 processing only where you need it.

## How Traffic Flows in Ambient Mode

When a pod in an ambient-enabled namespace sends traffic, here is what happens:

1. The ztunnel on the source node intercepts outbound traffic using Istio CNI-managed network redirection
2. ztunnel establishes an mTLS connection (using HBONE protocol) to the ztunnel on the destination node
3. If no waypoint proxy is configured, ztunnel delivers the traffic directly to the destination pod
4. If a waypoint proxy is configured, ztunnel routes traffic through the waypoint first for L7 processing

You can visualize this by looking at the components on a node:

```bash
# Check ztunnel pods running as a DaemonSet

kubectl get pods -n istio-system -l app=ztunnel -o wide

# Check waypoint proxies in a namespace
kubectl get pods -n my-namespace -l gateway.istio.io/managed=istio.io-mesh-controller
```

## HBONE Protocol

Ambient mode introduces HBONE (HTTP-Based Overlay Network Environment) as its transport protocol. HBONE tunnels TCP connections using HTTP/2, HTTP CONNECT, and mTLS, which provides a few benefits:

- It works through standard load balancers and firewalls
- It carries mTLS natively
- It supports metadata propagation between ztunnel nodes

The HBONE tunnel is commonly shown like this at the logical data-path level:

```text
[Source Pod] -> [Source ztunnel] --HBONE/mTLS--> [Dest ztunnel] -> [Dest Pod]
```

When a waypoint is involved:

```text
[Source Pod] -> [Source ztunnel] --HBONE--> [Waypoint] --HBONE--> [Dest ztunnel] -> [Dest Pod]
```

## Enabling Ambient Mode

To install Istio with ambient mode:

```bash
# Install Istio with the ambient profile
istioctl install --set profile=ambient --skip-confirmation

# Or using Helm
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
helm install istio-base istio/base -n istio-system --create-namespace --wait
kubectl get crd gateways.gateway.networking.k8s.io &> /dev/null || \
  kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/experimental-install.yaml
helm install istiod istio/istiod -n istio-system --set profile=ambient --wait
helm install istio-cni istio/cni -n istio-system --set profile=ambient --wait
helm install ztunnel istio/ztunnel -n istio-system --wait
```

Once installed, you enroll namespaces into the ambient mesh by labeling them:

```bash
# Add a namespace to the ambient mesh
kubectl label namespace my-namespace istio.io/dataplane-mode=ambient
```

This is different from the sidecar approach where you label with `istio-injection=enabled`. The ambient label tells Istio to use ztunnel for this namespace instead of injecting sidecars.

## The Role of Istio CNI

Ambient mode relies on the Istio CNI plugin for traffic interception. The CNI plugin sets up the networking rules that redirect pod traffic through ztunnel. This happens at the network level, so there is no need to modify pod specs or inject containers.

```bash
# Verify the CNI plugin is running
kubectl get pods -n istio-system -l k8s-app=istio-cni-node
```

The CNI plugin configures network redirection for ambient-enrolled pods so their traffic is routed through the local ztunnel instance. In current Istio releases, you can inspect the resulting netfilter/iptables rules inside the application pod's network namespace when troubleshooting traffic capture.

## Control Plane Changes

The Istio control plane (istiod) in ambient mode still handles certificate issuance, configuration distribution, and service discovery. However, it now communicates with two types of data plane components:

- **ztunnel** receives L4-level configuration: which services exist, their endpoints, mTLS certificates, and L4 authorization policies
- **Waypoint proxies** receive full Envoy configuration: HTTP routes, virtual services, destination rules, and L7 authorization policies

This means istiod generates different xDS configurations for different proxy types. Ztunnel uses a simplified set of xDS resources since it does not need the full Envoy API surface.

Resource Comparison

Here is a rough comparison of resource usage between sidecar and ambient modes for a namespace with 100 pods:

**Sidecar mode:**
- 100 Envoy sidecars, each using ~50-100MB RAM
- Total: 5-10GB RAM for proxy infrastructure
- CPU overhead on every pod

**Ambient mode:**
- 3-5 ztunnel instances (one per node, assuming 20-30 pods per node)
- Each ztunnel uses ~50-100MB RAM
- 1 waypoint proxy (if L7 is needed) using ~50-100MB RAM
- Total: 200-600MB RAM for proxy infrastructure

The savings are significant, especially in clusters with many small pods.

## Security Model

Ambient mode strengthens the security model in some ways. In sidecar mode, the Envoy proxy shares a pod with the application, meaning a compromised application pod can expose that pod's mesh credentials. In ambient mode, ztunnel runs separately from application workloads and obtains workload certificates only for pods scheduled on its node.

The trust model works like this:

```yaml
# L4 authorization policy (enforced by ztunnel)
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: backend
spec:
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/frontend-sa"]
```

L4 policies that only look at source identity, destination port, and namespace work directly with ztunnel. Policies that need to inspect HTTP headers or paths require a waypoint proxy.

## When to Use Ambient vs Sidecars

Ambient mode works best when:

- You want lower resource overhead
- You have workloads that are incompatible with sidecar injection
- You only need mTLS and L4 policies for most services
- You want simpler upgrades (update ztunnel DaemonSet, not every pod)

Sidecars might still be preferred when:

- You need per-pod L7 processing everywhere
- You want each workload to have its own dedicated proxy and keys
- You are running workloads that need custom Envoy configuration per pod

## Checking the Architecture in a Running Cluster

Once you have ambient mode running, you can inspect the components:

```bash
# See all ambient-related components
kubectl get pods -n istio-system

# Check which namespaces are enrolled
kubectl get namespaces -l istio.io/dataplane-mode=ambient

# Inspect ztunnel logs
kubectl logs -n istio-system -l app=ztunnel --tail=50

# Check ztunnel configuration
istioctl proxy-config all -n istio-system $(kubectl get pod -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}')
```

## Summary

Istio ambient mode is a significant architectural evolution. By splitting the data plane into a lightweight per-node L4 proxy (ztunnel) and an optional L7 proxy (waypoint), it reduces resource consumption, simplifies operations, and strengthens the security model. The HBONE protocol provides a clean transport layer that works across nodes and through network boundaries. If you are planning a new Istio deployment or looking to reduce the overhead of your existing mesh, ambient mode is worth serious consideration.
