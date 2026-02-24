# How to Compare Istio Sidecar Mode vs Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Sidecar, Kubernetes, Service Mesh

Description: A thorough comparison of Istio sidecar mode and ambient mode covering architecture, resource usage, security, and when to use each approach in your Kubernetes cluster.

---

Istio's ambient mode is the biggest architectural change to the project since its launch. Instead of injecting an Envoy sidecar into every pod, ambient mode moves the proxy infrastructure out of the pod and into shared, per-node components. This changes the resource profile, security model, and operational experience significantly.

If you are running Istio today with sidecars or evaluating Istio for the first time, understanding the difference between these two modes helps you make a better deployment decision.

## How Sidecar Mode Works

In traditional sidecar mode, every pod in the mesh gets an Envoy proxy container injected alongside the application container. All inbound and outbound traffic is intercepted by iptables rules and routed through this sidecar proxy.

The sidecar handles mTLS, traffic routing, telemetry collection, and policy enforcement for that specific pod. Each sidecar maintains its own xDS configuration from the control plane.

```yaml
# Pod with sidecar injection
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: my-app
  annotations:
    sidecar.istio.io/inject: "true"
spec:
  containers:
    - name: my-app
      image: my-app:latest
      ports:
        - containerPort: 8080
    # Envoy sidecar is automatically injected
```

## How Ambient Mode Works

Ambient mode introduces a two-layer architecture:

**Layer 1 - ztunnel**: A per-node proxy (zero-trust tunnel) that runs as a DaemonSet. It handles L4 networking: TCP proxying, mTLS encryption, and basic authorization. Every pod on the node shares this ztunnel instance rather than having its own sidecar.

**Layer 2 - Waypoint proxies**: Optional, per-namespace or per-service Envoy instances that handle L7 features like HTTP routing, retries, and advanced authorization. You only deploy waypoint proxies for namespaces or services that need L7 functionality.

```bash
# Enable ambient mode for a namespace
kubectl label namespace default istio.io/dataplane-mode=ambient

# Deploy a waypoint proxy for L7 features
istioctl waypoint apply --namespace default
```

The key insight is that many services only need L4 features (mTLS, basic connectivity), and only some need L7 features (HTTP routing, header-based policies). Ambient mode lets you pay the L7 cost only where you need it.

## Resource Usage

This is the most impactful difference for most teams.

In sidecar mode, every pod gets its own Envoy instance. A typical Envoy sidecar consumes 50-100 MB of memory and noticeable CPU. In a cluster with 1000 pods, that is 50-100 GB of memory just for sidecars.

In ambient mode, the ztunnel is much lighter than a full Envoy proxy. A single ztunnel instance serves all pods on a node and uses significantly less memory per pod. Waypoint proxies add Envoy overhead, but only for namespaces that need L7 features.

For a practical example:
- 10 nodes, 100 pods per node (1000 pods total)
- Sidecar mode: 1000 Envoy instances, roughly 50-100 GB total
- Ambient mode: 10 ztunnel instances + a few waypoint proxies, roughly 5-10 GB total

That is a massive difference in resource usage, especially on large clusters.

## Security Model Differences

The security models are different in important ways.

**Sidecar mode**: The Envoy proxy runs in the same pod as the application. It shares the network namespace and can see all traffic. The upside is that the proxy is tightly coupled to the application, so there is no network hop between them. The downside is that a compromised application container could potentially interfere with the sidecar.

**Ambient mode**: The ztunnel runs as a separate pod on the node with its own security context. It does not share a pod with the application. This provides stronger isolation between the application and the proxy infrastructure. However, traffic from the application to the ztunnel traverses the node's network stack, which introduces a different trust boundary.

```yaml
# In ambient mode, ztunnel handles mTLS at L4
# Authorization at L4 uses source identity only
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: default
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: backend
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/frontend
```

For L7 authorization (based on HTTP methods, paths, headers), you need a waypoint proxy:

```bash
# Create a waypoint proxy to enable L7 policies
istioctl waypoint apply --namespace default --name backend-waypoint

# Label the service to use the waypoint
kubectl label service backend istio.io/use-waypoint=backend-waypoint
```

## Upgrade and Rollout Differences

**Sidecar mode**: Upgrading the proxy requires restarting every pod in the mesh. Even with revision-based canary upgrades, you eventually need to do a rolling restart of all workloads to pick up the new sidecar version.

```bash
# Sidecar upgrade requires pod restart
kubectl rollout restart deployment -n default
```

**Ambient mode**: Upgrading ztunnel is a DaemonSet update, which rolls through nodes without requiring application pod restarts. Waypoint proxy upgrades are also independent of application pods. This makes upgrades significantly less disruptive.

## Feature Parity

As of Istio's recent releases, ambient mode supports most of the features that sidecar mode offers, but there are some gaps:

**Supported in both modes:**
- mTLS encryption
- L4 and L7 authorization policies
- Traffic routing (VirtualService)
- Telemetry and metrics
- Multi-cluster support

**Better in sidecar mode:**
- EnvoyFilter customization (more direct control over the proxy)
- Per-pod proxy configuration via annotations
- Wasm plugin deployment (attaches to the sidecar directly)

**Better in ambient mode:**
- Resource efficiency
- Upgrade process (no pod restarts)
- Incremental adoption (start with L4, add L7 where needed)
- Sidecar-less operation (simpler pod lifecycle)

## Application Compatibility

Sidecar mode changes the pod spec by adding a container. This can cause issues with:
- Init containers that need network access (the sidecar might not be ready)
- Applications that bind to specific ports
- Job and CronJob workloads (the sidecar keeps the pod running after the job completes)

Ambient mode does not modify the pod spec at all. There are no sidecar lifecycle issues, no port conflicts, and no problems with Jobs. The application pod runs exactly as it would without the mesh.

```yaml
# Jobs work cleanly in ambient mode
# No sidecar to worry about keeping alive
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
  namespace: default  # namespace with ambient enabled
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: migration-tool:latest
      restartPolicy: Never
```

## Debugging Differences

Debugging traffic in sidecar mode is well-established. You exec into the sidecar and use istioctl or Envoy's admin interface:

```bash
# Sidecar mode debugging
istioctl proxy-config routes deploy/my-app
kubectl exec deploy/my-app -c istio-proxy -- pilot-agent request GET stats
```

Debugging ambient mode requires understanding which component handles your traffic. For L4 issues, check ztunnel. For L7 issues, check the waypoint proxy:

```bash
# Check ztunnel logs
kubectl logs -l app=ztunnel -n istio-system

# Check waypoint proxy
istioctl proxy-config routes deploy/backend-waypoint
```

## When to Use Sidecar Mode

Stick with sidecar mode when:
- You need EnvoyFilter customization at the per-pod level
- You are running Wasm plugins that need tight integration with the proxy
- Your team is already comfortable operating sidecar-based Istio
- You need features that are not yet available in ambient mode

## When to Use Ambient Mode

Use ambient mode when:
- Resource efficiency is a priority
- You want simpler upgrades without pod restarts
- You have Job or CronJob workloads in the mesh
- You want incremental adoption (L4 everywhere, L7 only where needed)
- You are starting fresh with Istio and want the simpler operational model

## Summary

Sidecar mode is the battle-tested approach with full feature support and mature tooling. Ambient mode is the newer architecture that trades some per-pod customization for better resource efficiency, simpler upgrades, and cleaner application compatibility. For new deployments, ambient mode is worth serious consideration. For existing sidecar deployments, the migration to ambient is possible but should be evaluated against your specific feature requirements.
