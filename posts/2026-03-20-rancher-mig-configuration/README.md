# How to Configure MIG (Multi-Instance GPU) in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, NVIDIA, MIG, GPU, Kubernetes, A100

Description: Guide to configuring NVIDIA Multi-Instance GPU (MIG) technology on A100 and H100 GPUs in Rancher for workload isolation.

## Introduction

NVIDIA Multi-Instance GPU (MIG) technology allows a single A100 or H100 GPU to be partitioned into up to 7 independent GPU instances, each with dedicated memory and compute resources. This guide covers MIG configuration in Rancher.

## Common MIG Profiles Available on A100 80GB

| Profile | GPU Slices | Memory | Max Instances |
|---------|-----------|--------|---------------|
| 1g.10gb | 1/7 | 10 GB | 7 |
| 2g.20gb | 2/7 | 20 GB | 3 |
| 3g.40gb | 3/7 | 40 GB | 2 |
| 4g.40gb | 4/7 | 40 GB | 1 |
| 7g.80gb | 7/7 | 80 GB | 1 |

## Step 1: Enable MIG on GPU Nodes

```bash
# SSH to GPU node

ssh admin@gpu-node-01

# Enable MIG mode on the GPU
sudo nvidia-smi -i 0 -mig 1
# If MIG mode is reported as pending enable, reboot the node
# sudo reboot

# After reboot, verify MIG is enabled
nvidia-smi -i 0 --query-gpu=name,mig.mode.current --format=csv
# Output: NVIDIA A100 80GB PCIe, Enabled
```

## Step 2: Configure MIG Profiles

```bash
# Create MIG instances (all-1g.10gb = 7 instances)
sudo nvidia-smi mig -cgi 1g.10gb,1g.10gb,1g.10gb,1g.10gb,1g.10gb,1g.10gb,1g.10gb -i 0 -C

# Mixed configuration example
sudo nvidia-smi mig -cgi 3g.40gb,2g.20gb,1g.10gb,1g.10gb -i 0 -C

# List created instances
sudo nvidia-smi mig -lgi -i 0
```

## Step 3: Configure GPU Operator for MIG

```yaml
# gpu-operator-mig-values.yaml
mig:
  strategy: mixed    # use 'single' when every GPU on a node will use the same profile

migManager:
  enabled: true
  config:
    name: mig-config
```

## Step 4: MIG ConfigMap

```yaml
# mig-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mig-config
  namespace: gpu-operator
data:
  config.yaml: |
    version: v1
    mig-configs:
      all-disabled:
        - devices: all
          mig-enabled: false
      
      all-1g.10gb:
        - devices: all
          mig-enabled: true
          mig-devices:
            1g.10gb: 7
      
      all-balanced:
        - devices: all
          mig-enabled: true
          mig-devices:
            1g.10gb: 2
            2g.20gb: 1
            3g.40gb: 1
      
      custom-mix:
        - devices: [0, 1]         # First two GPUs
          mig-enabled: true
          mig-devices:
            1g.10gb: 4
            2g.20gb: 1
        - devices: [2, 3]         # Last two GPUs
          mig-enabled: true
          mig-devices:
            3g.40gb: 2
```

```bash
kubectl apply -f mig-config.yaml
```

## Step 5: Label Nodes for MIG Profile

```bash
# Apply MIG profile to a node using label
kubectl label node gpu-node-01   nvidia.com/mig.config=all-1g.10gb --overwrite

# The MIG manager will apply this configuration automatically
kubectl get pods -n gpu-operator -l app=nvidia-mig-manager -w
```

## Step 6: Use MIG Resources in Workloads

```yaml
# mig-workload.yaml
apiVersion: v1
kind: Pod
metadata:
  name: mig-inference-job
spec:
  nodeSelector:
    nvidia.com/gpu.present: "true"
  tolerations:
  - key: nvidia.com/gpu
    operator: Exists
    effect: NoSchedule
  containers:
  - name: inference
    image: nvcr.io/nvidia/tritonserver:23.09-py3
    resources:
      limits:
        # With mig.strategy=mixed, request a specific MIG slice
        nvidia.com/mig-1g.10gb: 1    # 10GB MIG instance
        # Or larger instances:
        # nvidia.com/mig-3g.40gb: 1
      requests:
        nvidia.com/mig-1g.10gb: 1
```

## Step 7: Verify MIG Allocation

```bash
# Check available MIG resources per node
kubectl get nodes -o json | jq '.items[] | {
  name: .metadata.name,
  mig_1g: .status.allocatable["nvidia.com/mig-1g.10gb"],
  mig_2g: .status.allocatable["nvidia.com/mig-2g.20gb"],
  mig_3g: .status.allocatable["nvidia.com/mig-3g.40gb"]
}'

# Monitor MIG instance usage
nvidia-smi mig -lgi
nvidia-smi mig -lci

# Check GPU operator handles MIG correctly
kubectl logs -n gpu-operator -l app=nvidia-mig-manager -c nvidia-mig-manager
```

## Conclusion

MIG partitioning enables multiple teams to share high-end NVIDIA GPUs with guaranteed resource isolation. For A100 and H100 deployments, MIG provides a cost-effective way to serve many smaller inference workloads simultaneously or run multiple isolated experiments. The GPU Operator's MIG Manager automates profile configuration based on Kubernetes node labels.
