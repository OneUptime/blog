# How to Understand the Difference Between Sidecar and Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Sidecar, Service Mesh, Kubernetes

Description: A detailed comparison of Istio sidecar mode and ambient mode covering architecture, resource usage, features, and trade-offs.

---

Istio now has two fundamentally different deployment models: the original sidecar mode and the newer ambient mode. They solve the same core problems - mTLS, authorization, observability, traffic management - but they do it in very different ways. Understanding these differences helps you make an informed choice for your environment.

## Architecture: Where the Proxy Lives

### Sidecar Mode

In sidecar mode, every pod that is part of the mesh gets an Envoy proxy container injected alongside the application container. When the pod receives traffic, it first hits the sidecar proxy, which handles mTLS termination, applies policies, collects metrics, and then forwards the request to the application container. Outbound traffic follows the same path in reverse.

The injection happens automatically through a Kubernetes mutating webhook. When you label a namespace with `istio-injection=enabled`, the Istio webhook modifies new pods to include the sidecar.

```yaml
# Sidecar mode: namespace label
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    istio-injection: enabled
```

A pod in sidecar mode has at least two containers:

```text
Pod
├── app container (your application)
├── istio-proxy container (Envoy sidecar)
└── istio-init container (iptables setup, runs at startup)
```

### Ambient Mode

In ambient mode, there are no sidecar containers. Instead, mesh functionality is provided by two shared infrastructure components:

**ztunnel** runs as a DaemonSet - one instance per node. It handles L4 concerns: mTLS encryption/decryption, TCP-level authorization, and basic telemetry. All pods on a node share the same ztunnel instance.

**Waypoint proxies** are optional per-namespace or per-service-account Envoy proxies that handle L7 concerns: HTTP routing, retries, fault injection, header-based authorization, and L7 telemetry. You only deploy them where you need L7 features.

```yaml
# Ambient mode: namespace label
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    istio.io/dataplane-mode: ambient
```

A pod in ambient mode has only its application container:

```text
Pod
└── app container (your application, that's it)

Node
└── ztunnel (shared by all ambient pods on this node)

Namespace (optional)
└── waypoint proxy (shared by all pods in the namespace)
```

## Resource Usage

This is where the difference is most dramatic.

### Sidecar Mode Resource Consumption

Each sidecar proxy typically uses:
- 50-100MB memory at baseline
- More memory as the mesh grows (each sidecar stores cluster-wide service info)
- CPU overhead for TLS operations on each request

For a cluster with 200 pods, that is 200 sidecar proxies consuming roughly 10-20GB of memory collectively.

### Ambient Mode Resource Consumption

With ambient mode on a 5-node cluster running 200 pods:
- 5 ztunnel instances (one per node), each using about 20-50MB
- Maybe 2-3 waypoint proxies for namespaces that need L7 features
- Total proxy memory: roughly 250-500MB instead of 10-20GB

The savings are significant, especially in clusters with many small pods.

## Feature Comparison

| Feature | Sidecar Mode | Ambient (ztunnel only) | Ambient (with Waypoint) |
|---------|-------------|----------------------|------------------------|
| mTLS | Yes | Yes | Yes |
| L4 AuthorizationPolicy | Yes | Yes | Yes |
| L7 AuthorizationPolicy | Yes | No | Yes |
| HTTP routing | Yes | No | Yes |
| Retries/Timeouts | Yes | No | Yes |
| Fault injection | Yes | No | Yes |
| Request-level metrics | Yes | No | Yes |
| TCP-level metrics | Yes | Yes | Yes |
| Traffic mirroring | Yes | No | Yes |

The key insight: ztunnel gives you security (mTLS + L4 auth) with minimal overhead. Waypoint proxies add L7 features where you actually need them.

## Traffic Interception

### Sidecar Mode

In sidecar mode, traffic is intercepted using iptables rules configured by the `istio-init` init container (or the istio-cni plugin). These rules redirect all inbound and outbound traffic through the Envoy sidecar within the same pod.

### Ambient Mode

In ambient mode, the istio-cni plugin configures traffic redirection at the node level. Traffic from ambient-labeled pods gets redirected to the ztunnel running on the same node. The ztunnel then establishes an HBONE (HTTP-Based Overlay Network Environment) tunnel to the destination node's ztunnel.

If a waypoint proxy is in the path, ztunnel forwards traffic through it before delivering to the destination.

## Lifecycle and Operations

### Sidecar Mode Challenges

Adding or removing the mesh from a workload requires a pod restart. The sidecar needs to be injected or removed, which means the pod template changes.

Version upgrades can be tricky because different pods might run different proxy versions during a rollout. You need to restart all pods to pick up the new version.

Sidecar resource limits need tuning per workload. A high-traffic service might need more proxy resources than a low-traffic one.

### Ambient Mode Advantages

Adding a namespace to the mesh takes effect immediately - no pod restarts. You just add a label to the namespace and ztunnel starts handling traffic for those pods.

```bash
# Add to mesh - instant, no restarts
kubectl label namespace my-app istio.io/dataplane-mode=ambient

# Remove from mesh - instant, no restarts
kubectl label namespace my-app istio.io/dataplane-mode-
```

Upgrading ztunnel is a DaemonSet rollout, which is simpler than coordinating sidecar updates across hundreds of pods.

Resource management is centralized. You tune ztunnel resources once per node rather than per pod.

## Debugging and Troubleshooting

### Sidecar Mode

Debugging in sidecar mode is familiar territory. You can inspect the sidecar's configuration, check its access logs, and look at its admin interface:

```bash
istioctl proxy-config routes deploy/my-app -n my-namespace
kubectl logs deploy/my-app -c istio-proxy
istioctl proxy-status
```

### Ambient Mode

Debugging ambient mode uses different commands:

```bash
# Check ztunnel workload status
istioctl ztunnel-config workloads

# Check ztunnel logs
kubectl logs -l app=ztunnel -n istio-system

# Check waypoint proxy config
istioctl proxy-config routes deploy/waypoint -n my-namespace

# Verify ambient enrollment
istioctl ztunnel-config workloads | grep my-pod
```

## Security Model

Both modes provide mTLS with SPIFFE identities. The difference is in the trust boundary.

In sidecar mode, the proxy runs in the same pod as the application. If the application container is compromised, the attacker is in the same network namespace as the proxy.

In ambient mode, ztunnel runs as a separate pod on the node. A compromised application container does not have direct access to the proxy process or its certificates. However, ztunnel has access to certificates for all workloads on its node, which is a different trust trade-off.

## When Each Mode Makes Sense

**Sidecar mode is better when:**
- You need per-pod L7 processing for every service
- You want the proxy and app lifecycle tightly coupled
- You have existing automation built around sidecar injection
- You need the most mature and battle-tested deployment model

**Ambient mode is better when:**
- Resource efficiency matters (lots of pods, constrained clusters)
- Most services only need mTLS and L4 policies
- You want to add/remove the mesh without pod restarts
- You are starting fresh and want simpler operations

The good news is that you do not have to choose one for your entire cluster. Istio supports running both modes simultaneously. Some namespaces can use sidecars while others use ambient mode. This makes gradual migration possible.
