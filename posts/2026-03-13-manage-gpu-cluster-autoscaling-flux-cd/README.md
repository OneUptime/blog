# How to Manage GPU Cluster Autoscaling with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, GPU, Cluster Autoscaler, Autoscaling, MLOps, Cost Optimization

Description: Configure GPU cluster autoscaling for ML workloads managed by Flux CD to scale GPU node pools on demand and reduce idle infrastructure costs.

---

## Introduction

GPU instances are expensive. Running a cluster with a fixed number of GPU nodes means either paying for idle capacity during low-traffic periods or running out of capacity during peak training or inference demand. Kubernetes Cluster Autoscaler dynamically adjusts node pool sizes based on pending pod resource requests, scaling up when GPUs are needed and down when they are idle.

Managing the Cluster Autoscaler configuration through Flux CD ensures your autoscaling policies, node group settings, and scale-down thresholds are version-controlled. Teams can propose scaling changes as pull requests, review their cost implications, and apply them through the standard GitOps pipeline.

This guide covers deploying and configuring the Kubernetes Cluster Autoscaler for GPU node pools using Flux CD on a cloud Kubernetes platform (GKE, EKS, or AKS).

## Prerequisites

- A managed Kubernetes cluster (GKE, EKS, or AKS) with GPU node pool autoscaling enabled at the cloud provider level
- Flux CD v2 bootstrapped to your Git repository
- Cloud provider IAM permissions for the Cluster Autoscaler to manage node groups

## Step 1: Create the Namespace and RBAC

```yaml
# clusters/my-cluster/cluster-autoscaler/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: kube-system
  # Cluster Autoscaler is typically deployed in kube-system
---
# clusters/my-cluster/cluster-autoscaler/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  annotations:
    # GKE Workload Identity annotation
    iam.gke.io/gcp-service-account: cluster-autoscaler@my-project.iam.gserviceaccount.com
```

## Step 2: Deploy Cluster Autoscaler via HelmRelease

```yaml
# clusters/my-cluster/cluster-autoscaler/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: autoscaler
  namespace: flux-system
spec:
  interval: 12h
  url: https://kubernetes.github.io/autoscaler
---
# clusters/my-cluster/cluster-autoscaler/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: cluster-autoscaler
      version: "9.57.*"
      sourceRef:
        kind: HelmRepository
        name: autoscaler
        namespace: flux-system
      interval: 12h
  values:
    fullnameOverride: cluster-autoscaler
    # Cloud provider configuration
    cloudProvider: gce
    # GPU node groups to manage
    autoDiscovery:
      clusterName: my-gpu-cluster
    # Cluster Autoscaler command-line flags
    extraArgs:
      # Scale down after 10 minutes of inactivity
      scale-down-unneeded-time: 10m
      # Delay scale-down after scale-up to avoid thrashing
      scale-down-delay-after-add: 15m
      # Node CPU/memory request utilization threshold for scale-down
      scale-down-utilization-threshold: "0.3"
      # Avoid scaling down nodes that run non-DaemonSet kube-system pods
      skip-nodes-with-system-pods: "true"
      # Balance similar node groups
      balance-similar-node-groups: "true"
      # Use the priority expander for multi-pool clusters
      expander: priority
    # Expander strategy for multi-pool clusters
    expanderPriorities:
      30:
        - ".*t4.*"
        - ".*n1-standard-8-gpu.*"
      20:
        - ".*a2-highgpu-4g.*"
      10:
        - ".*a3-highgpu-8g.*"
    resources:
      requests:
        cpu: 100m
        memory: 600Mi
      limits:
        cpu: 100m
        memory: 600Mi
    rbac:
      serviceAccount:
        create: false
        name: cluster-autoscaler
```

## Step 3: Create Priority Classes for GPU Workloads

```yaml
# clusters/my-cluster/cluster-autoscaler/priority-classes.yaml
# High priority for production inference scheduling and preemption
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: gpu-inference-critical
value: 1000000
globalDefault: false
description: "Critical GPU inference workloads - preferred during scheduling and preemption"
---
# Medium priority for training jobs (can be evicted if needed)
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: gpu-training-preemptible
value: 100
globalDefault: false
description: "Preemptible GPU training jobs - can be evicted during scale-down"
```

## Step 4: Annotate Training Pods as Safe to Evict

```yaml
# In your training job template, add this annotation so the
# autoscaler can reclaim nodes by evicting training pods:
# clusters/my-cluster/training-jobs/pytorch-job.yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: training-job
  namespace: ml-training
spec:
  pytorchReplicaSpecs:
    Worker:
      template:
        metadata:
          annotations:
            # Allow cluster autoscaler to evict this pod
            cluster-autoscaler.kubernetes.io/safe-to-evict: "true"
        spec:
          priorityClassName: gpu-training-preemptible
          containers:
            - name: trainer
              image: nvcr.io/nvidia/pytorch:24.01-py3
              # ... training configuration
              resources:
                limits:
                  nvidia.com/gpu: 1
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/flux-kustomization-autoscaler.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-autoscaler
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/cluster-autoscaler
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cluster-autoscaler
      namespace: kube-system
```

## Step 6: Verify Autoscaling Behavior

```bash
# Check autoscaler status
flux get kustomizations cluster-autoscaler
kubectl get deployment cluster-autoscaler -n kube-system

# View autoscaler decisions in logs
kubectl logs -n kube-system deployment/cluster-autoscaler --tail=50

# Watch node pool scale-up when GPU pod is pending
kubectl apply -f gpu-workload.yaml
kubectl get nodes -l cloud.google.com/gke-accelerator -w

# Check autoscaler status ConfigMap
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml
```

## Best Practices

- Set `scale-down-unneeded-time` to at least 10 minutes to avoid prematurely terminating GPU nodes that are briefly idle between training runs.
- Use `safe-to-evict: "true"` annotations on training pods and `safe-to-evict: "false"` on inference pods to give the autoscaler clear guidance.
- Configure priority classes to prefer inference workloads during scheduling and preemption, and use PodDisruptionBudgets plus `safe-to-evict: "false"` when inference pods must not be evicted during scale-down.
- Use the priority expander strategy to prefer cheaper GPU types (T4) for development and reserve H100/A100 nodes for production inference.
- Monitor autoscaler logs with a Loki/Grafana stack to detect and alert on failed scale-up events (e.g., quota exceeded).

## Conclusion

Managing GPU cluster autoscaling with Flux CD gives your ML platform team a cost-efficient, reproducible approach to GPU capacity management. Autoscaling policies are version-controlled, scale events are traceable, and changes flow through the same GitOps pipeline as your application deployments - eliminating the manual work of resizing GPU node pools and reducing idle GPU costs significantly.
