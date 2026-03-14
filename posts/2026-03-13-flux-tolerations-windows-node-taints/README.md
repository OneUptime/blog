# How to Use Tolerations for Windows Node Taints with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Windows Containers, Tolerations, Node Taints, GitOps

Description: Configure tolerations for Windows node taints in Flux CD deployments, preventing Linux workloads from scheduling on Windows nodes and ensuring correct placement.

---

## Introduction

Kubernetes node taints work in conjunction with tolerations to prevent workloads from scheduling on inappropriate nodes. Windows nodes in a Kubernetes cluster are typically tainted to prevent Linux containers from being scheduled on them - a Linux container cannot run on a Windows host OS. Without tolerations in your Windows workload manifests, pods will be stuck in `Pending` state indefinitely.

The taint system serves a critical purpose in mixed clusters: Linux nodes should be the default for most workloads, and Windows nodes should only accept pods that explicitly declare they are Windows-compatible. Understanding and correctly configuring taints and tolerations is essential for stable mixed-cluster operation.

This guide covers the standard Windows node taints, how to configure tolerations in your Flux-managed manifests, and how to use Kustomize to apply tolerations consistently.

## Prerequisites

- Kubernetes cluster with Windows nodes that have OS-specific taints
- Flux CD managing the cluster
- `kubectl` access to inspect node taints
- Git repository for Flux manifests

## Step 1: Understand Windows Node Taints

Different Kubernetes platforms apply different taints to Windows nodes.

```bash
# Check existing taints on Windows nodes
kubectl describe node windows-worker-1 | grep Taints

# Common Windows node taints:
# AKS-managed Windows nodes:
#   Taints: os=windows:NoSchedule
# Self-managed Windows nodes (common convention):
#   Taints: node.kubernetes.io/os=windows:NoSchedule
# Operator-applied taints:
#   Taints: windows=true:NoSchedule

# You can also add custom taints
kubectl taint nodes windows-worker-1 workload-type=windows:NoSchedule
```

## Step 2: Standard Toleration for AKS Windows Nodes

```yaml
# Standard toleration for AKS Windows node taint: os=windows:NoSchedule
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-app
  namespace: windows-workloads
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows

      tolerations:
        # Tolerate the standard AKS Windows node taint
        - key: os
          value: windows
          operator: Equal
          effect: NoSchedule
```

## Step 3: Multiple Toleration Scenarios

Different clusters may apply different taints. Configure tolerations to handle all scenarios.

```yaml
# Comprehensive Windows tolerations for portability across providers
spec:
  template:
    spec:
      tolerations:
        # AKS standard taint
        - key: os
          value: windows
          operator: Equal
          effect: NoSchedule

        # Self-managed Kubernetes convention
        - key: node.kubernetes.io/os
          value: windows
          operator: Equal
          effect: NoSchedule

        # Generic windows taint
        - key: windows
          value: "true"
          operator: Equal
          effect: NoSchedule

        # Tolerate any taint with Exists operator (broad - use carefully)
        # - operator: Exists
        #   effect: NoSchedule
```

## Step 4: GPU Windows Nodes - Additional Tolerations

```yaml
# Windows GPU nodes often have additional GPU-specific taints
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        accelerator: nvidia-gpu

      tolerations:
        # Windows OS taint
        - key: os
          value: windows
          operator: Equal
          effect: NoSchedule

        # NVIDIA GPU taint (applied by NVIDIA device plugin)
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule

        # Custom GPU node taint if applicable
        - key: node.kubernetes.io/gpu
          operator: Exists
          effect: NoSchedule
```

## Step 5: Kustomize Strategic Merge for Tolerations

Use strategic merge patches to add tolerations to existing deployments without duplicating the full manifest.

```yaml
# overlays/production/windows-tolerations-patch.yaml
# Strategic merge patch adds tolerations to existing spec
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-app
  namespace: windows-workloads
spec:
  template:
    spec:
      # Strategic merge will ADD these tolerations to any existing ones
      tolerations:
        - key: os
          value: windows
          operator: Equal
          effect: NoSchedule
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/windows-workloads

patches:
  - path: windows-tolerations-patch.yaml
    target:
      kind: Deployment
      namespace: windows-workloads
```

## Step 6: Prevent Linux Workloads from Scheduling on Windows Nodes

Configure Linux workloads to explicitly avoid Windows nodes, and add a NoSchedule taint to Windows nodes for all non-Windows pods.

```bash
# Add taint to all Windows nodes (prevents all pods without toleration)
kubectl taint nodes -l "kubernetes.io/os=windows" \
  os=windows:NoSchedule

# Verify taints are applied
kubectl get nodes -l "kubernetes.io/os=windows" -o json | \
  jq '.items[] | {name: .metadata.name, taints: .spec.taints}'
```

```yaml
# Optionally add NoExecute taint to evict any misscheduled Linux pods
# (use with caution - will evict pods that don't have the toleration)
# kubectl taint nodes windows-worker-1 os=windows:NoExecute
```

```yaml
# Ensure Linux workloads explicitly target Linux nodes
# and do NOT have Windows tolerations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linux-app
  namespace: production
spec:
  template:
    spec:
      # Explicit Linux targeting prevents accidental scheduling on Windows
      nodeSelector:
        kubernetes.io/os: linux
      # NO Windows tolerations on Linux workloads
```

## Step 7: Validate Toleration Configuration

```bash
# Check which pods are running on Windows vs Linux nodes
kubectl get pods -A -o wide | \
  awk '{print $1, $2, $8}' | \
  while read ns pod node; do
    OS=$(kubectl get node "$node" -o jsonpath='{.metadata.labels.kubernetes\.io/os}' 2>/dev/null || echo "unknown")
    echo "$ns/$pod -> $node (OS: $OS)"
  done

# Check for pending pods with scheduling errors
kubectl get pods -A --field-selector='status.phase=Pending'
kubectl describe pod <pending-pod> -n <namespace> | grep -A 10 Events
# Look for: "1 node(s) had taint" or "didn't match Pod's node affinity/selector"
```

## Best Practices

- Apply the `os=windows:NoSchedule` taint to all Windows nodes immediately after provisioning.
- Require tolerations explicitly in code review - do not rely on operators to notice missing tolerations.
- Use a Kyverno policy to enforce that Windows-labeled deployments include the required toleration.
- Test taint and toleration configuration by deploying to a staging cluster with Windows nodes first.
- Document your cluster's specific taints in your repository's README so developers know what to tolerate.
- Periodically audit pods running on Windows nodes to ensure they are intentionally there.

## Conclusion

Tolerations are the other half of the Windows scheduling equation, complementing node selectors. Without the correct toleration, even a deployment with the perfect node selector cannot schedule on a tainted Windows node. By standardizing tolerations through Kustomize components, validating in CI, and enforcing via admission policies, you ensure that every Windows workload in your Flux-managed cluster can reliably schedule on the appropriate nodes.
