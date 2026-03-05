# How to Configure Flux CD Controllers Resource Limits

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Resource Limits, Performance, Controllers, Capacity Planning

Description: Learn how to configure CPU and memory resource requests and limits for Flux CD controllers to ensure stable performance and prevent resource exhaustion.

---

Flux CD runs several controllers in the flux-system namespace: source-controller, kustomize-controller, helm-controller, notification-controller, and optionally image-reflector-controller and image-automation-controller. Each controller has different resource consumption patterns depending on the number of resources it manages. Properly configuring resource requests and limits ensures Flux operates reliably without either starving for resources or consuming more than necessary.

## Why Resource Limits Matter

Without resource limits, a Flux controller can consume unbounded CPU and memory. In large clusters with hundreds of Kustomizations or HelmReleases, the kustomize-controller might use several gigabytes of memory during reconciliation. If a controller runs out of memory on a constrained node, the OOM killer terminates it, causing reconciliation delays and potentially leaving the cluster in a partially reconciled state.

Conversely, setting limits too low causes throttling (for CPU) or OOM kills (for memory), leading to slow reconciliations or controller restarts.

## Default Resource Usage Patterns

Each Flux controller has different resource characteristics:

- **source-controller**: Memory scales with the size of Git repositories and Helm charts it fetches. CPU spikes during git clone and archive operations.
- **kustomize-controller**: Memory scales with the number and size of manifests it builds. CPU usage increases with Kustomize overlays and SOPS decryption.
- **helm-controller**: Memory scales with the number of HelmReleases and chart sizes. CPU spikes during Helm template rendering.
- **notification-controller**: Lightweight. Handles webhook events and alert dispatching.
- **image-reflector-controller**: Memory scales with the number of image tags scanned across all ImageRepositories.
- **image-automation-controller**: Lightweight unless performing many concurrent Git operations.

## Step 1: Check Current Resource Usage

Before setting limits, observe actual resource consumption:

```bash
# Install metrics-server if not present
kubectl top pods -n flux-system

# Example output:
# NAME                                       CPU(cores)   MEMORY(bytes)
# source-controller-6f4b9c8d7-x2k9l         12m          85Mi
# kustomize-controller-7d8f9e6c5-p3m2n       45m          312Mi
# helm-controller-5c6d7e8f9-q4r5s            8m           64Mi
# notification-controller-8b9c0d1e2-t6u7v    2m           28Mi
```

Monitor over a full reconciliation cycle (at least one `interval` period) to capture peak usage:

```bash
# Watch resource usage over time
watch -n 5 kubectl top pods -n flux-system

# Or use Prometheus queries if available:
# container_memory_working_set_bytes{namespace="flux-system"}
# rate(container_cpu_usage_seconds_total{namespace="flux-system"}[5m])
```

## Step 2: Configure Resource Limits via Kustomize Patches

The recommended approach is to use Kustomize patches in your Flux bootstrap configuration:

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 2Gi
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 1Gi
  - target:
      kind: Deployment
      name: notification-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 25m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

Commit and push this file. Flux will apply the patches during its next reconciliation.

## Step 3: Configure Limits via flux install

If you install Flux with the CLI, you can patch resources at install time:

```bash
flux install --export > gotk-components.yaml
```

Then edit the exported manifests directly, or use `flux install` with component-specific flags during bootstrap.

## Step 4: Set Limits for Image Automation Controllers

If you use image automation, configure those controllers too:

```yaml
patches:
  - target:
      kind: Deployment
      name: image-reflector-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 1Gi
  - target:
      kind: Deployment
      name: image-automation-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

The image-reflector-controller can be particularly memory-hungry when scanning repositories with thousands of tags. Monitor its usage closely.

## Step 5: Configure Controller Concurrency

Resource limits work in tandem with controller concurrency settings. Higher concurrency means more parallel reconciliations, which requires more resources:

```yaml
patches:
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --concurrent=10
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --concurrent=5
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --concurrent=5
```

When increasing concurrency, increase memory limits proportionally. Each concurrent reconciliation holds manifests in memory.

## Sizing Guidelines

Here are recommended starting points based on cluster size:

### Small Cluster (fewer than 50 Flux resources)

```yaml
# source-controller
requests: { cpu: 50m, memory: 64Mi }
limits: { cpu: 250m, memory: 256Mi }

# kustomize-controller
requests: { cpu: 50m, memory: 128Mi }
limits: { cpu: 500m, memory: 512Mi }

# helm-controller
requests: { cpu: 50m, memory: 64Mi }
limits: { cpu: 250m, memory: 256Mi }

# notification-controller
requests: { cpu: 25m, memory: 32Mi }
limits: { cpu: 100m, memory: 128Mi }
```

### Medium Cluster (50-200 Flux resources)

```yaml
# source-controller
requests: { cpu: 100m, memory: 128Mi }
limits: { cpu: 500m, memory: 512Mi }

# kustomize-controller
requests: { cpu: 200m, memory: 512Mi }
limits: { cpu: 1000m, memory: 2Gi }

# helm-controller
requests: { cpu: 100m, memory: 256Mi }
limits: { cpu: 500m, memory: 1Gi }

# notification-controller
requests: { cpu: 50m, memory: 64Mi }
limits: { cpu: 200m, memory: 256Mi }
```

### Large Cluster (200+ Flux resources)

```yaml
# source-controller
requests: { cpu: 200m, memory: 256Mi }
limits: { cpu: 1000m, memory: 1Gi }

# kustomize-controller
requests: { cpu: 500m, memory: 1Gi }
limits: { cpu: 2000m, memory: 4Gi }

# helm-controller
requests: { cpu: 200m, memory: 512Mi }
limits: { cpu: 1000m, memory: 2Gi }

# notification-controller
requests: { cpu: 50m, memory: 64Mi }
limits: { cpu: 200m, memory: 256Mi }
```

## Monitoring Resource Usage

Set up alerts for controllers approaching their limits:

```yaml
# PrometheusRule for Flux controller resource alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-resource-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-resources
      rules:
        - alert: FluxControllerMemoryHigh
          expr: |
            container_memory_working_set_bytes{namespace="flux-system"}
            / on(pod) kube_pod_container_resource_limits{namespace="flux-system", resource="memory"}
            > 0.85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.pod }} is using more than 85% of memory limit"
        - alert: FluxControllerOOMKilled
          expr: |
            increase(kube_pod_container_status_restarts_total{namespace="flux-system"}[1h]) > 0
          labels:
            severity: critical
          annotations:
            summary: "Flux controller {{ $labels.pod }} has restarted"
```

## Summary

Configuring resource limits for Flux CD controllers prevents resource exhaustion and ensures stable reconciliation. Start by observing actual usage with `kubectl top`, apply limits using Kustomize patches in your bootstrap configuration, and adjust concurrency settings to match. Monitor usage over time and scale limits as your cluster grows. The kustomize-controller and source-controller typically need the most resources, while the notification-controller remains lightweight.
