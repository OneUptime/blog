# How to Configure Stress Chaos Experiments with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Chaos Engineering, Chaos Mesh, Stress Chaos

Description: Manage CPU and memory stress chaos experiments using Chaos Mesh and Flux CD to validate resource limits, HPA scaling, and OOM handling.

---

## Introduction

Resource stress is one of the most realistic forms of chaos you can introduce to a Kubernetes cluster. In production, noisy neighbors, memory leaks, and CPU-intensive jobs frequently cause resource contention. Stress chaos experiments deliberately consume CPU and memory within specific pods to validate that your resource limits, Horizontal Pod Autoscaler (HPA) policies, and OOMKilled recovery behaviors work as expected.

Chaos Mesh's `StressChaos` CRD provides fine-grained control over CPU worker count, CPU load percentage, and memory consumption. By managing `StressChaos` manifests through Flux CD, your engineering team can propose, review, and schedule resource stress experiments through the same Git-based workflow used for all infrastructure changes.

This guide covers CPU stress, memory stress, and combined resource stress experiments managed by Flux CD.

## Prerequisites

- Chaos Mesh deployed via Flux HelmRelease
- Flux CD bootstrapped on the cluster
- Metrics Server installed for HPA to function
- A Deployment with HPA configured for autoscaling validation

## Step 1: Configure a CPU Stress Experiment

CPU stress spawns worker goroutines that consume CPU cycles, simulating a CPU-bound process or noisy neighbor.

```yaml
# clusters/my-cluster/chaos-experiments/cpu-stress.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress-api
  namespace: chaos-mesh
  annotations:
    description: "Validates HPA scale-out when CPU exceeds 80%"
spec:
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: api-server
  stressors:
    cpu:
      # Number of worker threads burning CPU
      workers: 4
      # Target CPU load percentage (0-100)
      load: 80
      # Optional: restrict stress to specific CPU cores
      options:
        - "--cpu-method=all"
  duration: "5m"
```

## Step 2: Configure a Memory Stress Experiment

Memory stress allocates and holds memory, simulating a memory leak or large in-memory cache.

```yaml
# clusters/my-cluster/chaos-experiments/memory-stress.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: memory-stress-cache
  namespace: chaos-mesh
  annotations:
    description: "Validates OOMKilled recovery and memory limit enforcement"
spec:
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: cache-service
  stressors:
    memory:
      # Number of memory stress workers
      workers: 2
      # Allocate 256MB of memory per worker
      size: "256MB"
      # Time between allocation spikes
      options:
        - "--timeout=30"
  duration: "3m"
```

## Step 3: Configure Combined CPU and Memory Stress

```yaml
# clusters/my-cluster/chaos-experiments/combined-stress.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: combined-stress-worker
  namespace: chaos-mesh
  annotations:
    description: "Validates resource quota enforcement under combined load"
spec:
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: worker
  stressors:
    cpu:
      workers: 2
      load: 60
    memory:
      workers: 1
      size: "128MB"
  duration: "10m"
```

## Step 4: Schedule Stress Tests with Chaos Mesh Schedule

```yaml
# clusters/my-cluster/chaos-experiments/cpu-stress-schedule.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Schedule
metadata:
  name: daily-cpu-stress
  namespace: chaos-mesh
spec:
  # Run every Tuesday at 3 AM
  schedule: "0 3 * * 2"
  historyLimit: 5
  concurrencyPolicy: Forbid
  type: StressChaos
  stressChaos:
    mode: one
    selector:
      namespaces:
        - default
      labelSelectors:
        app: api-server
    stressors:
      cpu:
        workers: 2
        load: 90
    duration: "5m"
```

## Step 5: Manage via Flux Kustomization

```yaml
# clusters/my-cluster/chaos-experiments/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: stress-chaos-experiments
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/chaos-experiments
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: chaos-mesh
```

## Step 6: Validate HPA and OOM Behavior

```bash
# Watch HPA scale out during CPU stress
kubectl get hpa -n default -w

# Monitor pod resource usage during memory stress
kubectl top pods -n default

# Check OOMKilled events after memory stress
kubectl get events -n default --field-selector reason=OOMKilling

# View StressChaos status
kubectl describe stresschaos cpu-stress-api -n chaos-mesh
```

## Best Practices

- Always validate that your pods have `resources.requests` and `resources.limits` set before running stress experiments.
- Test CPU stress at thresholds just above your HPA `targetCPUUtilizationPercentage` to verify scale-out triggers correctly.
- Use memory stress with a `size` slightly below the pod's memory limit first, then increase to confirm OOMKilled is handled gracefully.
- Combine stress experiments with your observability stack to capture CPU throttling events (look for `cpu_throttled_seconds_total` in Prometheus).
- Use `mode: one` before `mode: all` to observe the impact of a single stressed pod before stressing the entire deployment.

## Conclusion

Stress chaos experiments are essential for validating that Kubernetes resource management - HPA scaling, resource limits, and OOM handling - behaves as designed under real pressure. By managing `StressChaos` resources through Flux CD, your team gains a systematic, auditable way to stress-test workloads, ensuring resource configurations are correct before a real production incident forces the validation under the worst possible conditions.
