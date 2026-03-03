# How to Install NVIDIA GPU Drivers on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NVIDIA, GPU, Kubernetes, Machine Learning

Description: Step-by-step guide to installing NVIDIA GPU drivers on Talos Linux for running GPU-accelerated workloads like machine learning and AI training on Kubernetes.

---

Running GPU-accelerated workloads on Kubernetes has become standard for machine learning, AI training, video processing, and scientific computing. Talos Linux supports NVIDIA GPUs through system extensions that provide the kernel modules and container toolkit needed for GPU passthrough to containers. Setting this up requires a few specific steps because Talos is an immutable OS - you cannot just run an installer like you would on Ubuntu.

This guide walks through the complete process of getting NVIDIA GPUs working on Talos Linux, from installing the drivers to running your first GPU workload.

## Prerequisites

Before starting, make sure you have:

- A Talos Linux cluster (v1.5.0 or later recommended)
- Nodes with NVIDIA GPUs (any modern NVIDIA datacenter or consumer GPU)
- `talosctl` configured with access to your cluster
- `kubectl` configured with access to your Kubernetes cluster

Verify that your nodes have NVIDIA GPUs detected at the hardware level.

```bash
# Check PCI devices on a node
talosctl -n <node-ip> read /proc/bus/pci/devices | grep -i nvidia

# Or check dmesg for GPU detection
talosctl -n <node-ip> dmesg | grep -i nvidia
```

## Step 1: Add the NVIDIA Extensions

Talos uses two extensions for NVIDIA GPU support:

1. **nvidia-open-gpu-kernel-modules** - The open-source NVIDIA kernel modules
2. **nvidia-container-toolkit** - The NVIDIA container runtime hook

Both extensions need to match your Talos version and the NVIDIA driver version you want.

### Using Machine Configuration

Edit your worker node configuration to include the NVIDIA extensions.

```yaml
# worker.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules:535.129.03-v1.7.0
      - image: ghcr.io/siderolabs/nvidia-container-toolkit:535.129.03-v1.14.3
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
      - name: nvidia_drm
      - name: nvidia_modeset
```

### Using Image Factory

Alternatively, create a schematic with Image Factory.

```bash
# Create the schematic
cat > nvidia-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/nvidia-open-gpu-kernel-modules
      - siderolabs/nvidia-container-toolkit
EOF

# Submit to Image Factory
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @nvidia-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

echo "Installer: factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"
```

## Step 2: Configure Kernel Modules

The NVIDIA kernel modules need to be explicitly loaded at boot time. Add this to your machine configuration.

```yaml
machine:
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
      - name: nvidia_drm
      - name: nvidia_modeset
```

You may also want to add kernel arguments for proper GPU operation.

```yaml
machine:
  install:
    extraKernelArgs:
      - nvidia.NVreg_OpenRmEnableUnsupportedGpus=1  # For consumer GPUs
```

## Step 3: Apply Configuration and Upgrade

If you are adding NVIDIA support to existing nodes, apply the configuration and trigger an upgrade.

```bash
# Apply the updated machine config
talosctl -n <gpu-node-ip> apply-config --file worker.yaml

# Upgrade to apply the extensions
talosctl -n <gpu-node-ip> upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node to come back up
talosctl -n <gpu-node-ip> health
```

For new nodes, just apply the configuration during initial setup.

## Step 4: Verify GPU Driver Installation

After the node reboots with the NVIDIA extensions, verify everything is working.

```bash
# Check that NVIDIA modules are loaded
talosctl -n <gpu-node-ip> read /proc/modules | grep nvidia

# Expected output includes:
# nvidia_uvm
# nvidia_drm
# nvidia_modeset
# nvidia

# Check for the NVIDIA device files
talosctl -n <gpu-node-ip> ls /dev/nvidia*

# Expected output:
# /dev/nvidia0
# /dev/nvidiactl
# /dev/nvidia-uvm
# /dev/nvidia-uvm-tools

# Check GPU information
talosctl -n <gpu-node-ip> dmesg | grep -i "NVIDIA\|gpu"
```

## Step 5: Install the NVIDIA Device Plugin

The NVIDIA device plugin for Kubernetes makes GPUs discoverable as a schedulable resource.

```bash
# Install the NVIDIA device plugin using Helm
helm repo add nvdp https://nvidia.github.io/k8s-device-plugin
helm repo update

helm install nvidia-device-plugin nvdp/nvidia-device-plugin \
  --namespace nvidia-device-plugin \
  --create-namespace \
  --set runtimeClassName=nvidia
```

Alternatively, deploy with a manifest.

```yaml
# nvidia-device-plugin.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin-daemonset
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: nvidia-device-plugin-ds
  template:
    metadata:
      labels:
        name: nvidia-device-plugin-ds
    spec:
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      containers:
        - image: nvcr.io/nvidia/k8s-device-plugin:v0.14.3
          name: nvidia-device-plugin-ctr
          env:
            - name: FAIL_ON_INIT_ERROR
              value: "false"
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: device-plugin
              mountPath: /var/lib/kubelet/device-plugins
      volumes:
        - name: device-plugin
          hostPath:
            path: /var/lib/kubelet/device-plugins
```

```bash
# Apply the device plugin
kubectl apply -f nvidia-device-plugin.yaml
```

## Step 6: Create the NVIDIA RuntimeClass

Configure a RuntimeClass for NVIDIA workloads.

```yaml
# nvidia-runtime-class.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: nvidia
handler: nvidia
```

```bash
kubectl apply -f nvidia-runtime-class.yaml
```

## Step 7: Verify GPU Resources

Check that Kubernetes can see the GPUs on your nodes.

```bash
# Check node resources
kubectl describe node <gpu-node-name> | grep nvidia

# You should see something like:
# Capacity:
#   nvidia.com/gpu: 1
# Allocatable:
#   nvidia.com/gpu: 1
```

## Step 8: Run a GPU Test Workload

Deploy a test pod that uses the GPU.

```yaml
# gpu-test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  runtimeClassName: nvidia
  containers:
    - name: cuda-test
      image: nvcr.io/nvidia/cuda:12.3.1-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
  restartPolicy: Never
```

```bash
# Deploy the test pod
kubectl apply -f gpu-test-pod.yaml

# Check the output
kubectl logs gpu-test

# You should see nvidia-smi output showing your GPU
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.129.03   Driver Version: 535.129.03   CUDA Version: 12.2     |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# |===============================+======================+======================|
# |   0  Tesla V100          Off  | 00000000:00:1E.0 Off |                    0 |
# | N/A   34C    P0    24W / 250W |      0MiB / 16384MiB |      0%      Default |
# +-------------------------------+----------------------+----------------------+
```

## Running Machine Learning Workloads

With GPUs available, you can run real ML workloads. Here is an example deploying a PyTorch training job.

```yaml
# pytorch-training.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pytorch-training
spec:
  template:
    spec:
      runtimeClassName: nvidia
      containers:
        - name: training
          image: pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime
          command: ["python", "-c", "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0)}')"]
          resources:
            limits:
              nvidia.com/gpu: 1
      restartPolicy: Never
```

## Troubleshooting

If GPUs are not detected, check these common issues.

```bash
# Verify extensions are loaded
talosctl -n <gpu-node-ip> get extensions

# Check for module loading errors
talosctl -n <gpu-node-ip> dmesg | grep -i "nvidia\|error\|fail"

# Verify the device plugin is running
kubectl get pods -n kube-system | grep nvidia

# Check device plugin logs
kubectl logs -n kube-system -l name=nvidia-device-plugin-ds
```

If the modules load but `nvidia-smi` does not work in containers, make sure the NVIDIA container toolkit extension is installed and the runtime class is configured.

## Conclusion

Getting NVIDIA GPUs working on Talos Linux requires a few more steps than a traditional Linux distribution, but the result is a clean, reproducible GPU configuration that works consistently across all your nodes. The system extension approach means GPU support is versioned and declarative, making it easy to manage across a fleet of GPU nodes. Once set up, your Kubernetes cluster can schedule GPU workloads just like any other resource, opening the door to machine learning training, inference serving, and GPU-accelerated data processing at scale.
