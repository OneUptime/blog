# How to Configure GPU Scheduling on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GPU, Scheduling, Kubernetes, NVIDIA, Resource Management

Description: Configure advanced GPU scheduling policies on Talos Linux to efficiently share GPU resources across multiple workloads and teams.

---

GPU resources are expensive and often in short supply. When you are running multiple teams or workloads on a Talos Linux Kubernetes cluster with GPU nodes, simply letting Kubernetes assign GPUs on a first-come-first-served basis is not going to cut it. You need proper scheduling policies to ensure fair resource distribution, prevent starvation, and maximize GPU utilization. Talos Linux, with its clean Kubernetes integration, provides an excellent foundation for implementing these policies.

This guide covers configuring GPU scheduling on Talos Linux, including time-slicing, MIG partitioning, priority-based scheduling, resource quotas, and topology-aware placement.

## Prerequisites

You need:

- A Talos Linux cluster with NVIDIA GPU nodes
- NVIDIA device plugin installed
- NVIDIA GPU Operator (recommended) or manual GPU setup
- kubectl configured for your cluster

## Understanding GPU Scheduling Modes

There are several ways to share GPUs in Kubernetes:

1. **Exclusive access** - One GPU per pod (default behavior)
2. **Time-slicing** - Multiple pods share a GPU through time-division multiplexing
3. **MIG (Multi-Instance GPU)** - Physically partition a GPU into isolated instances (A100/H100 only)
4. **MPS (Multi-Process Service)** - Share a GPU at the CUDA level with process isolation

Each approach has tradeoffs. Exclusive access provides the best performance isolation but wastes GPU resources when workloads do not fully utilize the GPU. Time-slicing is the most flexible but provides no memory isolation. MIG gives hardware-level isolation but only works on high-end GPUs.

## Configuring GPU Time-Slicing

Time-slicing lets you oversubscribe a GPU, allowing multiple pods to share it. This is ideal for inference workloads that do not need the full GPU. Configure time-slicing through the NVIDIA device plugin:

```yaml
# gpu-time-slicing-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nvidia-device-plugin-config
  namespace: kube-system
data:
  config.yaml: |
    version: v1
    sharing:
      timeSlicing:
        renameByDefault: false
        failRequestsGreaterThanOne: false
        resources:
          - name: nvidia.com/gpu
            replicas: 4
```

This configuration makes each physical GPU appear as four virtual GPUs. A node with 2 physical GPUs will advertise 8 `nvidia.com/gpu` resources.

Update the device plugin to use this config:

```bash
# Install or upgrade the device plugin with the config
helm upgrade --install nvidia-device-plugin nvdp/nvidia-device-plugin \
  --namespace kube-system \
  --set config.name=nvidia-device-plugin-config \
  --set config.default=config.yaml
```

Verify the change:

```bash
# Check allocatable GPU resources
kubectl describe node <gpu-node> | grep nvidia.com/gpu
```

You should see the replicated count in allocatable resources.

## Per-Node Time-Slicing Configuration

Different GPU nodes might need different time-slicing configs. Use node labels and multiple configurations:

```yaml
# multi-config-time-slicing.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nvidia-device-plugin-config
  namespace: kube-system
data:
  training-nodes: |
    version: v1
    sharing:
      timeSlicing:
        resources:
          - name: nvidia.com/gpu
            replicas: 1
  inference-nodes: |
    version: v1
    sharing:
      timeSlicing:
        resources:
          - name: nvidia.com/gpu
            replicas: 8
```

Label your nodes accordingly:

```bash
# Label training nodes for exclusive GPU access
kubectl label node gpu-worker-1 nvidia.com/device-plugin.config=training-nodes

# Label inference nodes for shared GPU access
kubectl label node gpu-worker-2 nvidia.com/device-plugin.config=inference-nodes
```

## Configuring MIG Partitioning

For A100, A30, or H100 GPUs, MIG provides hardware-level GPU partitioning. Each partition gets its own memory, cache, and compute resources.

First, enable MIG on the GPU node:

```bash
# Enable MIG mode on all GPUs (requires node reboot)
talosctl -n <gpu-node-ip> -- nvidia-smi -i 0 --multi-instance-gpu 1
```

Since Talos is immutable, you need to configure this through the GPU Operator or a machine configuration patch. With the GPU Operator, create a MIG configuration:

```yaml
# mig-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: default-mig-parted-config
  namespace: gpu-operator
data:
  config.yaml: |
    version: v1
    mig-configs:
      # Split into 7 small instances
      all-1g.5gb:
        - devices: all
          mig-enabled: true
          mig-devices:
            "1g.5gb": 7

      # Mixed configuration
      mixed:
        - devices: all
          mig-enabled: true
          mig-devices:
            "3g.20gb": 1
            "2g.10gb": 1
            "1g.5gb": 2

      # Two medium instances
      all-2g.10gb:
        - devices: all
          mig-enabled: true
          mig-devices:
            "2g.10gb": 3

      # Single large instance
      all-7g.40gb:
        - devices: all
          mig-enabled: true
          mig-devices:
            "7g.40gb": 1
```

Apply a MIG profile to a node:

```bash
# Apply the mixed MIG profile to a node
kubectl label node <gpu-node> nvidia.com/mig.config=mixed --overwrite
```

Pods can then request specific MIG instance sizes:

```yaml
# pod-requesting-mig.yaml
apiVersion: v1
kind: Pod
metadata:
  name: inference-small
spec:
  containers:
    - name: app
      image: my-inference-app:latest
      resources:
        limits:
          nvidia.com/mig-1g.5gb: 1
```

## Priority-Based GPU Scheduling

Use Kubernetes PriorityClasses to ensure important workloads get GPU access first:

```yaml
# gpu-priority-classes.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: gpu-critical
value: 1000000
globalDefault: false
description: "Critical GPU workloads like production inference"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: gpu-training
value: 500000
globalDefault: false
description: "Training jobs that can be preempted by critical workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: gpu-batch
value: 100000
preemptionPolicy: Never
globalDefault: false
description: "Batch GPU workloads that never preempt others"
```

Apply to your workloads:

```yaml
# Production inference gets highest priority
spec:
  priorityClassName: gpu-critical
  containers:
    - name: inference
      resources:
        limits:
          nvidia.com/gpu: 1

# Training jobs can be preempted
spec:
  priorityClassName: gpu-training
  containers:
    - name: training
      resources:
        limits:
          nvidia.com/gpu: 1
```

## Resource Quotas for GPU

Enforce per-namespace GPU limits to ensure fair sharing:

```yaml
# gpu-quotas.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: team-alpha
spec:
  hard:
    requests.nvidia.com/gpu: "4"
    limits.nvidia.com/gpu: "4"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: team-beta
spec:
  hard:
    requests.nvidia.com/gpu: "2"
    limits.nvidia.com/gpu: "2"
```

## Topology-Aware GPU Scheduling

For workloads that need multiple GPUs, the placement of those GPUs matters. GPUs connected through NVLink or on the same PCIe switch communicate much faster than GPUs on different switches. Use the GAS (GPU-Aware Scheduling) or topology manager:

```yaml
# Configure kubelet topology manager on Talos
machine:
  kubelet:
    extraArgs:
      topology-manager-policy: best-effort
      topology-manager-scope: pod
```

Apply this patch to GPU nodes:

```bash
talosctl apply-config --patch @topology-patch.yaml --nodes <gpu-node-ip>
```

## Node Affinity for GPU Workloads

Use node affinity to direct workloads to specific GPU types:

```yaml
# workload-targeting-a100.yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: nvidia.com/gpu.product
                operator: In
                values:
                  - "NVIDIA-A100-SXM4-40GB"
                  - "NVIDIA-A100-SXM4-80GB"
  containers:
    - name: training
      resources:
        limits:
          nvidia.com/gpu: 4
```

## Monitoring GPU Scheduling

Track GPU allocation and utilization:

```bash
# View GPU allocation across the cluster
kubectl describe nodes | grep -A 5 "nvidia.com/gpu"

# Check which pods are using GPUs
kubectl get pods -A -o json | jq '.items[] | select(.spec.containers[].resources.limits["nvidia.com/gpu"] != null) | {name: .metadata.name, namespace: .metadata.namespace, gpu: .spec.containers[].resources.limits["nvidia.com/gpu"]}'
```

## Conclusion

Effective GPU scheduling on Talos Linux requires a combination of the right sharing mechanism (time-slicing, MIG, or exclusive), priority-based scheduling, resource quotas, and topology awareness. By configuring these policies thoughtfully, you can maximize GPU utilization across your cluster while ensuring that critical workloads always get the resources they need. Talos Linux's clean Kubernetes integration makes it straightforward to implement and maintain these policies.
