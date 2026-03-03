# How to Deploy NVIDIA GPU Operator on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NVIDIA, GPU Operator, Kubernetes, Machine Learning, CUDA

Description: Deploy the NVIDIA GPU Operator on Talos Linux to automate GPU driver management, device plugins, and container runtime setup for Kubernetes.

---

The NVIDIA GPU Operator simplifies the management of GPU resources in Kubernetes clusters by automating the deployment of all the software components needed to provision GPUs. Instead of manually installing drivers, container toolkits, and device plugins, the GPU Operator handles everything through Kubernetes-native operators and DaemonSets. On Talos Linux, the GPU Operator requires some additional configuration due to the immutable nature of the OS, but once set up, it provides a hands-off GPU management experience.

This guide walks through deploying the NVIDIA GPU Operator on Talos Linux, including the necessary system extensions, configuration adjustments, and verification steps.

## Prerequisites

Make sure you have:

- A Talos Linux cluster with at least one node containing an NVIDIA GPU
- talosctl installed and configured
- kubectl configured for your cluster
- Helm v3 installed
- Talos v1.5 or later (for GPU extension support)

## How the GPU Operator Works

The NVIDIA GPU Operator deploys several components:

- **NVIDIA driver container** - Compiles and loads GPU drivers (on Talos, we pre-install these via extensions)
- **NVIDIA container toolkit** - Configures the container runtime for GPU access
- **NVIDIA device plugin** - Exposes GPUs as schedulable Kubernetes resources
- **DCGM Exporter** - Provides GPU metrics for monitoring
- **GPU Feature Discovery** - Labels nodes with GPU properties
- **MIG Manager** - Manages Multi-Instance GPU partitioning

On Talos Linux, the driver container approach does not work because the filesystem is read-only. Instead, we use Talos system extensions for the drivers and let the GPU Operator manage the remaining components.

## Preparing the Talos Node

First, create a custom Talos image that includes the NVIDIA system extensions:

```bash
# Build custom Talos installer with NVIDIA extensions
docker run --rm -t -v $PWD/_out:/out \
  ghcr.io/siderolabs/imager:v1.6.0 installer \
  --system-extension-image ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules:535.129.03-v1.6.0 \
  --system-extension-image ghcr.io/siderolabs/nvidia-container-toolkit:535.129.03-v1.6.0
```

Push the installer to your registry and upgrade the GPU nodes:

```bash
# Push the custom installer image
crane push _out/installer-amd64.tar ghcr.io/your-org/talos-installer:v1.6.0-nvidia

# Upgrade your GPU node
talosctl upgrade --image ghcr.io/your-org/talos-installer:v1.6.0-nvidia \
  --nodes <gpu-node-ip>
```

## Configuring Talos for GPU Support

Apply a machine configuration patch to load the NVIDIA kernel modules and configure containerd:

```yaml
# talos-gpu-config.yaml
machine:
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
      - name: nvidia_drm
      - name: nvidia_modeset
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".containerd]
              default_runtime_name = "nvidia"
              [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
                [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia]
                  privileged_without_host_devices = false
                  runtime_type = "io.containerd.runc.v2"
                  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.nvidia.options]
                    BinaryName = "/usr/bin/nvidia-container-runtime"
      path: /etc/cri/conf.d/20-nvidia.toml
      op: create
```

Apply it:

```bash
talosctl apply-config --patch @talos-gpu-config.yaml --nodes <gpu-node-ip>
```

Verify the modules loaded successfully:

```bash
# Check kernel messages for NVIDIA initialization
talosctl -n <gpu-node-ip> dmesg | grep -i nvidia
```

## Installing the GPU Operator

Add the NVIDIA Helm repository:

```bash
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update
```

Since we are handling drivers through Talos extensions, we need to disable the driver container in the GPU Operator. Create a values file:

```yaml
# gpu-operator-values.yaml
operator:
  defaultRuntime: containerd

# Disable driver installation - handled by Talos extensions
driver:
  enabled: false

# Enable the container toolkit
toolkit:
  enabled: false  # Already installed via Talos extension

# Enable the device plugin
devicePlugin:
  enabled: true

# Enable DCGM exporter for monitoring
dcgmExporter:
  enabled: true
  serviceMonitor:
    enabled: true

# Enable GPU Feature Discovery
gfd:
  enabled: true

# Enable MIG manager (only relevant for A100/A30/H100 GPUs)
migManager:
  enabled: false

# Node Feature Discovery
nfd:
  enabled: true

# Validator
validator:
  driver:
    env:
      - name: DISABLE_DEV_CHAR_SYMLINK_CREATION
        value: "true"
```

Install the GPU Operator:

```bash
# Install the NVIDIA GPU Operator
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  -f gpu-operator-values.yaml
```

## Verifying the Installation

Check that all GPU Operator pods are running:

```bash
# View all pods in the gpu-operator namespace
kubectl get pods -n gpu-operator -w
```

You should see pods for the device plugin, DCGM exporter, GPU Feature Discovery, and the validator. Once everything is running, check that GPUs are detected:

```bash
# Check node GPU resources
kubectl describe node <gpu-node> | grep nvidia.com/gpu

# Check GPU feature labels
kubectl get node <gpu-node> -o json | jq '.metadata.labels | to_entries[] | select(.key | startswith("nvidia.com"))'
```

The GPU Feature Discovery component adds labels like `nvidia.com/gpu.product`, `nvidia.com/gpu.memory`, and `nvidia.com/cuda.driver.major` to your nodes, which are useful for scheduling specific workloads to specific GPU types.

## Running a Test Workload

Validate that GPU workloads can run:

```yaml
# gpu-validation-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-operator-test
spec:
  restartPolicy: OnFailure
  containers:
    - name: cuda-vectoradd
      image: nvidia/cuda:12.2.0-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
```

```bash
kubectl apply -f gpu-validation-pod.yaml
kubectl wait --for=condition=complete pod/gpu-operator-test --timeout=60s
kubectl logs gpu-operator-test
```

You should see the nvidia-smi output showing your GPU details.

## Configuring Multi-Instance GPU (MIG)

If you have GPUs that support MIG (A100, A30, H100), you can partition a single GPU into multiple smaller instances. Enable MIG manager in the GPU Operator values and configure MIG profiles:

```yaml
# mig-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mig-parted-config
  namespace: gpu-operator
data:
  config.yaml: |
    version: v1
    mig-configs:
      all-1g.5gb:
        - devices: all
          mig-enabled: true
          mig-devices:
            "1g.5gb": 7
      all-balanced:
        - devices: all
          mig-enabled: true
          mig-devices:
            "3g.20gb": 1
            "1g.5gb": 4
```

Label a node with the desired MIG configuration:

```bash
kubectl label node <gpu-node> nvidia.com/mig.config=all-balanced --overwrite
```

## Monitoring GPU Resources

The DCGM Exporter provides comprehensive GPU metrics. If you have Prometheus and Grafana set up, import the NVIDIA DCGM dashboard (ID: 12239) for pre-built visualizations.

Key metrics to watch:

- `DCGM_FI_DEV_GPU_UTIL` - GPU utilization percentage
- `DCGM_FI_DEV_FB_USED` - Frame buffer memory used
- `DCGM_FI_DEV_GPU_TEMP` - GPU temperature
- `DCGM_FI_DEV_POWER_USAGE` - Power consumption in watts

Set up alerts for thermal throttling and memory exhaustion:

```yaml
# gpu-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gpu-alerts
  namespace: gpu-operator
spec:
  groups:
    - name: gpu
      rules:
        - alert: GPUHighTemperature
          expr: DCGM_FI_DEV_GPU_TEMP > 85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "GPU temperature is high on {{ $labels.node }}"
        - alert: GPUMemoryExhausted
          expr: DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_FREE > 0.95
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "GPU memory nearly exhausted on {{ $labels.node }}"
```

## Upgrading the GPU Operator

When upgrading the GPU Operator, update the Helm values and run:

```bash
helm upgrade gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  -f gpu-operator-values.yaml
```

If a new NVIDIA driver version is needed, you will also need to rebuild the Talos installer with the updated extensions and upgrade the nodes.

## Conclusion

The NVIDIA GPU Operator on Talos Linux provides automated management of GPU resources in your Kubernetes cluster. While Talos's immutable design means driver installation is handled through system extensions rather than the operator's driver containers, the remaining components - device plugin, monitoring, feature discovery, and MIG management - work seamlessly. This combination gives you a robust, secure, and automated GPU infrastructure that requires minimal ongoing maintenance.
