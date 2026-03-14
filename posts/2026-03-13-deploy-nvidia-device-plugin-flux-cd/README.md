# How to Deploy NVIDIA Device Plugin with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, NVIDIA, GPU, Device Plugin, DaemonSet, MLOps

Description: Deploy the NVIDIA device plugin DaemonSet to Kubernetes using Flux CD to expose GPU resources to your workloads without the full GPU Operator.

---

## Introduction

The NVIDIA device plugin is a lightweight Kubernetes DaemonSet that advertises GPU resources on each node, enabling schedulers to place GPU workloads accurately. Unlike the full GPU Operator, it assumes drivers are already installed on the host, making it ideal for environments where the OS layer is managed separately.

Using Flux CD to deploy the device plugin ensures that every GPU node in your cluster is consistently configured through a GitOps workflow. Changes to the plugin version or configuration are reviewed as pull requests and applied automatically.

This guide walks through deploying the NVIDIA device plugin via Flux CD using both a HelmRelease and a raw DaemonSet manifest approach, giving you flexibility based on your cluster setup.

## Prerequisites

- Kubernetes cluster with NVIDIA GPU nodes and drivers pre-installed on the host OS
- Flux CD v2 bootstrapped to your Git repository
- containerd or Docker runtime configured with the NVIDIA container runtime hook
- kubectl access to your cluster

## Step 1: Create the Namespace and HelmRepository

```yaml
# clusters/my-cluster/device-plugin/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nvidia-device-plugin
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/device-plugin/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: nvdp
  namespace: nvidia-device-plugin
spec:
  interval: 12h
  url: https://nvidia.github.io/k8s-device-plugin
```

## Step 2: Deploy the Device Plugin via HelmRelease

```yaml
# clusters/my-cluster/device-plugin/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nvdp
  namespace: nvidia-device-plugin
spec:
  interval: 1h
  chart:
    spec:
      chart: nvidia-device-plugin
      version: "0.14.*"
      sourceRef:
        kind: HelmRepository
        name: nvdp
        namespace: nvidia-device-plugin
      interval: 12h
  values:
    # Use mixed MIG strategy to support heterogeneous GPU node pools
    migStrategy: "mixed"
    # Fail on driver initialization errors for fast feedback
    failOnInitError: true
    # Pass through device list via volume mounts (more secure than env vars)
    deviceListStrategy: "volume-mounts"
    # Resource name to advertise on nodes
    resourceName: "nvidia.com/gpu"
    tolerations:
      - key: "nvidia.com/gpu"
        operator: "Exists"
        effect: "NoSchedule"
```

## Step 3: Wire Up the Flux Kustomization

```yaml
# clusters/my-cluster/device-plugin/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
---
# clusters/my-cluster/flux-kustomization-device-plugin.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: nvidia-device-plugin
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/device-plugin
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 4: Verify the DaemonSet is Running

```bash
# Check Flux reconciliation status
flux get kustomizations nvidia-device-plugin

# Confirm DaemonSet pods are running on GPU nodes
kubectl get daemonset -n nvidia-device-plugin

# Check GPU capacity reported by the kubelet
kubectl get nodes -o custom-columns=\
  NAME:.metadata.name,\
  GPU:.status.capacity."nvidia\.com/gpu"
```

## Step 5: Confirm GPU Allocation Works

Create a simple test workload requesting one GPU:

```yaml
# test-device-plugin.yaml
apiVersion: v1
kind: Pod
metadata:
  name: device-plugin-test
spec:
  restartPolicy: Never
  containers:
    - name: cuda-vector-add
      image: nvidia/cuda:12.3-base-ubuntu22.04
      command: ["nvidia-smi", "-L"]
      resources:
        limits:
          nvidia.com/gpu: 1
```

```bash
kubectl apply -f test-device-plugin.yaml
kubectl wait --for=condition=Completed pod/device-plugin-test --timeout=60s
kubectl logs device-plugin-test
# Output: GPU 0: NVIDIA Tesla T4 (UUID: GPU-...)
```

## Best Practices

- Use the `mixed` MIG strategy when your cluster has both MIG-enabled and standard GPU nodes to avoid resource advertisement conflicts.
- Add a `nvidia.com/gpu: NoSchedule` taint to GPU nodes and include the matching toleration in the device plugin DaemonSet so non-GPU workloads do not land on expensive GPU nodes.
- Pin the chart version with a patch wildcard (`0.14.*`) to automatically receive bug fixes while protecting against minor-version breaking changes.
- Monitor DaemonSet rollout health with Flux's built-in health checks by adding `healthChecks` to the Flux Kustomization.
- Use `deviceListStrategy: volume-mounts` over environment variable injection for better security isolation.

## Conclusion

Deploying the NVIDIA device plugin with Flux CD gives you a consistent, GitOps-driven method to expose GPU capacity across your cluster. Every update to the plugin — whether a version bump or a configuration change — flows through your version control system, making audits straightforward and rollbacks a single git revert away.
