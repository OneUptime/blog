# How to Choose Between Sidecar Mode and Ambient Mode in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Sidecar, Architecture, Kubernetes

Description: A decision framework for choosing between Istio sidecar mode and ambient mode based on your workload requirements and operational constraints.

---

With Istio offering both sidecar and ambient deployment models, the natural question is: which one should you use? The answer depends on your specific needs, and it is not always a simple binary choice. You can even run both modes in the same cluster.

This guide gives you a practical decision framework based on real-world factors.

## Start with Your Requirements

Before comparing modes, write down what you actually need from the mesh. Here are the key questions:

1. Do you need L7 traffic management (HTTP routing, retries, timeouts) for all services or just some?
2. How many pods run in your cluster?
3. How constrained are your cluster resources?
4. Do you need to add/remove the mesh frequently without downtime?
5. What is your team's experience with Istio?

Your answers to these questions will point you in the right direction.

## Decision Factor 1: L7 Feature Requirements

If every service in your mesh needs L7 features - HTTP-aware routing, header-based authorization, request-level metrics, fault injection - then sidecar mode puts an L7 proxy right next to each workload. Everything is processed locally in the pod.

With ambient mode, L7 features require deploying waypoint proxies. Traffic flows through an extra hop: from the source pod's ztunnel to the waypoint proxy, then to the destination ztunnel and pod. For most services this extra hop adds minimal latency (sub-millisecond on the same node), but it is an additional component to manage.

**If you need L7 everywhere**: Sidecar mode is simpler since every pod already has a full L7 proxy.

**If you need L7 for some services**: Ambient mode shines here. Use ztunnel for the majority of workloads and deploy waypoint proxies only for the services that need L7.

**If you mainly need mTLS and L4 auth**: Ambient mode is the clear winner. You get security without the overhead of L7 proxies.

## Decision Factor 2: Resource Budget

Here is a rough comparison for a 10-node cluster running 300 pods:

### Sidecar Mode
- 300 Envoy sidecars
- Memory: ~300 x 70MB = ~21GB for proxies
- CPU: Scales with traffic volume per pod

### Ambient Mode (ztunnel only)
- 10 ztunnel instances
- Memory: ~10 x 40MB = ~400MB for proxies
- CPU: Concentrated on fewer instances

### Ambient Mode (ztunnel + waypoint proxies for 5 namespaces)
- 10 ztunnel instances + 5 waypoint proxies
- Memory: ~10 x 40MB + 5 x 100MB = ~900MB
- CPU: Shared across fewer, more powerful instances

The resource savings with ambient mode are dramatic. If your cluster is resource-constrained or you are running in a cost-sensitive environment, ambient mode gives you the same security benefits at a fraction of the cost.

## Decision Factor 3: Operational Complexity

### Adding/Removing the Mesh

Sidecar mode requires pod restarts. When you label a namespace for injection, existing pods are unaffected until they restart. This means planned rollouts to add or remove the mesh.

Ambient mode takes effect immediately. Label a namespace and traffic interception starts within seconds. Remove the label and it stops. No pod restarts at all.

```bash
# Ambient: instant enrollment
kubectl label namespace my-app istio.io/dataplane-mode=ambient

# Sidecar: label then restart all pods
kubectl label namespace my-app istio-injection=enabled
kubectl rollout restart deployment -n my-app
```

### Upgrading

Sidecar upgrades require rolling restarts of every meshed pod to pick up the new proxy version. In a large cluster, this can take hours and needs careful coordination.

Ambient upgrades involve updating the ztunnel DaemonSet and waypoint proxy deployments. The ztunnel DaemonSet rolls out one node at a time, and waypoint proxies are standard deployments. Much simpler operationally.

### Debugging

Sidecar mode has years of tooling and community knowledge. Commands like `istioctl proxy-config` work great. Access logs are per-pod, making it easy to trace issues.

Ambient mode debugging is newer but improving. The `istioctl ztunnel-config` commands provide visibility into ztunnel state. However, because ztunnel serves all pods on a node, logs are more mixed and can be harder to filter.

## Decision Factor 4: Security Posture

Both modes provide mutual TLS with SPIFFE identities. The security guarantee is the same: workloads authenticate using certificates issued by Istio's CA.

The trust boundary difference:
- **Sidecar**: The proxy shares a pod with the application. A compromised app container can potentially interact with the proxy process.
- **Ambient**: ztunnel runs in its own pod with its own security context. A compromised app cannot directly access ztunnel. However, ztunnel holds keys for all workloads on its node.

Neither model is strictly more secure. They have different threat models. For most organizations, this is not the deciding factor.

## Decision Factor 5: Application Compatibility

Some applications do not play well with sidecars:
- Apps that need raw network access
- Apps that use unusual protocols
- Apps with strict startup ordering requirements
- Stateful workloads that are sensitive to pod restarts

Ambient mode is generally more compatible because it does not modify the pod at all. The traffic interception happens at the node level, and ztunnel handles the tunneling transparently.

## The Decision Matrix

| Scenario | Recommended Mode |
|----------|-----------------|
| New greenfield deployment, want security fast | Ambient |
| Large cluster (500+ pods), budget-constrained | Ambient |
| Need L7 for every service, no exceptions | Sidecar |
| Need L7 for 10-20% of services | Ambient + Waypoints |
| Existing sidecar deployment, working well | Stay with Sidecar |
| Team new to Istio, want simplest operations | Ambient |
| Need to avoid pod restarts when changing mesh config | Ambient |
| Running on edge/IoT with limited resources | Ambient |
| Regulated environment requiring per-pod isolation | Sidecar |

## The Hybrid Approach

You are not locked into one mode. Istio supports both simultaneously:

```bash
# Namespace A uses ambient
kubectl label namespace app-a istio.io/dataplane-mode=ambient

# Namespace B uses sidecar
kubectl label namespace app-b istio-injection=enabled
```

This is useful during migration or when different teams have different requirements. The control plane (istiod) manages both modes and handles cross-mode communication transparently.

## My Recommendation

If you are starting a new Istio deployment today, start with ambient mode. The resource savings and operational simplicity are substantial. Deploy waypoint proxies only for namespaces that need L7 features.

If you have an existing sidecar deployment that works well, there is no urgent need to migrate. But keep ambient mode in mind for new namespaces and workloads. You can adopt it incrementally.

If you are upgrading from an older Istio version and considering changes anyway, it is a good time to evaluate ambient mode for at least some of your workloads. The migration path from sidecar to ambient is supported and can be done namespace by namespace.

The bottom line: ambient mode is where Istio is heading. The community investment is heavily focused on making ambient the default experience. Starting with ambient now puts you on the path the project is moving toward.
