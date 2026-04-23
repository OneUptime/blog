# How to Configure NVIDIA GPU Support in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, NVIDIA, GPU, Kubernetes, Machine-learning

Description: Complete guide to enabling NVIDIA GPU support in Rancher clusters for machine learning and GPU-accelerated workloads.

## Introduction

NVIDIA GPUs dramatically accelerate machine learning, scientific computing, and graphics workloads. Rancher makes it straightforward to configure GPU support across your Kubernetes clusters using the NVIDIA GPU Operator.

## Prerequisites

- Rancher v2.6+
- Kubernetes cluster with NVIDIA GPU nodes
- Nodes running Ubuntu 20.04/22.04 or RHEL 8/9
- Containerd with CDI/NRI support if using `cdi.nriPluginEnabled=true` (v1.7.30+, v2.1.x, or v2.2.x)
- NVIDIA GPUs: Tesla, A100, H100, RTX series

## Step 1: Verify GPU Hardware

```bash
# Check GPU is detected by the OS

lspci | grep -i nvidia

# Expected output example:
# 00:1e.0 3D controller: NVIDIA Corporation A100 80GB PCIe [10de:20b5]

# Check NVIDIA driver (if pre-installed)
nvidia-smi
```

## Step 2: Label GPU Nodes

```bash
# Optional: label GPU nodes so you can target dedicated workloads
kubectl label nodes gpu-node-01 accelerator=nvidia-gpu

# Verify label
kubectl get nodes -l accelerator=nvidia-gpu
```

## Step 3: Install NVIDIA GPU Operator via Helm

```bash
# Add NVIDIA Helm repository
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

# Install GPU Operator
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --wait \
  --version=v26.3.1 \
  --set cdi.nriPluginEnabled=true
```

## Step 4: Verify Node Feature Discovery

```bash
# GPU Operator deploys NFD by default. Verify the NFD pods are running.
kubectl get pods -n gpu-operator | grep node-feature-discovery

# Verify NVIDIA GPU nodes were discovered by NFD
kubectl get nodes -l feature.node.kubernetes.io/pci-10de.present=true
```

## Step 5: Verify GPU Operator Installation

```bash
# Check all GPU operator pods are running
kubectl get pods -n gpu-operator

# Expected pods:
# gpu-operator-xxx                          Running
# nvidia-driver-daemonset-xxx               Running  (on each GPU node)
# nvidia-container-toolkit-daemonset-xxx    Running  (on each GPU node)
# nvidia-device-plugin-daemonset-xxx        Running  (on each GPU node)
# gpu-feature-discovery-xxx                 Running  (on each GPU node)
# nvidia-dcgm-exporter-xxx                  Running  (on each GPU node)

# Check GPU is available as a resource
kubectl get nodes -o json | jq '.items[] | {
  name: .metadata.name,
  gpus: .status.allocatable["nvidia.com/gpu"]
}'
```

## Step 6: Test GPU Access

```yaml
# cuda-vectoradd.yaml
apiVersion: v1
kind: Pod
metadata:
  name: cuda-vectoradd
spec:
  restartPolicy: OnFailure
  containers:
  - name: cuda-vectoradd
    image: nvcr.io/nvidia/k8s/cuda-sample:vectoradd-cuda11.7.1-ubuntu20.04
    resources:
      limits:
        nvidia.com/gpu: 1
```

```bash
kubectl apply -f cuda-vectoradd.yaml
kubectl logs pod/cuda-vectoradd
# Should show a successful vectorAdd run with `Test PASSED`
```

## Step 7: RuntimeClass Considerations

Current GPU Operator releases use CDI by default. When you install the operator with `cdi.nriPluginEnabled=true` on Rancher/RKE2, you do not need to create a `RuntimeClass` or set `runtimeClassName: nvidia` in your pod specs.

## Step 8: Deploy GPU-Accelerated Workload

```yaml
# ml-training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ml-training
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: trainer
        image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
        command: ["python", "-c"]
        args:
        - |
          import torch
          assert torch.cuda.is_available(), "CUDA is not available"
          device = "cuda"
          model = torch.nn.Linear(1024, 1024).to(device)
          x = torch.randn(256, 1024, device=device)
          y = torch.randn(256, 1024, device=device)
          optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
          for _ in range(5):
              optimizer.zero_grad()
              loss = torch.nn.functional.mse_loss(model(x), y)
              loss.backward()
              optimizer.step()
          print("Training step completed on", torch.cuda.get_device_name(0))
        resources:
          limits:
            nvidia.com/gpu: 1
            memory: "16Gi"
            cpu: "4"
          requests:
            nvidia.com/gpu: 1
            memory: "8Gi"
            cpu: "2"
```

## Monitoring GPU Usage

```bash
# View GPU metrics via DCGM exporter
kubectl port-forward svc/nvidia-dcgm-exporter   -n gpu-operator 9400:9400 &

curl -s http://localhost:9400/metrics | grep -E "DCGM_FI_DEV_GPU_UTIL|DCGM_FI_DEV_MEM_COPY_UTIL"
```

## Conclusion

NVIDIA GPU support in Rancher enables powerful GPU-accelerated workloads with minimal configuration. The GPU Operator handles driver installation, device plugin configuration, and monitoring setup automatically. Once configured, requesting GPUs in Kubernetes workloads is as simple as adding resource limits to your pod specifications.
