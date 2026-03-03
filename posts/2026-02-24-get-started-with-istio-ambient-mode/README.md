# How to Get Started with Istio Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Service Mesh, Kubernetes, ztunnel

Description: A beginner-friendly introduction to Istio ambient mode covering what it is, why it exists, and how to get your first ambient mesh running.

---

Istio ambient mode is a fundamentally different way to run a service mesh. Instead of injecting sidecar proxies into every pod, ambient mode moves the mesh functionality to shared infrastructure components on each node. The result is a mesh that uses less memory, less CPU, and does not require pod restarts when you add or remove workloads.

If you have been avoiding Istio because of the sidecar overhead, ambient mode might change your mind.

## What Problem Does Ambient Mode Solve?

Traditional Istio uses sidecar proxies - an Envoy container injected into every application pod. This works but comes with costs:

- Each sidecar uses 50-100MB of memory (or more depending on config)
- Adding or removing the mesh requires pod restarts
- Application and sidecar lifecycle are tied together
- Resource overhead scales linearly with pod count

For a cluster with 500 pods, that is 500 sidecar proxies consuming memory and CPU. Ambient mode reduces this to a handful of shared components.

## How Ambient Mode Works

Ambient mode splits mesh functionality into two layers:

**Layer 4 (L4) - ztunnel**: A per-node proxy that handles mTLS encryption, identity, and basic authorization. Every node runs one ztunnel instance as a DaemonSet. It intercepts traffic from pods enrolled in the ambient mesh and wraps it in mTLS tunnels. This gives you zero-trust security without any sidecar.

**Layer 7 (L7) - Waypoint Proxy**: An optional per-namespace (or per-service-account) Envoy proxy that handles advanced traffic management like HTTP routing, retries, header manipulation, and L7 authorization policies. You only deploy waypoint proxies when you need L7 features.

This split means most workloads only need the lightweight ztunnel for basic security, and you add waypoint proxies only where you need the full feature set.

## Prerequisites

Before getting started, make sure you have:

- A Kubernetes cluster (version 1.27 or later)
- kubectl configured to access the cluster
- istioctl installed (version 1.22 or later for ambient support)

You can install istioctl with:

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.24.0 sh -
export PATH=$PWD/istio-1.24.0/bin:$PATH
```

## Installing Istio in Ambient Mode

Install Istio with the ambient profile:

```bash
istioctl install --set profile=ambient -y
```

This installs:
- istiod (the control plane)
- ztunnel (DaemonSet on every node)
- istio-cni (handles traffic interception without init containers)

Verify the installation:

```bash
kubectl get pods -n istio-system
```

You should see something like:

```text
NAME                      READY   STATUS    RESTARTS   AGE
istiod-5d4c75f8d-xxxxx   1/1     Running   0          1m
ztunnel-xxxxx             1/1     Running   0          1m
ztunnel-yyyyy             1/1     Running   0          1m
istio-cni-node-xxxxx      1/1     Running   0          1m
istio-cni-node-yyyyy      1/1     Running   0          1m
```

There should be one ztunnel and one istio-cni pod per node.

## Enrolling Your First Workload

Deploy a sample application:

```bash
kubectl create namespace bookinfo
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml -n bookinfo
```

To add workloads to the ambient mesh, label the namespace:

```bash
kubectl label namespace bookinfo istio.io/dataplane-mode=ambient
```

That is it. No pod restarts. No sidecar injection. The workloads are immediately part of the mesh.

Verify the enrollment:

```bash
kubectl get namespace bookinfo --show-labels
```

You should see the `istio.io/dataplane-mode=ambient` label.

## Verifying mTLS

Once a namespace is enrolled, all traffic between pods in that namespace is automatically encrypted with mTLS. Verify this by checking ztunnel logs:

```bash
kubectl logs -l app=ztunnel -n istio-system --tail=20
```

You should see log entries about connection establishment between workload identities. You can also use istioctl to check:

```bash
istioctl ztunnel-config workloads
```

This shows all workloads that ztunnel is aware of, along with their identity and protocol information.

## Adding a Waypoint Proxy

If you need L7 features like HTTP routing or header-based authorization, deploy a waypoint proxy for the namespace:

```bash
istioctl waypoint apply -n bookinfo --enroll-namespace
```

This creates a waypoint proxy deployment in the bookinfo namespace. Verify it:

```bash
kubectl get pods -n bookinfo -l gateway.networking.k8s.io/gateway-name
```

Now you can apply L7 policies. For example, an AuthorizationPolicy that checks HTTP methods:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: productpage-viewer
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: productpage
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/bookinfo/sa/bookinfo-gateway-istio"
      to:
        - operation:
            methods: ["GET"]
```

## Quick Comparison: Before and After

Without ambient mode (sidecar), a 3-pod deployment looks like this:
- Pod 1: app container + sidecar proxy (2 containers)
- Pod 2: app container + sidecar proxy (2 containers)
- Pod 3: app container + sidecar proxy (2 containers)
- Total proxy instances: 3

With ambient mode, the same deployment:
- Pod 1: app container (1 container)
- Pod 2: app container (1 container)
- Pod 3: app container (1 container)
- Node-level ztunnel: 1 (shared across all pods on the node)
- Total proxy instances: 1 per node (not per pod)

The memory savings add up fast, especially in clusters with hundreds of pods.

## Next Steps

Once you have ambient mode running, there are several things to explore:

- Configure L4 authorization policies that work with just ztunnel (no waypoint needed)
- Set up waypoint proxies for services that need L7 features
- Monitor ztunnel metrics through Prometheus
- Test the migration path from sidecar mode to ambient mode

Ambient mode is still evolving, but it reached general availability status in Istio 1.24. The core L4 features are stable and ready for production use. L7 features through waypoint proxies are also GA and work well for most use cases.

The biggest mindset shift with ambient mode is that the mesh is no longer something you inject into your application pods. It is infrastructure that runs alongside them. Your pods stay lean, your deployments stay simple, and you still get mTLS, identity, and authorization from the mesh.
