# How to Install K3s on NVIDIA Jetson

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, NVIDIA, Jetson, GPU, Edge AI, ARM64

Description: Learn how to install K3s on NVIDIA Jetson devices and configure GPU access for AI/ML workloads at the edge.

## Introduction

NVIDIA Jetson devices are powerful ARM64 edge computing platforms with integrated GPU capabilities (CUDA, TensorRT). Combining K3s with NVIDIA Jetson enables AI/ML inference workloads to run at the edge as containerized Kubernetes workloads. This guide covers installation on Xavier NX and Orin-class Jetson devices running JetPack 5.x or 6.x.

## Supported Jetson Devices

| Device | CPU | GPU | RAM | Best For |
|--------|-----|-----|-----|---------|
| Jetson Xavier NX | 6x Carmel ARM64 | 384-core Volta | 8/16GB | Production inference |
| Jetson AGX Orin | 12x Cortex-A78AE | 2048-core Ampere | 32/64GB | Heavy AI workloads |

## Prerequisites

- JetPack 5.x or 6.x installed on a supported Xavier- or Orin-based Jetson
- Internet connectivity (or pre-downloaded images for air-gap)
- NVIDIA Container Runtime installed (included in JetPack 5+)

## Step 1: Verify JetPack and NVIDIA Runtime

```bash
# Check the Jetson Linux / L4T release

cat /etc/nv_tegra_release

# Verify NVIDIA container runtime is available
nvidia-ctk --version

# If the CUDA toolkit is installed, verify it
command -v nvcc >/dev/null && nvcc --version

# Jetson devices do not support nvidia-smi; use tegrastats to observe GPU activity
sudo tegrastats
```

## Step 2: Enable cgroup Memory if Needed

```bash
# Check whether the memory controller is already enabled
cat /proc/cgroups | grep memory

# If the last column is 0, edit the boot config to add cgroup parameters
sudo nano /boot/extlinux/extlinux.conf

# Find the APPEND line and add if needed:
# cgroup_enable=cpuset cgroup_memory=1 cgroup_enable=memory

# Example APPEND line:
# APPEND ${cbootargs} root=/dev/mmcblk0p1 rw rootwait cgroup_enable=cpuset cgroup_memory=1 cgroup_enable=memory

# Reboot after making the change
sudo reboot
```

After reboot, verify cgroups are enabled:

```bash
cat /proc/cgroups | grep memory
# Expect 1 in the last column (enabled)
```

## Step 3: Disable Swap

```bash
# Disable swap
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Verify
free -h
```

## Step 4: Configure NVIDIA Container Runtime for containerd

K3s uses its own managed containerd configuration. If `nvidia-container-runtime` is on `PATH` when K3s starts, K3s will detect it automatically and add an `nvidia` runtime:

```bash
# Ensure the NVIDIA runtime executable is present
command -v nvidia-container-runtime

# After K3s starts in Step 5, verify that the generated config includes nvidia
sudo grep nvidia /var/lib/rancher/k3s/agent/etc/containerd/config.toml
```

If K3s does not detect it automatically, create a K3s containerd v3 template:

```bash
# Create a containerd config for K3s with NVIDIA support
sudo mkdir -p /var/lib/rancher/k3s/agent/etc/containerd/

sudo tee /var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.tmpl > /dev/null <<'EOF'
{{ template "base" . }}

[plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.'nvidia']
  runtime_type = "io.containerd.runc.v2"
[plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.'nvidia'.options]
  BinaryName = "/usr/bin/nvidia-container-runtime"
  SystemdCgroup = true
EOF
```

## Step 5: Install K3s

```bash
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
# K3s server configuration for NVIDIA Jetson
token: "JetsonClusterToken"
tls-san:
  - $(hostname -I | awk '{print $1}')
  - $(hostname)

# Kubelet configuration for Jetson
kubelet-arg:
  - "max-pods=110"
  - "kube-reserved=cpu=500m,memory=1Gi"
  - "system-reserved=cpu=500m,memory=512Mi"
  - "eviction-hard=memory.available<200Mi,nodefs.available<5%"

# Node labels for GPU workload targeting
node-label:
  - "device-type=jetson"
  - "accelerator=nvidia-gpu"
  - "nvidia.com/gpu=true"
EOF

# Install K3s
curl -sfL https://get.k3s.io | sudo sh -

# Wait for startup
sudo systemctl status k3s
```

## Step 6: Install the NVIDIA Device Plugin

The NVIDIA device plugin allows Kubernetes to schedule GPU resources:

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Create the NVIDIA device plugin DaemonSet
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.17.1/deployments/static/nvidia-device-plugin.yml

# Verify the plugin is running
kubectl -n kube-system get pods -l name=nvidia-device-plugin-ds

# Verify GPU resources are visible
kubectl get nodes -o json | jq '.items[].status.capacity["nvidia.com/gpu"]'
# Should show: "1" on a single-GPU Jetson
```

## Step 7: Deploy an AI Inference Workload

```yaml
# object-detection.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: object-detection
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: object-detection
  template:
    metadata:
      labels:
        app: object-detection
    spec:
      runtimeClassName: nvidia
      # Target Jetson nodes with GPU
      nodeSelector:
        accelerator: nvidia-gpu
      containers:
        - name: inference
          # Use an l4t-ml tag that matches your JetPack / L4T release
          image: nvcr.io/nvidia/l4t-ml:r35.3.1-py3
          command: ["sleep", "infinity"]
          # Request GPU resource
          resources:
            requests:
              cpu: "500m"
              memory: "2Gi"
              nvidia.com/gpu: 1
            limits:
              cpu: "2"
              memory: "4Gi"
              nvidia.com/gpu: 1
          volumeMounts:
            - name: dshm
              mountPath: /dev/shm
      volumes:
        - name: dshm
          emptyDir:
            medium: Memory
            sizeLimit: 1Gi
```

```bash
kubectl apply -f object-detection.yaml

# Verify the pod is running and requesting a GPU
kubectl get pods -l app=object-detection
kubectl describe pod $(kubectl get pods -l app=object-detection -o jsonpath='{.items[0].metadata.name}') | grep -A 6 Limits

# Jetson devices do not support nvidia-smi; monitor GPU activity on the host
sudo tegrastats
```

## Step 8: Configure GPU Time-Slicing (Optional)

For devices with multiple GPU workloads, use a device plugin config like the following:

```yaml
# gpu-config.yaml
version: v1
sharing:
  timeSlicing:
    failRequestsGreaterThanOne: true
    resources:
      - name: nvidia.com/gpu
        replicas: 4
```

```bash
# Redeploy the device plugin with Helm and the time-slicing config
helm repo add nvdp https://nvidia.github.io/k8s-device-plugin
helm repo update
helm upgrade -i nvdp nvdp/nvidia-device-plugin \
    --namespace nvidia-device-plugin \
    --create-namespace \
    --version 0.17.1 \
    --set-file config.map.config=gpu-config.yaml
```

## Monitoring GPU on Jetson

```bash
# Monitor GPU usage on the Jetson
sudo tegrastats
```

## Conclusion

Installing K3s on NVIDIA Jetson devices creates a powerful edge AI platform that combines Kubernetes orchestration with GPU-accelerated inference. The key steps are ensuring the NVIDIA container runtime is available to K3s, verifying cgroup memory support, and deploying the NVIDIA device plugin to expose GPU resources to workloads. Once configured, you can deploy TensorRT, CUDA, or any GPU-accelerated application as standard Kubernetes workloads with GPU resource requests.
