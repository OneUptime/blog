# How to Configure Multi-GPU Scheduling with Flux Managed Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, GPU, Multi-GPU, Scheduling, MLOps, NVIDIA

Description: Configure multi-GPU scheduling policies for Flux CD managed ML workloads using node affinity, topology spread, and resource requests.

---

## Introduction

Running large ML training jobs or serving very large models requires multiple GPUs, often across multiple nodes. Kubernetes provides powerful scheduling primitives — node affinity, pod affinity, topology spread constraints, and resource requests — that control how multi-GPU workloads are placed across your cluster.

Managing these scheduling policies through Flux CD ensures consistency across environments and teams. When a data scientist needs to increase the GPU count for a training run, the change goes through a pull request and is applied automatically, with full audit history.

This guide covers configuring multi-GPU scheduling for both single-node multi-GPU and distributed multi-node workloads managed by Flux CD.

## Prerequisites

- Kubernetes cluster with multiple GPU nodes
- NVIDIA GPU Operator or device plugin installed
- Flux CD v2 bootstrapped to your Git repository
- Node labels indicating GPU count (e.g., `nvidia.com/gpu.count=4`)

## Step 1: Label GPU Nodes for Scheduling

First, label nodes with their GPU type and count to enable precise scheduling:

```bash
# Label nodes with GPU type
kubectl label node gpu-node-01 nvidia.com/gpu.product=A100-SXM4-80GB
kubectl label node gpu-node-01 nvidia.com/gpu.count="8"
kubectl label node gpu-node-02 nvidia.com/gpu.product=A100-SXM4-80GB
kubectl label node gpu-node-02 nvidia.com/gpu.count="8"
```

(The GPU Operator's Node Feature Discovery component adds these labels automatically.)

## Step 2: Configure a Single-Node Multi-GPU Deployment

```yaml
# clusters/my-cluster/multi-gpu/multi-gpu-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-serving-4gpu
  namespace: ml-workloads
spec:
  replicas: 1
  selector:
    matchLabels:
      app: llm-serving-4gpu
  template:
    metadata:
      labels:
        app: llm-serving-4gpu
    spec:
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      # Pin to nodes with at least 4 A100 GPUs
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: nvidia.com/gpu.product
                    operator: In
                    values:
                      - A100-SXM4-80GB
                  - key: nvidia.com/gpu.count
                    operator: In
                    values:
                      - "4"
                      - "8"
        # Prevent multiple replicas on same node
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: llm-serving-4gpu
              topologyKey: kubernetes.io/hostname
      containers:
        - name: vllm
          image: vllm/vllm-openai:v0.4.2
          args:
            - "--model"
            - "meta-llama/Llama-2-70b-chat-hf"
            - "--tensor-parallel-size"
            - "4"
            - "--max-model-len"
            - "4096"
          resources:
            requests:
              nvidia.com/gpu: 4
              memory: "160Gi"
              cpu: "32"
            limits:
              nvidia.com/gpu: 4
              memory: "160Gi"
              cpu: "32"
          env:
            - name: NVIDIA_VISIBLE_DEVICES
              value: "all"
```

## Step 3: Configure Topology Spread for GPU Workloads

Use topology spread constraints to distribute replicas across nodes evenly:

```yaml
# clusters/my-cluster/multi-gpu/spread-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inference-spread
  namespace: ml-workloads
spec:
  replicas: 4
  selector:
    matchLabels:
      app: inference-spread
  template:
    metadata:
      labels:
        app: inference-spread
    spec:
      topologySpreadConstraints:
        # Spread evenly across nodes
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: inference-spread
        # Spread across availability zones
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: inference-spread
      containers:
        - name: inference
          image: myregistry/inference:v2.1.0
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "16Gi"
              cpu: "8"
            limits:
              nvidia.com/gpu: 1
              memory: "16Gi"
              cpu: "8"
```

## Step 4: Configure a Multi-Node Training Job

```yaml
# clusters/my-cluster/multi-gpu/training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: distributed-training
  namespace: ml-workloads
spec:
  completions: 4        # Total workers
  parallelism: 4        # Run all workers simultaneously
  completionMode: Indexed
  template:
    spec:
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      # Spread workers across different nodes
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    job-name: distributed-training
                topologyKey: kubernetes.io/hostname
      restartPolicy: OnFailure
      containers:
        - name: trainer
          image: myregistry/trainer:v1.0.0
          env:
            - name: WORLD_SIZE
              value: "4"
            - name: JOB_COMPLETION_INDEX
              valueFrom:
                fieldRef:
                  fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
          resources:
            requests:
              nvidia.com/gpu: 2
              memory: "64Gi"
              cpu: "16"
            limits:
              nvidia.com/gpu: 2
              memory: "64Gi"
              cpu: "16"
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/flux-kustomization-multi-gpu.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: multi-gpu-workloads
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/multi-gpu
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Verify Scheduling

```bash
# Check pod placement
kubectl get pods -n ml-workloads -o wide

# Confirm GPU allocation per node
kubectl describe node gpu-node-01 | grep -A10 "Allocated resources"

# View GPU usage
kubectl get pods -n ml-workloads -o json | \
  jq '.items[].spec.containers[].resources.requests["nvidia.com/gpu"]'
```

## Best Practices

- Use `requiredDuringSchedulingIgnoredDuringExecution` node affinity for workloads that absolutely need specific GPU types, and `preferred` for workloads that benefit but can fall back.
- Set `podAntiAffinity` with `requiredDuringScheduling` for HA inference deployments to prevent multiple replicas landing on the same node.
- Combine topology spread constraints with zone-level spreading to protect inference deployments from zone-level failures.
- Use Indexed Jobs for distributed training to simplify worker rank assignment via `JOB_COMPLETION_INDEX`.
- Monitor inter-GPU communication with NVIDIA NCCL tests after scheduling to confirm NVLink or InfiniBand connectivity between co-located workers.

## Conclusion

Configuring multi-GPU scheduling through Flux CD gives ML platform teams precise control over how GPU workloads are placed across the cluster. Scheduling policies become code — reviewed, tested, and automatically applied — eliminating the manual coordination overhead that typically accompanies large-scale GPU cluster management.
