# How to Fix Flux CD Controllers High CPU Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, CPU, Performance, Kubernetes, Troubleshooting, GitOps, Reconciliation, Sharding

Description: A practical guide to diagnosing and reducing high CPU usage in Flux CD controllers by tuning reconciliation frequency, adjusting concurrency, and implementing controller sharding.

---

## Introduction

Flux CD controllers can consume significant CPU resources, especially in large clusters with many managed resources. High CPU usage leads to throttled reconciliation, delayed deployments, and can impact other workloads on the same node. This guide covers how to identify the source of high CPU usage and apply targeted optimizations.

## Understanding the Problem

Flux CD runs several controllers, each responsible for different tasks:

- **source-controller**: Fetches artifacts from Git, Helm, and OCI repositories
- **kustomize-controller**: Builds and applies kustomize overlays
- **helm-controller**: Renders and applies Helm charts
- **notification-controller**: Handles alerts and webhooks
- **image-reflector-controller**: Scans container registries
- **image-automation-controller**: Commits image updates

Each controller reconciles its resources on a periodic interval. High CPU usage occurs when controllers are reconciling too frequently, processing too many resources, or handling large artifacts.

## Diagnosing High CPU Usage

```bash
# Check CPU usage of Flux controllers
kubectl top pods -n flux-system

# Check CPU limits and requests
kubectl get deployment -n flux-system -o custom-columns=\
"NAME:.metadata.name,CPU_REQ:.spec.template.spec.containers[0].resources.requests.cpu,CPU_LIM:.spec.template.spec.containers[0].resources.limits.cpu"

# Check for CPU throttling events
kubectl describe pod -n flux-system <pod-name> | grep -A 5 "State:"

# Check controller logs for reconciliation activity
kubectl logs -n flux-system deploy/source-controller --tail=100 | \
  grep "Reconciliation finished"
```

## Common Cause 1: Reconciliation Interval Too Short

The default reconciliation interval of `1m` or `5m` may be too aggressive for large setups. Every reconciliation cycle triggers artifact fetching, diffing, and applying.

### Diagnosing the Issue

```bash
# Check reconciliation intervals across all resources
kubectl get gitrepository -A -o custom-columns=\
"NAMESPACE:.metadata.namespace,NAME:.metadata.name,INTERVAL:.spec.interval"

kubectl get kustomization -A -o custom-columns=\
"NAMESPACE:.metadata.namespace,NAME:.metadata.name,INTERVAL:.spec.interval"

kubectl get helmrelease -A -o custom-columns=\
"NAMESPACE:.metadata.namespace,NAME:.metadata.name,INTERVAL:.spec.interval"
```

### Fix: Increase Reconciliation Intervals

```yaml
---
# Increase GitRepository interval for stable repos
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  # Increase from 1m to 10m for repos that change infrequently
  interval: 10m
  url: https://github.com/myorg/fleet-infra.git
  ref:
    branch: main
---
# Increase Kustomization interval
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  # Use longer intervals for stable infrastructure
  interval: 30m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
# HelmRelease can use longer intervals too
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: monitoring
  namespace: monitoring
spec:
  # Charts that rarely change can reconcile less frequently
  interval: 1h
  chart:
    spec:
      chart: kube-prometheus-stack
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
      version: "55.x"
```

### Recommended Intervals by Use Case

```yaml
# Development environments: faster feedback
interval: 1m   # For active development

# Production applications: moderate frequency
interval: 10m  # Good balance of speed and resource usage

# Stable infrastructure: infrequent changes
interval: 30m  # For infrastructure that rarely changes

# Helm charts with fixed versions: minimal reconciliation
interval: 1h   # For pinned chart versions
```

## Common Cause 2: Too Many Concurrent Reconciliations

Each controller has a concurrency setting that determines how many resources it reconciles simultaneously. High concurrency means more parallel work and higher CPU usage.

### Fix: Tune Controller Concurrency

```yaml
# File: clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Reduce source-controller concurrency
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=info
                  # Reduce concurrent reconciliations (default is 4)
                  - --concurrent=2
                  - --storage-adv-addr=source-controller.flux-system.svc.cluster.local.
  # Reduce kustomize-controller concurrency
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: kustomize-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=info
                  # Reduce concurrent reconciliations
                  - --concurrent=2
  # Reduce helm-controller concurrency
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=info
                  # Reduce concurrent reconciliations
                  - --concurrent=2
```

## Common Cause 3: Large Number of Managed Resources

In large clusters with hundreds of Kustomizations and HelmReleases, a single controller instance may not be sufficient.

### Fix: Implement Controller Sharding

Flux supports sharding controllers by label, allowing you to distribute the load across multiple controller instances:

```yaml
# Shard 1: manages resources labeled with shard=shard1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller-shard1
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kustomize-controller-shard1
  template:
    metadata:
      labels:
        app: kustomize-controller-shard1
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/kustomize-controller:v1.4.0
          args:
            - --watch-all-namespaces=true
            - --log-level=info
            - --concurrent=4
            # Only reconcile resources with this shard label
            - --watch-label-selector=sharding.fluxcd.io/key=shard1
          resources:
            limits:
              cpu: "1"
              memory: 1Gi
            requests:
              cpu: 100m
              memory: 256Mi
```

Then label your Kustomizations to assign them to shards:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-a-apps
  namespace: flux-system
  labels:
    # Assign this Kustomization to shard1
    sharding.fluxcd.io/key: shard1
spec:
  interval: 10m
  path: ./apps/team-a
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Common Cause 4: Unnecessary Drift Detection

By default, Flux detects drift in applied resources by comparing the desired state with the actual state. This is CPU-intensive for large deployments.

### Fix: Disable Drift Detection for Stable Resources

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: stable-infra
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Disable drift detection to reduce CPU usage
  # Flux will still reconcile on source changes
  force: false
  wait: false
```

## Common Cause 5: Image Scanning Too Frequently

The image-reflector-controller can consume significant CPU when scanning many container images at short intervals.

### Fix: Optimize Image Scanning

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/myorg/my-app
  # Increase scan interval to reduce CPU load
  interval: 30m
  # Limit the number of tags to scan
  exclusionList:
    - "^sha-"
    - "^dev-"
    - "^test-"
```

## Increasing CPU Limits

If tuning intervals and concurrency is not enough, increase the CPU limits:

```yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  limits:
                    cpu: "2"
                    memory: 1Gi
                  requests:
                    cpu: 200m
                    memory: 256Mi
```

## Monitoring CPU Usage

```yaml
# PrometheusRule for Flux CPU alerting
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-cpu-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-cpu
      rules:
        - alert: FluxControllerHighCPU
          expr: |
            rate(container_cpu_usage_seconds_total{
              namespace="flux-system",
              container="manager"
            }[5m]) > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.pod }} has sustained high CPU usage"
```

## Debugging Workflow

```bash
# Step 1: Identify which controller has high CPU
kubectl top pods -n flux-system --sort-by=cpu

# Step 2: Check reconciliation counts and timing
kubectl logs -n flux-system deploy/source-controller --tail=200 | \
  grep "Reconciliation finished" | tail -20

# Step 3: Count managed resources per controller
echo "Sources: $(kubectl get gitrepository,helmrepository,ocirepository -A --no-headers 2>/dev/null | wc -l)"
echo "Kustomizations: $(kubectl get kustomization -A --no-headers | wc -l)"
echo "HelmReleases: $(kubectl get helmrelease -A --no-headers | wc -l)"
echo "ImageRepositories: $(kubectl get imagerepository -A --no-headers 2>/dev/null | wc -l)"

# Step 4: Check for CPU throttling
kubectl describe pod -n flux-system <controller-pod> | grep -i throttl

# Step 5: After applying changes, monitor improvement
watch kubectl top pods -n flux-system
```

## Conclusion

High CPU usage in Flux CD controllers is typically caused by overly frequent reconciliation intervals, high concurrency settings, large numbers of managed resources, or aggressive image scanning. Start by increasing reconciliation intervals for stable resources, then tune concurrency settings. For very large clusters, implement controller sharding to distribute the load. Always monitor CPU usage with Prometheus alerts to catch issues before they impact your deployment pipeline.
