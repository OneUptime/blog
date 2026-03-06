# How to Optimize Flux CD Controller Memory Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Memory Optimization, Performance Tuning, Resource Management

Description: A practical guide to reducing memory consumption of Flux CD controllers in Kubernetes clusters through resource limits, caching strategies, and configuration tuning.

---

Flux CD controllers can consume significant memory in clusters with many resources. High memory usage leads to OOMKill events, failed reconciliations, and degraded cluster performance. This guide walks through practical strategies to optimize memory consumption across all Flux CD controllers.

## Understanding Flux CD Controller Memory Consumption

Flux CD runs several controllers, each with its own memory footprint:

- **source-controller**: Fetches and stores artifacts from Git, Helm, and OCI repositories
- **kustomize-controller**: Applies Kustomize overlays and plain Kubernetes manifests
- **helm-controller**: Manages Helm releases
- **notification-controller**: Handles alerts and event forwarding
- **image-reflector-controller**: Scans container registries for image tags
- **image-automation-controller**: Updates Git repositories with new image tags

The source-controller and kustomize-controller typically consume the most memory because they cache fetched artifacts and rendered manifests.

## Setting Appropriate Resource Limits

Start by setting explicit resource requests and limits for each controller. Create a patch file to override the default resource allocations.

```yaml
# memory-patches.yaml
# Patch for source-controller with tuned memory limits
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
          resources:
            requests:
              # Set request to the typical steady-state usage
              memory: "128Mi"
              cpu: "50m"
            limits:
              # Set limit with headroom for spikes during large repo fetches
              memory: "512Mi"
              cpu: "500m"
```

```yaml
# Patch for kustomize-controller with tuned memory limits
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
          resources:
            requests:
              # Kustomize controller needs more memory for rendering manifests
              memory: "256Mi"
              cpu: "100m"
            limits:
              # Allow headroom for large kustomization builds
              memory: "1Gi"
              cpu: "1000m"
```

```yaml
# Patch for helm-controller with tuned memory limits
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              memory: "128Mi"
              cpu: "50m"
            limits:
              # Helm template rendering can spike memory usage
              memory: "768Mi"
              cpu: "500m"
```

Apply these patches using a Kustomization overlay:

```yaml
# kustomization.yaml
# Overlay that applies memory optimization patches to Flux controllers
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: memory-patches.yaml
    target:
      kind: Deployment
      name: source-controller
  - path: memory-patches.yaml
    target:
      kind: Deployment
      name: kustomize-controller
  - path: memory-patches.yaml
    target:
      kind: Deployment
      name: helm-controller
```

## Configuring Go Garbage Collection

Flux CD controllers are written in Go. You can tune the garbage collector to release memory more aggressively by setting the `GOGC` and `GOMEMLIMIT` environment variables.

```yaml
# gc-tuning-patch.yaml
# Tune Go garbage collection for lower memory footprint
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
          env:
            # GOGC controls GC frequency; lower value = more frequent GC = less memory
            # Default is 100; setting to 50 triggers GC twice as often
            - name: GOGC
              value: "50"
            # GOMEMLIMIT sets a soft memory limit for the Go runtime
            # Set to ~80% of the container memory limit
            - name: GOMEMLIMIT
              value: "400MiB"
```

Apply this pattern to each controller, adjusting `GOMEMLIMIT` to approximately 80% of the container's memory limit.

## Reducing Artifact Storage Size

The source-controller stores fetched artifacts on disk and in memory. Reduce the artifact size by excluding unnecessary files.

```yaml
# GitRepository with ignore patterns to reduce fetched content size
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/example/my-app
  ref:
    branch: main
  ignore: |
    # Exclude non-deployment files to reduce artifact size
    # This directly reduces memory used by source-controller
    /*
    !/deploy/
    !/base/
    !/overlays/
```

## Limiting Concurrent Reconciliations

Each concurrent reconciliation holds resources in memory. Limiting concurrency reduces peak memory usage.

```yaml
# Patch to limit concurrent reconciliations on source-controller
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
            # Limit concurrent git fetches to reduce peak memory
            - --concurrent=2
            # Limit how long artifacts are cached
            - --artifact-retention-ttl=60m
            # Set max artifact size to prevent memory spikes
            - --storage-max-artifact-size=50000000
```

## Monitoring Memory Usage

Set up Prometheus monitoring to track memory consumption over time.

```yaml
# PrometheusRule for alerting on Flux controller memory usage
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-memory-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-memory
      rules:
        # Alert when a controller is using more than 80% of its memory limit
        - alert: FluxControllerHighMemory
          expr: |
            container_memory_working_set_bytes{
              namespace="flux-system",
              container="manager"
            } / container_spec_memory_limit_bytes{
              namespace="flux-system",
              container="manager"
            } > 0.8
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.pod }} memory usage above 80%"
            description: "Consider increasing memory limits or reducing concurrency."

        # Alert on OOMKill events
        - alert: FluxControllerOOMKilled
          expr: |
            kube_pod_container_status_last_terminated_reason{
              namespace="flux-system",
              container="manager",
              reason="OOMKilled"
            } > 0
          for: 0m
          labels:
            severity: critical
          annotations:
            summary: "Flux controller {{ $labels.pod }} was OOMKilled"
```

## Using Vertical Pod Autoscaler

For dynamic workloads, use VPA to automatically adjust memory allocations.

```yaml
# VPA to automatically tune memory for source-controller
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: source-controller-vpa
  namespace: flux-system
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: source-controller
  updatePolicy:
    # Use "Off" mode first to get recommendations without applying them
    # Switch to "Auto" once you trust the recommendations
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: manager
        # Set bounds to prevent VPA from setting unreasonable values
        minAllowed:
          memory: "64Mi"
        maxAllowed:
          memory: "2Gi"
```

## Splitting Large Kustomizations

Large Kustomization resources that render many manifests consume significant memory. Split them into smaller units.

```yaml
# Instead of one large Kustomization, split by component
# apps-frontend.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-frontend
  namespace: flux-system
spec:
  interval: 30m
  # Smaller scope = less memory per reconciliation
  path: ./clusters/production/frontend
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
---
# apps-backend.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-backend
  namespace: flux-system
spec:
  interval: 30m
  path: ./clusters/production/backend
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
---
# apps-data.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-data
  namespace: flux-system
spec:
  interval: 30m
  path: ./clusters/production/data
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
```

## Summary

Key strategies for optimizing Flux CD controller memory usage:

1. Set explicit resource requests and limits based on observed usage patterns
2. Tune Go garbage collection with `GOGC` and `GOMEMLIMIT` environment variables
3. Exclude unnecessary files from GitRepository sources using ignore patterns
4. Limit concurrent reconciliations with the `--concurrent` flag
5. Split large Kustomizations into smaller, focused units
6. Monitor memory usage with Prometheus and set up OOMKill alerts
7. Consider using VPA for automatic memory tuning in dynamic environments

Start by monitoring your current memory usage, then apply these optimizations incrementally. Test each change in a staging environment before rolling out to production.
