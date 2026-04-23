# How to Schedule GPU Workloads in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, GPU, Scheduling, Kubernetes, Machine-learning

Description: Learn how to effectively schedule GPU workloads in Rancher using node selectors, taints, and resource quotas.

## Introduction

Scheduling GPU workloads effectively requires understanding Kubernetes scheduling mechanisms and GPU-specific constraints. This guide covers how to ensure your GPU jobs land on the right nodes with the right resources.

## Node Selection Strategies

### Using nodeSelector

```yaml
# Basic GPU node selection

apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload
spec:
  nodeSelector:
    nvidia.com/gpu.present: "true"
    nvidia.com/gpu.product: "NVIDIA-A100-SXM4-80GB"  # Specific GPU type
  containers:
  - name: trainer
    image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
    resources:
      limits:
        nvidia.com/gpu: 1
```

### Using nodeAffinity (Advanced)

```yaml
# Prefer A100 GPUs, fall back to V100
apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload-preferred
spec:
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: nvidia.com/gpu.product
            operator: In
            values: ["NVIDIA-A100-SXM4-80GB"]
      - weight: 50
        preference:
          matchExpressions:
          - key: nvidia.com/gpu.product
            operator: In
            values: ["Tesla-V100-SXM2-32GB"]
  containers:
  - name: trainer
    image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
    resources:
      limits:
        nvidia.com/gpu: 1
```

## Configuring Taints and Tolerations

```bash
# Taint GPU nodes to reserve for GPU workloads only
kubectl taint nodes gpu-node-01 nvidia.com/gpu=present:NoSchedule
kubectl taint nodes gpu-node-02 nvidia.com/gpu=present:NoSchedule
```

```yaml
# Workload must tolerate the taint to schedule on GPU nodes
spec:
  tolerations:
  - key: nvidia.com/gpu
    operator: Exists
    effect: NoSchedule
  containers:
  - name: trainer
    resources:
      limits:
        nvidia.com/gpu: 2
```

## GPU Resource Quotas

```yaml
# Limit GPU usage per namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ml-team
spec:
  hard:
    requests.nvidia.com/gpu: "8"    # Max 8 GPUs requested
```

## Priority Classes for GPU Jobs

```yaml
# high-priority-training.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: gpu-training-high
value: 1000
globalDefault: false
description: "High priority GPU training jobs"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: gpu-inference-standard
value: 500
description: "Standard priority GPU inference"
```

```yaml
# Apply priority to a job
apiVersion: batch/v1
kind: Job
metadata:
  name: priority-training
spec:
  template:
    spec:
      priorityClassName: gpu-training-high
      restartPolicy: Never
      containers:
      - name: trainer
        image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
        resources:
          limits:
            nvidia.com/gpu: 4
```

## Multi-GPU Jobs with MPI

```yaml
# distributed-training.yaml - MPI Operator required
apiVersion: kubeflow.org/v2beta1
kind: MPIJob
metadata:
  name: distributed-gpu-training
spec:
  slotsPerWorker: 4            # 4 GPUs per worker
  runPolicy:
    cleanPodPolicy: Running
  mpiReplicaSpecs:
    Launcher:
      replicas: 1
      template:
        spec:
          containers:
          - name: mpi-launcher
            image: horovod/horovod:latest
            command: ["mpirun", "--allow-run-as-root", "-np", "8", "python", "train.py"]
    Worker:
      replicas: 2              # 2 workers x 4 GPUs = 8 total GPUs
      template:
        spec:
          containers:
          - name: mpi-worker
            image: horovod/horovod:latest
            resources:
              limits:
                nvidia.com/gpu: 4
          nodeSelector:
            nvidia.com/gpu.present: "true"
          tolerations:
          - key: nvidia.com/gpu
            operator: Exists
            effect: NoSchedule
```

## Monitoring Scheduled GPU Jobs

```bash
# Check which nodes are running GPU workloads
kubectl get pods -A -o=jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.nodeName}{"\t"}{.spec.containers[*].resources.limits.nvidia\.com/gpu}{"\n"}{end}' | awk -F'\t' '$4 != ""'

# View GPU utilization from the NVIDIA driver DaemonSet
kubectl exec -it -n gpu-operator ds/nvidia-driver-daemonset -- nvidia-smi
```

## Conclusion

Effective GPU scheduling in Rancher combines node selection, taints/tolerations, resource quotas, and priority classes. These mechanisms together ensure GPU resources are allocated to the right workloads efficiently, preventing resource starvation and enabling fair sharing across teams.
