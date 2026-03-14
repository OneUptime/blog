# How to Configure Pod Chaos Experiments with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Chaos Engineering, Chaos Mesh, Pod Chaos

Description: Manage pod-level chaos experiments including pod kill and CPU stress using Flux CD GitOps to ensure version-controlled, repeatable fault injection.

---

## Introduction

Pod-level chaos experiments are the most fundamental form of chaos engineering in Kubernetes. They simulate real-world failure scenarios such as pods being killed by the scheduler, containers consuming excessive CPU, or processes crashing unexpectedly. Running these experiments regularly validates that your Deployment replicas, health checks, and horizontal scaling are configured correctly.

Flux CD elevates pod chaos experiments from one-off manual commands to tracked, reviewable, and reproducible GitOps resources. By storing `PodChaos` and `StressChaos` manifests in Git, every team member can see what experiments are scheduled, when they last ran, and what the results were. Changes to experiment parameters go through your standard pull request review process.

This guide covers configuring pod kill, container kill, and CPU stress chaos experiments using Chaos Mesh CRDs, all managed through Flux CD.

## Prerequisites

- Chaos Mesh deployed on your cluster (via Flux HelmRelease)
- Flux CD bootstrapped on the cluster
- `kubectl` and `flux` CLI tools
- Target application running in a namespace annotated for chaos injection

## Step 1: Verify Chaos Mesh Is Ready

```bash
# Confirm all Chaos Mesh pods are running
kubectl get pods -n chaos-mesh

# Verify CRDs are installed
kubectl get crd | grep chaos-mesh.org
```

## Step 2: Configure a Pod Kill Experiment

Pod kill terminates one or more pods matching a selector. Kubernetes reschedules them, validating your availability guarantees.

```yaml
# clusters/my-cluster/chaos-experiments/pod-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-nginx
  namespace: chaos-mesh
  annotations:
    # Document the purpose of this experiment
    chaos-mesh.org/description: "Validates nginx deployment self-heals after pod kill"
spec:
  action: pod-kill
  mode: one          # Kill one pod at a time
  selector:
    namespaces:
      - default
    labelSelectors:
      app: nginx
  # Run for 60 seconds then auto-recover
  duration: "60s"
```

## Step 3: Configure a Container Kill Experiment

Container kill targets a specific container within a pod, useful when pods run multiple containers (sidecars).

```yaml
# clusters/my-cluster/chaos-experiments/container-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: container-kill-sidecar
  namespace: chaos-mesh
spec:
  action: container-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: myapp
  # Only kill the sidecar container, not the main application
  containerNames:
    - istio-proxy
  duration: "30s"
```

## Step 4: Configure a CPU Stress Experiment

CPU stress simulates a noisy-neighbor scenario where a pod consumes excessive CPU, helping you validate resource limits and HPA behavior.

```yaml
# clusters/my-cluster/chaos-experiments/cpu-stress.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress-nginx
  namespace: chaos-mesh
spec:
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: nginx
  stressors:
    cpu:
      # Spawn 2 CPU-stressing workers
      workers: 2
      # Consume 80% of available CPU
      load: 80
  duration: "120s"
```

## Step 5: Schedule Experiments with Cron

Use the Chaos Mesh `Schedule` resource to run experiments on a recurring cron schedule.

```yaml
# clusters/my-cluster/chaos-experiments/pod-kill-schedule.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Schedule
metadata:
  name: scheduled-pod-kill
  namespace: chaos-mesh
spec:
  # Run every weekday at 10 AM
  schedule: "0 10 * * 1-5"
  # Keep the last 3 experiment records
  historyLimit: 3
  concurrencyPolicy: Forbid
  type: PodChaos
  podChaos:
    action: pod-kill
    mode: one
    selector:
      namespaces:
        - default
      labelSelectors:
        app: nginx
    duration: "30s"
```

## Step 6: Manage Experiments via Flux Kustomization

```yaml
# clusters/my-cluster/chaos-experiments/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: chaos-experiments
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/chaos-experiments
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Ensure Chaos Mesh itself is healthy before applying experiments
  dependsOn:
    - name: chaos-mesh
```

## Step 7: Observe Experiment Results

```bash
# List all pod chaos experiments
kubectl get podchaos -n chaos-mesh

# View detailed status including affected pods
kubectl describe podchaos pod-kill-nginx -n chaos-mesh

# Check if pods recovered after the experiment
kubectl get pods -n default -w
```

## Best Practices

- Start with `mode: one` (single pod) before moving to `mode: all` to limit blast radius.
- Always set a `duration` so experiments have a defined end time and do not run indefinitely.
- Use the `Schedule` resource for recurring experiments rather than manually re-applying manifests.
- Combine pod chaos with application-level metrics to validate SLOs hold during fault injection.
- Use Flux `dependsOn` to prevent experiment resources from being applied before Chaos Mesh is ready.
- Document each experiment's purpose in an annotation or Git commit message.

## Conclusion

Pod chaos experiments are the cornerstone of Kubernetes resilience testing. By managing `PodChaos` and `StressChaos` resources through Flux CD, you ensure every experiment is version-controlled, scheduled predictably, and reviewed by your team before it runs in any environment. This transforms chaos engineering from an informal practice into a disciplined, auditable part of your reliability workflow.
