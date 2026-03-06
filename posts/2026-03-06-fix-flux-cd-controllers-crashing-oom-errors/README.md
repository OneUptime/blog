# How to Fix Flux CD Controllers Crashing with OOM Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, OOM, Out of Memory, Kubernetes, Troubleshooting, GitOps, Resource Limits, Performance

Description: A practical guide to diagnosing and fixing Out of Memory (OOM) crashes in Flux CD controllers, covering memory limit tuning, large repository handling, and caching optimization.

---

## Introduction

Flux CD controllers run as pods in your Kubernetes cluster and, like any workload, they are subject to memory limits. When a Flux controller exceeds its memory limit, Kubernetes terminates it with an OOMKilled status. This leads to reconciliation failures, delayed deployments, and potential instability in your GitOps pipeline.

This guide covers how to identify which controller is running out of memory, why it happens, and how to fix it.

## Understanding the Error

When a Flux controller is OOM-killed, you will see signs in multiple places:

```bash
# Check pod status for OOMKilled
kubectl get pods -n flux-system

# Example output showing OOMKilled
# NAME                                      READY   STATUS      RESTARTS   AGE
# source-controller-5b8f4d7c9-abc12         0/1     OOMKilled   5          1h
# kustomize-controller-6f9b5d8e1-def34      1/1     Running     0          1h
# helm-controller-7a2c6e9f3-ghi56           1/1     Running     0          1h
```

```bash
# Get detailed information about the OOM event
kubectl describe pod -n flux-system source-controller-5b8f4d7c9-abc12

# Check previous container logs before the crash
kubectl logs -n flux-system source-controller-5b8f4d7c9-abc12 --previous
```

```bash
# Check Kubernetes events for OOM kills
kubectl get events -n flux-system --sort-by=.lastTimestamp | grep OOM
```

## Common Cause 1: Default Memory Limits Too Low for Large Repositories

The source-controller is the most common controller to be OOM-killed, especially when cloning and processing large Git repositories.

### Diagnosing the Issue

```bash
# Check current resource limits on Flux controllers
kubectl get deployment -n flux-system source-controller -o yaml | \
  grep -A 10 "resources:"

# Check actual memory usage
kubectl top pods -n flux-system
```

### Fix: Increase Memory Limits

You can patch the Flux controller deployments to increase their memory limits. If you installed Flux via the CLI bootstrap, modify the kustomization patches:

```yaml
# File: clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Increase source-controller memory limits
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
                    memory: 2Gi
                  requests:
                    memory: 256Mi
```

### Recommended Memory Limits by Repository Size

```yaml
# Small repos (< 100MB, < 1000 resources)
resources:
  limits:
    memory: 512Mi
  requests:
    memory: 128Mi

# Medium repos (100MB - 500MB, 1000 - 5000 resources)
resources:
  limits:
    memory: 1Gi
  requests:
    memory: 256Mi

# Large repos (500MB - 2GB, 5000+ resources)
resources:
  limits:
    memory: 2Gi
  requests:
    memory: 512Mi

# Very large repos or mono-repos (> 2GB)
resources:
  limits:
    memory: 4Gi
  requests:
    memory: 1Gi
```

## Common Cause 2: Helm Controller OOM with Large Charts

The helm-controller can also run out of memory when processing complex Helm charts with many templates or large values files.

### Fix: Increase Helm Controller Memory

```yaml
# Patch for helm-controller
patches:
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
                resources:
                  limits:
                    memory: 2Gi
                  requests:
                    memory: 256Mi
```

## Common Cause 3: Too Many Concurrent Reconciliations

By default, Flux controllers process multiple reconciliations in parallel. Each concurrent reconciliation consumes memory. If too many run simultaneously, the controller can exceed its memory limit.

### Diagnosing the Issue

```bash
# Check how many resources each controller manages
kubectl get gitrepository -A --no-headers | wc -l
kubectl get helmrepository -A --no-headers | wc -l
kubectl get helmrelease -A --no-headers | wc -l
kubectl get kustomization -A --no-headers | wc -l
```

### Fix: Reduce Concurrency

```yaml
# Reduce the number of concurrent reconciliations
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
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=info
                  # Reduce concurrent git clones from default
                  - --concurrent=2
                  # Limit artifact storage size
                  - --storage-adv-addr=source-controller.flux-system.svc.cluster.local.
```

## Common Cause 4: Large Git Repository with Full Clone

By default, Flux performs a shallow clone. However, certain configurations or tag-based references may trigger a full clone, consuming significantly more memory.

### Fix: Ensure Shallow Clones

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-large-repo
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/myorg/my-large-repo.git
  ref:
    branch: main
  # Ignore non-essential paths to reduce clone size
  ignore: |
    # Exclude docs, tests, and CI files
    /docs/
    /tests/
    /.github/
    /*.md
```

### Fix: Use Sparse Checkout with include

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-mono-repo
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/myorg/my-mono-repo.git
  ref:
    branch: main
  include:
    - fromPath: deploy/kubernetes
      toPath: .
```

## Common Cause 5: Kustomize Controller OOM with Complex Overlays

The kustomize-controller can run out of memory when processing deeply nested kustomize overlays or generating a large number of resources.

### Fix: Increase Kustomize Controller Memory and Split Workloads

```yaml
# Increase kustomize-controller resources
patches:
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
                resources:
                  limits:
                    memory: 2Gi
                  requests:
                    memory: 256Mi
```

Also consider splitting a single large Kustomization into multiple smaller ones:

```yaml
---
# Instead of one Kustomization for all apps
# Split into per-team or per-app Kustomizations
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-a-apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/team-a
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-b-apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/team-b
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Monitoring Flux Controller Memory

Set up monitoring to catch OOM issues before they cause disruptions:

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
        # Alert when a Flux controller uses more than 80% of its memory limit
        - alert: FluxControllerHighMemory
          expr: |
            container_memory_working_set_bytes{namespace="flux-system",container="manager"}
            /
            container_spec_memory_limit_bytes{namespace="flux-system",container="manager"}
            > 0.8
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.pod }} is using > 80% of memory limit"
        # Alert on OOMKilled events
        - alert: FluxControllerOOMKilled
          expr: |
            kube_pod_container_status_last_terminated_reason{namespace="flux-system",reason="OOMKilled"} > 0
          for: 0m
          labels:
            severity: critical
          annotations:
            summary: "Flux controller {{ $labels.pod }} was OOM killed"
```

## Debugging Workflow

```bash
# Step 1: Identify which controller is being OOM-killed
kubectl get pods -n flux-system -o wide

# Step 2: Check restart count and reason
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\t"}{.status.containerStatuses[0].lastState.terminated.reason}{"\n"}{end}'

# Step 3: Check current memory usage vs limits
kubectl top pods -n flux-system
kubectl get deployment -n flux-system -o custom-columns="NAME:.metadata.name,MEM_LIMIT:.spec.template.spec.containers[0].resources.limits.memory"

# Step 4: Check the number of managed resources
echo "GitRepositories: $(kubectl get gitrepository -A --no-headers | wc -l)"
echo "HelmRepositories: $(kubectl get helmrepository -A --no-headers | wc -l)"
echo "HelmReleases: $(kubectl get helmrelease -A --no-headers | wc -l)"
echo "Kustomizations: $(kubectl get kustomization -A --no-headers | wc -l)"

# Step 5: After increasing limits, verify the fix
kubectl rollout status deployment/source-controller -n flux-system
```

## Conclusion

OOM errors in Flux CD controllers are caused by insufficient memory limits relative to the workload size. The source-controller is most commonly affected due to large Git repository clones, followed by the helm-controller and kustomize-controller. Fix these issues by increasing memory limits, reducing concurrency, using sparse checkouts for large repositories, and splitting large Kustomizations into smaller units. Set up memory monitoring and alerts to catch these issues proactively before they impact your GitOps pipeline.
