# How to Set Up GPU Workloads on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GPU, Kubernetes, NVIDIA, Machine Learning, CUDA

Description: Learn how to configure Talos Linux to run GPU-accelerated workloads in Kubernetes, including driver installation, device plugins, and scheduling.

---

Running GPU workloads on Kubernetes has become essential for machine learning training, inference, video transcoding, and scientific computing. Talos Linux supports GPU passthrough to containers, but it requires some specific configuration since Talos does not have a traditional package manager or shell access for installing drivers. Everything is handled through system extensions and machine configuration, which keeps the immutable nature of the OS intact.

This guide covers the end-to-end process of setting up GPU workloads on Talos Linux, from installing NVIDIA drivers as system extensions to running your first GPU-accelerated pod.

## Prerequisites

You need:

- A Talos Linux cluster with at least one node that has an NVIDIA GPU
- talosctl installed and configured
- kubectl configured for your cluster
- The Talos Linux version that matches available GPU extensions

## Understanding GPU Support in Talos

Talos Linux handles GPU drivers differently from traditional Linux distributions. Instead of installing drivers through apt or yum, Talos uses system extensions that are baked into the node image or loaded at boot time. This approach ensures that the GPU drivers are always consistent with the kernel version and that the immutable nature of the OS is preserved.

The three components you need are:

1. NVIDIA kernel modules (loaded through Talos system extensions)
2. NVIDIA container toolkit (to make GPUs visible inside containers)
3. NVIDIA device plugin for Kubernetes (to schedule GPU workloads)

## Installing NVIDIA Drivers as System Extensions

Talos provides official NVIDIA extensions. First, check which extensions are available for your Talos version:

```bash
# List available NVIDIA extensions
crane ls ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules
```

To add the NVIDIA extensions, you need to either generate a custom Talos image or add them through machine configuration. The recommended approach is generating a custom installer image:

```bash
# Generate a custom Talos installer with NVIDIA extensions
# Replace the version numbers with your Talos and driver versions
docker run --rm -t -v $PWD/_out:/out \
  ghcr.io/siderolabs/imager:v1.6.0 installer \
  --system-extension-image ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules:535.129.03-v1.6.0 \
  --system-extension-image ghcr.io/siderolabs/nvidia-container-toolkit:535.129.03-v1.6.0
```

This produces a custom installer image that includes the NVIDIA drivers. Use it to upgrade your GPU nodes:

```bash
# Upgrade the GPU node with the custom installer
talosctl upgrade --image ghcr.io/your-registry/installer:v1.6.0-nvidia \
  --nodes <gpu-node-ip>
```

## Configuring Machine Settings for GPU

After installing the extensions, configure the machine to load the NVIDIA modules and set up the required kernel parameters:

```yaml
# gpu-machine-patch.yaml
machine:
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
      - name: nvidia_drm
      - name: nvidia_modeset
  sysctls:
    net.core.bpf_jit_harden: "1"
  kubelet:
    extraMounts:
      - destination: /usr/local/nvidia
        type: bind
        source: /usr/local/nvidia
        options:
          - bind
          - ro
```

Apply the patch:

```bash
talosctl apply-config --patch @gpu-machine-patch.yaml --nodes <gpu-node-ip>
```

After applying, verify that the NVIDIA modules are loaded:

```bash
# Check loaded kernel modules on the GPU node
talosctl -n <gpu-node-ip> dmesg | grep -i nvidia
```

You should see messages indicating that the NVIDIA driver has been initialized and that GPU devices have been detected.

## Configuring the NVIDIA Container Runtime

The NVIDIA container toolkit needs to be configured in the containerd settings. Add this to your machine configuration:

```yaml
# containerd-nvidia-patch.yaml
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
      op: create
```

Apply this patch:

```bash
talosctl apply-config --patch @containerd-nvidia-patch.yaml --nodes <gpu-node-ip>
```

## Installing the NVIDIA Device Plugin

The device plugin is what makes Kubernetes aware of GPU resources on each node. Deploy it using the official Helm chart:

```bash
# Add the NVIDIA Helm repository
helm repo add nvdp https://nvidia.github.io/k8s-device-plugin
helm repo update

# Install the device plugin
helm install nvidia-device-plugin nvdp/nvidia-device-plugin \
  --namespace kube-system \
  --set runtimeClassName=nvidia \
  --set deviceListStrategy=envvar
```

After the device plugin is running, verify that the GPU is reported as an allocatable resource:

```bash
# Check that GPUs are visible as allocatable resources
kubectl describe node <gpu-node-name> | grep -A 5 "Allocatable"
```

You should see `nvidia.com/gpu: 1` (or however many GPUs are in the node) in the allocatable resources.

## Running Your First GPU Workload

Test the setup with a simple CUDA container:

```yaml
# gpu-test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  restartPolicy: OnFailure
  containers:
    - name: cuda-test
      image: nvidia/cuda:12.2.0-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
```

```bash
kubectl apply -f gpu-test-pod.yaml

# Wait for the pod to complete and check the output
kubectl logs gpu-test
```

The output should show your GPU model, driver version, CUDA version, and memory information, confirming that the GPU is accessible from within the container.

## Labeling GPU Nodes

For clusters with mixed hardware, label your GPU nodes so that workloads can target them:

```bash
# Label GPU nodes
kubectl label node <gpu-node-name> gpu=nvidia
kubectl label node <gpu-node-name> nvidia.com/gpu.present=true
```

Use these labels in node selectors or node affinity rules:

```yaml
# Example node selector in a pod spec
spec:
  nodeSelector:
    gpu: nvidia
  containers:
    - name: my-gpu-app
      image: my-gpu-app:latest
      resources:
        limits:
          nvidia.com/gpu: 1
```

## Resource Quotas for GPU

In multi-tenant clusters, you may want to limit GPU usage per namespace:

```yaml
# gpu-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ml-team
spec:
  hard:
    requests.nvidia.com/gpu: "4"
    limits.nvidia.com/gpu: "4"
```

This limits the ml-team namespace to using at most four GPUs.

## Monitoring GPU Usage

Install DCGM Exporter to get GPU metrics into Prometheus:

```bash
# Install DCGM Exporter for GPU metrics
helm repo add nvidia https://nvidia.github.io/dcgm-exporter/helm-charts
helm install dcgm-exporter nvidia/dcgm-exporter \
  --namespace monitoring \
  --set serviceMonitor.enabled=true
```

Key metrics to monitor include GPU utilization, memory usage, temperature, and power consumption. These metrics are essential for capacity planning and detecting thermal issues.

## Troubleshooting

If GPU workloads fail to start, check these common issues:

```bash
# Verify NVIDIA modules are loaded
talosctl -n <gpu-node-ip> read /proc/modules | grep nvidia

# Check device plugin logs
kubectl logs -n kube-system -l app=nvidia-device-plugin

# Verify that /dev/nvidia* devices exist
talosctl -n <gpu-node-ip> ls /dev/ | grep nvidia
```

Common problems include mismatched driver versions between the system extension and the CUDA version in your container, or missing kernel modules.

## Conclusion

Setting up GPU workloads on Talos Linux requires more upfront configuration than traditional distributions, but the result is a cleaner, more reproducible setup. The system extension approach ensures that GPU drivers are always matched to the kernel version and that the immutable nature of Talos is preserved. Once configured, scheduling GPU workloads is as simple as adding resource limits to your pod specs, and Kubernetes handles the rest.
