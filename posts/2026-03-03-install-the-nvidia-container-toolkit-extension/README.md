# How to Install the NVIDIA Container Toolkit Extension

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NVIDIA, GPU, Container Toolkit, Kubernetes, Machine Learning, System Extensions

Description: Complete guide to installing the NVIDIA Container Toolkit extension on Talos Linux for GPU-accelerated workloads in Kubernetes.

---

Running GPU-accelerated workloads on Kubernetes requires the NVIDIA Container Toolkit to be installed on the host. On traditional Linux distributions, you would install the NVIDIA drivers and container toolkit packages through the package manager. On Talos Linux, this is handled through system extensions. This guide covers the complete setup process for getting NVIDIA GPUs working with Talos Linux.

## Prerequisites

Before starting, you need:

1. **NVIDIA GPU hardware** - Physical or passthrough GPU available to the node
2. **Compatible GPU** - Check NVIDIA's compatibility list for supported GPUs
3. **Talos Linux node** - Running a version that has NVIDIA extension support
4. **Container registry access** - To pull the extension images

## Understanding the NVIDIA Extension Stack

Getting NVIDIA GPUs working on Talos requires multiple extensions that work together:

1. **NVIDIA kernel modules** - The GPU drivers that interface with the hardware
2. **NVIDIA Container Toolkit** - Tools that allow containers to access GPUs
3. **NVIDIA device plugin** (Kubernetes level) - Exposes GPUs as schedulable resources

```
Hardware (GPU) --> NVIDIA Kernel Modules --> Container Toolkit --> Device Plugin --> Pod
```

The extensions handle the first two layers. The device plugin runs as a Kubernetes DaemonSet.

## Step 1: Build or Get the Installer Image

You need a Talos installer image that includes both the NVIDIA kernel modules and the container toolkit. Use the Image Factory:

```bash
# Create a schematic with NVIDIA extensions
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/nvidia-container-toolkit",
          "siderolabs/nvidia-open-gpu-kernel-modules"
        ]
      }
    }
  }'

# The response gives you a schematic ID
# Use it: factory.talos.dev/installer/<schematic-id>:v1.7.0
```

For proprietary NVIDIA drivers (needed for older GPUs), use the non-free modules instead:

```bash
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/nvidia-container-toolkit",
          "siderolabs/nonfree-kmod-nvidia"
        ]
      }
    }
  }'
```

## Step 2: Install or Upgrade the Node

### Fresh Installation

Use the custom installer image when provisioning the node:

```yaml
# machine-config.yaml for GPU node
machine:
  type: worker
  install:
    image: factory.talos.dev/installer/<schematic-id>:v1.7.0
    disk: /dev/sda
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
      - name: nvidia_drm
      - name: nvidia_modeset
```

### Upgrading an Existing Node

```bash
# Upgrade with NVIDIA extensions
talosctl -n 192.168.1.20 upgrade \
  --image factory.talos.dev/installer/<schematic-with-nvidia>:v1.7.0
```

## Step 3: Configure Kernel Modules

The NVIDIA kernel modules need to be explicitly loaded. Add them to your machine configuration:

```bash
talosctl -n 192.168.1.20 patch machineconfig -p '[
  {
    "op": "add",
    "path": "/machine/kernel/modules",
    "value": [
      {"name": "nvidia"},
      {"name": "nvidia_uvm"},
      {"name": "nvidia_drm"},
      {"name": "nvidia_modeset"}
    ]
  }
]'
```

## Step 4: Configure the Container Runtime

The NVIDIA Container Toolkit needs to be registered as a runtime with containerd. Add this to your machine configuration:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".containerd]
              default_runtime_name = "nvidia"
              [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
                [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia]
                  privileged_without_host_devices = false
                  runtime_engine = ""
                  runtime_root = ""
                  runtime_type = "io.containerd.runc.v2"
                  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia.options]
                    BinaryName = "/usr/bin/nvidia-container-runtime"
      path: /etc/cri/conf.d/20-nvidia.toml
      permissions: 0644
      op: create
```

Apply this configuration:

```bash
talosctl -n 192.168.1.20 patch machineconfig -p '[
  {
    "op": "add",
    "path": "/machine/files/-",
    "value": {
      "content": "[plugins]\n  [plugins.\"io.containerd.grpc.v1.cri\"]\n    [plugins.\"io.containerd.grpc.v1.cri\".containerd]\n      default_runtime_name = \"nvidia\"\n      [plugins.\"io.containerd.grpc.v1.cri\".containerd.runtimes]\n        [plugins.\"io.containerd.grpc.v1.cri\".containerd.runtimes.nvidia]\n          privileged_without_host_devices = false\n          runtime_engine = \"\"\n          runtime_root = \"\"\n          runtime_type = \"io.containerd.runc.v2\"\n          [plugins.\"io.containerd.grpc.v1.cri\".containerd.runtimes.nvidia.options]\n            BinaryName = \"/usr/bin/nvidia-container-runtime\"\n",
      "path": "/etc/cri/conf.d/20-nvidia.toml",
      "permissions": 420,
      "op": "create"
    }
  }
]'
```

## Step 5: Verify GPU Detection

After the node boots with the NVIDIA extensions, verify the GPU is detected:

```bash
# Check for NVIDIA kernel modules
talosctl -n 192.168.1.20 read /proc/modules | grep nvidia

# Check dmesg for NVIDIA driver messages
talosctl -n 192.168.1.20 dmesg | grep -i nvidia

# Verify the extension is installed
talosctl -n 192.168.1.20 get extensions | grep nvidia
```

You should see the NVIDIA modules loaded and messages about GPU detection in dmesg.

## Step 6: Deploy the NVIDIA Device Plugin

The NVIDIA device plugin runs as a Kubernetes DaemonSet and registers GPUs as schedulable resources:

```bash
# Deploy the NVIDIA device plugin
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/main/deployments/static/nvidia-device-plugin.yml
```

Or using Helm:

```bash
helm repo add nvdp https://nvidia.github.io/k8s-device-plugin
helm repo update

helm install nvidia-device-plugin nvdp/nvidia-device-plugin \
  --namespace kube-system \
  --set runtimeClassName=nvidia
```

Verify that GPUs are registered:

```bash
# Check node GPU resources
kubectl describe node gpu-worker-1 | grep -A5 "Capacity:"

# You should see something like:
# nvidia.com/gpu: 1
```

## Step 7: Test GPU Access

Deploy a test pod that uses the GPU:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  restartPolicy: OnFailure
  containers:
    - name: cuda-test
      image: nvidia/cuda:12.3.1-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
```

```bash
# Deploy the test pod
kubectl apply -f gpu-test.yaml

# Check the output
kubectl logs gpu-test

# You should see nvidia-smi output showing the GPU
```

## Running ML Workloads

With the GPU set up, you can run machine learning workloads:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ml-training
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: training
          image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
          command: ["python", "-c", "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0)}')"]
          resources:
            limits:
              nvidia.com/gpu: 1
```

## Multi-GPU Nodes

For nodes with multiple GPUs, the device plugin automatically detects all GPUs. You can request multiple GPUs in your pod spec:

```yaml
resources:
  limits:
    nvidia.com/gpu: 4  # Request 4 GPUs
```

## Troubleshooting

### GPU Not Detected

```bash
# Check kernel modules
talosctl -n 192.168.1.20 read /proc/modules | grep nvidia

# If empty, check dmesg for errors
talosctl -n 192.168.1.20 dmesg | grep -i "nvidia\|gpu\|error"

# Verify the correct extension was installed
talosctl -n 192.168.1.20 get extensions -o yaml
```

### Container Cannot Access GPU

```bash
# Check containerd configuration
talosctl -n 192.168.1.20 read /etc/cri/conf.d/20-nvidia.toml

# Check containerd logs
talosctl -n 192.168.1.20 logs containerd | grep -i nvidia

# Verify the NVIDIA runtime is registered
talosctl -n 192.168.1.20 logs containerd | grep runtime
```

### Device Plugin Issues

```bash
# Check device plugin pods
kubectl get pods -n kube-system -l app=nvidia-device-plugin

# Check device plugin logs
kubectl logs -n kube-system -l app=nvidia-device-plugin

# Verify node resources
kubectl describe node gpu-worker-1 | grep nvidia
```

### Driver Version Mismatch

The NVIDIA driver version in the extension must be compatible with the CUDA version used by your containers. Check compatibility:

```bash
# Check driver version on the node
talosctl -n 192.168.1.20 dmesg | grep "NVIDIA.*Module"

# Compare with CUDA compatibility matrix
# https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/index.html
```

## Node Labels and Taints

Label your GPU nodes for scheduling:

```bash
# Label GPU nodes
kubectl label node gpu-worker-1 nvidia.com/gpu.present=true
kubectl label node gpu-worker-1 node-role.kubernetes.io/gpu=true

# Optionally taint GPU nodes to prevent non-GPU workloads
kubectl taint nodes gpu-worker-1 nvidia.com/gpu=present:NoSchedule
```

Then use nodeSelector or tolerations in your GPU workloads:

```yaml
spec:
  nodeSelector:
    nvidia.com/gpu.present: "true"
  tolerations:
    - key: nvidia.com/gpu
      operator: Equal
      value: present
      effect: NoSchedule
```

Getting NVIDIA GPUs working on Talos Linux requires coordinating several components - kernel modules, container runtime configuration, and Kubernetes device plugins. But once the setup is complete, GPU workloads run reliably with the same security and immutability benefits that Talos provides for the rest of your infrastructure.
