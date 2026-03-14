# How to Deploy NVIDIA GPU Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, NVIDIA, GPU, GPU Operator, Helm, MLOps

Description: Deploy the NVIDIA GPU Operator to Kubernetes using Flux CD HelmRelease to automate GPU driver and runtime management across your cluster.

---

## Introduction

Managing GPU resources in Kubernetes clusters traditionally requires manual driver installation, device plugin configuration, and container runtime setup on every node. The NVIDIA GPU Operator simplifies this by automating the full GPU software stack deployment as a Kubernetes-native solution.

Flux CD brings GitOps principles to this process, ensuring your GPU Operator configuration is version-controlled, auditable, and automatically reconciled. Any configuration drift is corrected, and new nodes joining the cluster receive GPU support automatically through the same declarative pipeline.

In this guide you will learn how to deploy the NVIDIA GPU Operator using Flux CD HelmRelease, configure namespace and RBAC prerequisites, and validate that GPU resources are available to workloads.

## Prerequisites

- A running Kubernetes cluster with NVIDIA GPU nodes
- Flux CD v2 installed and bootstrapped to a Git repository
- kubectl configured to access your cluster
- Nodes with NVIDIA GPUs (tested with T4, A100, H100)
- Container runtime: containerd

## Step 1: Create the Namespace and HelmRepository

Create the namespace and point Flux at the NVIDIA Helm registry.

```yaml
# clusters/my-cluster/gpu-operator/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gpu-operator
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/gpu-operator/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: nvidia
  namespace: gpu-operator
spec:
  interval: 12h
  url: https://helm.ngc.nvidia.com/nvidia
```

Commit both files to your GitOps repository so Flux picks them up on the next reconciliation.

## Step 2: Create the HelmRelease for the GPU Operator

```yaml
# clusters/my-cluster/gpu-operator/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: gpu-operator
  namespace: gpu-operator
spec:
  interval: 1h
  chart:
    spec:
      chart: gpu-operator
      version: "v23.9.*"
      sourceRef:
        kind: HelmRepository
        name: nvidia
        namespace: gpu-operator
      interval: 12h
  values:
    # Use the default driver container image
    driver:
      enabled: true
    # Enable the NVIDIA container toolkit
    toolkit:
      enabled: true
    # Enable the device plugin
    devicePlugin:
      enabled: true
    # Enable GPU feature discovery
    gfd:
      enabled: true
    # MIG strategy for multi-instance GPU support
    mig:
      strategy: single
    # Node Feature Discovery required by GPU Operator
    nfd:
      enabled: true
```

## Step 3: Create a Kustomization to Tie Resources Together

```yaml
# clusters/my-cluster/gpu-operator/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
```

And a Flux Kustomization to apply this directory:

```yaml
# clusters/my-cluster/flux-kustomization-gpu-operator.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gpu-operator
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/gpu-operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 4: Validate GPU Operator Deployment

After pushing your changes, watch Flux reconcile the resources:

```bash
# Check Flux Kustomization status
flux get kustomizations gpu-operator

# Watch GPU Operator pods come up
kubectl get pods -n gpu-operator -w

# Verify GPU capacity is reported on nodes
kubectl get nodes -o json | jq '.items[].status.capacity | select(."nvidia.com/gpu")'
```

Expected output showing GPU capacity:

```json
{
  "nvidia.com/gpu": "1"
}
```

## Step 5: Test GPU Access with a Sample Pod

```yaml
# test-gpu-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
  namespace: default
spec:
  restartPolicy: Never
  containers:
    - name: cuda-test
      image: nvidia/cuda:12.3-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
```

```bash
kubectl apply -f test-gpu-pod.yaml
kubectl logs gpu-test
# Should print nvidia-smi output listing detected GPUs
kubectl delete pod gpu-test
```

## Best Practices

- Pin the GPU Operator chart version using a semver range (e.g., `v23.9.*`) to receive patch updates automatically while avoiding breaking changes.
- Use `prune: true` on the Flux Kustomization so removed resources are cleaned up from the cluster.
- Store GPU Operator values in a separate `values.yaml` file and reference it with `valuesFrom` for easier review in pull requests.
- Label GPU nodes consistently (e.g., `nvidia.com/gpu=true`) and use node selectors in non-operator workloads to avoid scheduling on non-GPU nodes.
- Enable Flux notifications to alert your team when the HelmRelease fails to reconcile.

## Conclusion

By managing the NVIDIA GPU Operator through Flux CD, you gain a fully declarative, GitOps-driven approach to GPU infrastructure. Every change to driver versions, feature flags, or MIG strategies goes through a pull request, is reviewed, and is automatically applied and reconciled across your cluster — eliminating configuration drift and reducing toil for platform teams supporting AI/ML workloads.
