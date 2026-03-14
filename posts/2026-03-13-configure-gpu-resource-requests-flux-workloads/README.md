# How to Configure GPU Resource Requests in Flux Managed Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, GPU, Resource Requests, MLOps, Scheduling

Description: Configure GPU resource requests and limits in Flux CD managed workloads to ensure correct scheduling and prevent resource contention in multi-tenant GPU clusters.

---

## Introduction

Kubernetes treats GPU resources as extended resources - they are not automatically divisible like CPU and memory. Requesting GPUs incorrectly leads to workloads stuck in a Pending state, wasted capacity, or OOM-killed containers. Getting resource requests right is foundational to running AI/ML workloads reliably.

Flux CD lets you define and version-control these resource configurations declaratively. By managing GPU requests through GitOps, you can enforce standards across teams, track changes over time, and roll back misconfigured resource quotas instantly.

This guide covers how to configure GPU resource requests and limits in Flux-managed Deployments and Jobs, set namespace-level ResourceQuotas, and use LimitRanges to enforce GPU usage policies.

## Prerequisites

- Kubernetes cluster with GPU nodes and the NVIDIA device plugin or GPU Operator installed
- Flux CD v2 bootstrapped to your Git repository
- Familiarity with Kubernetes resource model (requests and limits)

## Step 1: Understand GPU Resource Model in Kubernetes

GPUs use the `nvidia.com/gpu` extended resource. Unlike CPU, you must set `requests` equal to `limits` for GPU resources - Kubernetes does not support fractional GPU allocation natively.

```yaml
resources:
  requests:
    nvidia.com/gpu: 1   # Must equal limits
    memory: "8Gi"
    cpu: "4"
  limits:
    nvidia.com/gpu: 1
    memory: "8Gi"
    cpu: "4"
```

## Step 2: Define a GPU-Enabled Deployment in Git

```yaml
# clusters/my-cluster/ml-workloads/inference-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-inference
  namespace: ml-workloads
spec:
  replicas: 2
  selector:
    matchLabels:
      app: model-inference
  template:
    metadata:
      labels:
        app: model-inference
    spec:
      # Tolerate GPU node taint
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      containers:
        - name: inference
          image: myregistry/model-server:v1.2.0
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "16Gi"
              cpu: "8"
            limits:
              nvidia.com/gpu: 1
              memory: "16Gi"
              cpu: "8"
          env:
            - name: NVIDIA_VISIBLE_DEVICES
              value: "all"
            - name: NVIDIA_DRIVER_CAPABILITIES
              value: "compute,utility"
```

## Step 3: Enforce GPU Quotas with ResourceQuota

Apply a ResourceQuota to cap GPU usage per namespace:

```yaml
# clusters/my-cluster/ml-workloads/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ml-workloads
spec:
  hard:
    # Maximum total GPUs this namespace may request
    requests.nvidia.com/gpu: "8"
    limits.nvidia.com/gpu: "8"
    # Memory cap to protect node stability
    requests.memory: "128Gi"
    limits.memory: "128Gi"
```

## Step 4: Apply a LimitRange for Default GPU Policies

```yaml
# clusters/my-cluster/ml-workloads/limit-range.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: gpu-limit-range
  namespace: ml-workloads
spec:
  limits:
    - type: Container
      # Containers requesting GPUs must request at least 1
      min:
        nvidia.com/gpu: "1"
      # Cap single container GPU usage
      max:
        nvidia.com/gpu: "4"
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/ml-workloads/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - resource-quota.yaml
  - limit-range.yaml
  - inference-deployment.yaml
---
# clusters/my-cluster/flux-kustomization-ml-workloads.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ml-workloads
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/ml-workloads
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: model-inference
      namespace: ml-workloads
```

## Step 6: Verify Resource Allocation

```bash
# Check quota usage
kubectl describe resourcequota gpu-quota -n ml-workloads

# Confirm pod GPU requests
kubectl get pods -n ml-workloads -o json | \
  jq '.items[].spec.containers[].resources'

# Check node GPU allocations
kubectl describe node <gpu-node-name> | grep -A5 "Allocated resources"
```

## Best Practices

- Always set GPU `requests` equal to `limits`; Kubernetes ignores GPU requests without matching limits.
- Use ResourceQuota per namespace to prevent a single team from monopolizing all GPU capacity.
- Add node taints (`nvidia.com/gpu=true:NoSchedule`) and workload tolerations to keep non-GPU pods off expensive GPU nodes.
- Use Kustomize overlays to apply different GPU quotas for development and production namespaces from the same base.
- Add `healthChecks` in Flux Kustomizations so deployments blocking on GPU scheduling surface as reconciliation failures immediately.

## Conclusion

Configuring GPU resource requests through Flux CD ensures that your AI/ML workloads are scheduled correctly and that resource usage is governed consistently across teams. By combining ResourceQuotas, LimitRanges, and GitOps-managed Deployments, you create a self-documenting, auditable GPU resource management system that scales with your organization.
