# How to Configure Flux CD for Resource-Constrained Edge Devices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Edge Computing, GitOps, Resource Optimization, ARM

Description: Tune Flux CD controllers for minimal resource usage on edge devices, enabling GitOps on hardware with as little as 512MB RAM and 1 CPU core.

---

## Introduction

Running Kubernetes on resource-constrained edge devices is a careful balancing act. The application workloads must have enough CPU and memory to function, and Kubernetes system components - including Flux - must not crowd them out. On a device with 1GB RAM total, Kubernetes itself consumes 200-400MB, leaving 600-800MB for everything else including Flux and your applications.

With careful configuration, Flux CD can run with a total footprint of under 100MB RAM across all its controllers. The key is disabling controllers you do not need, setting tight resource limits, and configuring reconciliation parameters that reduce the frequency and cost of Flux operations.

This guide provides specific, tested resource configuration for Flux on devices with 512MB-2GB RAM, with benchmarks to help you choose the right settings.

## Prerequisites

- Edge Kubernetes cluster with limited resources (K3s or MicroK8s recommended)
- At minimum: 512MB total device RAM, 1 CPU core
- `kubectl` and `flux` CLI access
- `kubectl top` or Prometheus metrics for resource monitoring

## Step 1: Measure Current Flux Resource Consumption

Before optimizing, establish a baseline.

```bash
# Check current Flux controller resource usage
kubectl top pods -n flux-system

# Example output (default installation):
# NAME                                 CPU(cores)   MEMORY(bytes)
# helm-controller-xxx                  12m          62Mi
# image-automation-controller-xxx      8m           48Mi
# image-reflector-controller-xxx       10m          55Mi
# kustomize-controller-xxx             15m          72Mi
# notification-controller-xxx          5m           38Mi
# source-controller-xxx                18m          85Mi
# Total:                               68m          360Mi

# Check resource requests vs actual
kubectl get pods -n flux-system -o json | \
  jq '.items[] | {name: .metadata.name, requests: .spec.containers[].resources.requests}'
```

## Step 2: Disable Unused Controllers

The most impactful optimization is not running controllers you do not need.

```bash
# Determine which controllers you actually use:
# source-controller: ALWAYS needed (manages GitRepository/OCIRepository)
# kustomize-controller: ALWAYS needed (applies Kustomizations)
# helm-controller: Only if using HelmReleases
# notification-controller: Only if using Alerts/Providers
# image-reflector-controller: Only if using ImageRepository (image automation)
# image-automation-controller: Only if using ImageUpdateAutomation

# Bootstrap with only required controllers
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path=clusters/edge-site-001 \
  --components=source-controller,kustomize-controller \
  --token-env=GITHUB_TOKEN

# Or disable controllers on an existing installation
kubectl scale deployment helm-controller \
  image-automation-controller \
  image-reflector-controller \
  notification-controller \
  -n flux-system --replicas=0
```

Savings from disabling: ~200MB RAM freed.

## Step 3: Set Tight Resource Limits

Apply resource patches via Kustomize to constrain Flux controllers.

```yaml
# clusters/edge-site-001/flux-system/patches/resource-limits.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --storage-path=/data
            - --storage-adv-addr=source-controller.$(RUNTIME_NAMESPACE).svc.cluster.local.
            # Limit concurrent operations
            - --concurrent=2
            - --kube-api-burst=10
            - --kube-api-qps=5
          resources:
            requests:
              cpu: 10m
              memory: 48Mi
            limits:
              cpu: 100m
              memory: 128Mi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --concurrent=2
            - --kube-api-burst=10
            - --kube-api-qps=5
          resources:
            requests:
              cpu: 10m
              memory: 48Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

```yaml
# clusters/edge-site-001/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: patches/resource-limits.yaml
    target:
      kind: Deployment
      name: "(source|kustomize)-controller"
```

## Step 4: Tune Reconciliation Parameters for Low CPU

High-frequency reconciliation consumes significant CPU on edge devices. Tune intervals to match actual change frequency.

```yaml
# For edge devices that change rarely (factory equipment, sensors)
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1h      # Check Git once per hour
  timeout: 90s
  ref:
    branch: main
  url: https://github.com/my-org/my-fleet
  secretRef:
    name: flux-system
```

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 2h            # Reconcile every 2 hours
  retryInterval: 30m
  timeout: 10m
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/overlays/edge
```

## Step 5: Use OCI Artifacts to Reduce Memory Pressure

Git cloning requires significant memory for unpacking. OCI artifact pulls are more memory-efficient.

```bash
# Measure memory during a Git clone reconciliation
# Watch memory in real time during reconciliation
watch -n1 "kubectl top pods -n flux-system"

# Trigger reconciliation and observe peak memory
flux reconcile source git flux-system

# OCI pull uses significantly less peak memory
flux reconcile source oci fleet-edge-apps
```

Switch to OCIRepository for the lowest memory profile:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: fleet-edge-apps
  namespace: flux-system
spec:
  interval: 1h
  url: oci://my-registry.example.com/fleet/edge-apps
  ref:
    tag: latest
  secretRef:
    name: registry-credentials
```

## Step 6: Monitor Resource Usage with Alerts

```yaml
# Alert if Flux controllers are memory-pressured
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-resource-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux.resources
      rules:
        - alert: FluxControllerHighMemory
          expr: |
            container_memory_usage_bytes{
              namespace="flux-system",
              container="manager"
            } > 120 * 1024 * 1024
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.pod }} memory near limit"

        - alert: NodeMemoryPressure
          expr: |
            (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Edge node has less than 10% free memory"
```

## Best Practices

- Disable all unused Flux controllers - each one consumes 40-80MB RAM at rest.
- Set memory limits conservatively and monitor for OOMKilled events, then adjust.
- Use the `--concurrent` flag to limit how many reconciliations run simultaneously.
- Switch from GitRepository to OCIRepository to reduce peak memory usage during reconciliation.
- Schedule resource-intensive operations (large Kustomizations) at low-traffic times.
- Profile CPU and memory consumption quarterly as the number of managed resources grows.

## Conclusion

Running Flux CD on resource-constrained edge devices is achievable with thoughtful configuration. By disabling unused controllers, applying tight resource limits, switching to OCI artifact sources, and tuning reconciliation intervals, the total Flux footprint can be reduced from ~360MB to under 100MB RAM. This leaves sufficient headroom for your application workloads on devices with as little as 1GB total RAM.
