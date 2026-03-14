# How to Configure Istio for Mixed x86/ARM Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ARM, X86, Kubernetes, Multi-Architecture

Description: Learn how to configure Istio service mesh in heterogeneous clusters with both x86 and ARM nodes running side by side.

---

Running a Kubernetes cluster with both x86 and ARM nodes is increasingly common. Maybe you are migrating workloads to Graviton instances gradually, or you have some legacy services that only run on x86. Either way, Istio needs to work seamlessly across both architectures in the same cluster. The good news is that it can, but there are some configuration details you need to get right.

## Understanding Mixed Architecture Clusters

In a mixed cluster, you have nodes with different CPU architectures. Kubernetes schedules pods to nodes, and the container runtime needs to pull the right image for each architecture. This works fine when your images are multi-arch, but it falls apart quickly when they are not.

Check your node architectures:

```bash
kubectl get nodes -L kubernetes.io/arch
```

You will see something like:

```text
NAME          STATUS   ROLES    AGE   VERSION   ARCH
node-x86-1   Ready    <none>   10d   v1.28.0   amd64
node-x86-2   Ready    <none>   10d   v1.28.0   amd64
node-arm-1   Ready    <none>   5d    v1.28.0   arm64
node-arm-2   Ready    <none>   5d    v1.28.0   arm64
```

## Installing Istio in a Mixed Cluster

Istio publishes multi-arch images, so the control plane components will run on either architecture. However, you probably want istiod running on specific nodes for predictability.

Create an IstioOperator configuration that uses node affinity to pin control plane components:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: mixed-arch-istio
spec:
  profile: default
  components:
    pilot:
      k8s:
        affinity:
          nodeAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                - key: kubernetes.io/arch
                  operator: In
                  values:
                  - amd64
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        affinity:
          nodeAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                - key: kubernetes.io/arch
                  operator: In
                  values:
                  - amd64
```

Notice we use `preferredDuringSchedulingIgnoredDuringExecution` instead of `required`. This way, if your x86 nodes are full, the components can still schedule on ARM nodes. For a gradual migration, this flexibility is important.

Install it:

```bash
istioctl install -f mixed-arch-istio.yaml -y
```

## Handling Sidecar Injection Across Architectures

The Envoy sidecar proxy image is multi-arch, so injection works on both x86 and ARM nodes without any extra configuration. Enable injection as usual:

```bash
kubectl label namespace default istio-injection=enabled
```

When a pod is scheduled to an ARM node, the kubelet pulls the arm64 Envoy image. When it is on an x86 node, it pulls the amd64 image. This happens transparently.

But there is a catch. If you are using custom Envoy filters or Wasm plugins, those need to be compiled for both architectures. More on that later.

## Setting Up Architecture-Aware Scheduling

For your application workloads, you need to make sure the right workloads end up on the right nodes. Use node selectors or affinity rules in your deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: legacy-api
  template:
    metadata:
      labels:
        app: legacy-api
    spec:
      nodeSelector:
        kubernetes.io/arch: amd64
      containers:
      - name: legacy-api
        image: myregistry/legacy-api:v2.1
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: modern-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: modern-service
  template:
    metadata:
      labels:
        app: modern-service
    spec:
      nodeSelector:
        kubernetes.io/arch: arm64
      containers:
      - name: modern-service
        image: myregistry/modern-service:v1.0
        ports:
        - containerPort: 8080
```

The services communicate through Istio regardless of which architecture they run on. The mesh handles the networking layer, and the architecture difference is invisible to the service-to-service communication.

## Cross-Architecture Traffic Management

One of the nice things about Istio is that traffic routing does not care about node architecture. A VirtualService routes traffic based on HTTP headers, paths, and weights. It does not matter if the source pod is on x86 and the destination is on ARM.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: x86-version
      weight: 50
    - destination:
        host: my-service
        subset: arm-version
      weight: 50
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  subsets:
  - name: x86-version
    labels:
      arch-variant: x86
  - name: arm-version
    labels:
      arch-variant: arm
```

This configuration splits traffic 50/50 between x86 and ARM versions of a service. You can use this pattern during migration to gradually shift traffic.

## Monitoring Cross-Architecture Performance

You want to compare how your services perform on each architecture. Use Istio metrics with custom labels to track this. Add a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: arch-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_DURATION
        mode: CLIENT_AND_SERVER
      tagOverrides:
        node_arch:
          operation: UPSERT
          value: "downstream_peer.labels['kubernetes.io/arch'].value"
```

Then in your Prometheus queries, you can filter by architecture:

```text
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{node_arch="arm64"}[5m])) by (le, destination_service))
```

## Handling Architecture-Specific Issues

### DNS Resolution

DNS resolution works identically on both architectures. CoreDNS runs multi-arch images and Istio relies on standard Kubernetes DNS. No special handling needed here.

### mTLS Between Architectures

mTLS between x86 and ARM pods works without any configuration changes. The TLS handshake is architecture-independent. Certificates issued by istiod work the same regardless of where the workload runs.

Verify mTLS is active:

```bash
istioctl x describe pod <x86-pod-name>
istioctl x describe pod <arm-pod-name>
```

Both should show mutual TLS enabled.

### Resource Differences

ARM and x86 CPUs have different performance profiles. You might need different resource requests for the same workload depending on architecture:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: compute-service-arm
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/arch: arm64
      containers:
      - name: compute-service
        image: myregistry/compute-service:v1.0
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: compute-service-x86
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/arch: amd64
      containers:
      - name: compute-service
        image: myregistry/compute-service:v1.0
        resources:
          requests:
            cpu: 150m
            memory: 256Mi
```

## Migration Strategy

A solid approach to migrating from x86 to ARM with Istio:

1. Add ARM nodes to your existing cluster
2. Deploy Istio with the mixed-arch configuration shown above
3. Deploy new versions of services to ARM nodes alongside the x86 versions
4. Use Istio traffic splitting to gradually route traffic to ARM pods
5. Monitor latency and error rates between the two groups
6. Once confident, remove the x86 deployments

This approach gives you a safe rollback path at every step. If the ARM deployment shows problems, just shift the traffic weights back.

## Summary

Running Istio in a mixed x86/ARM environment works well because Istio publishes multi-arch images and the mesh layer does not care about the underlying CPU architecture. The main things to watch are ensuring your own application images are multi-arch, using node affinity to control where workloads land, and monitoring performance differences between architectures. Istio traffic management features make gradual migrations between architectures safe and observable.
