# How to Use GPU Passthrough with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, GPU, Container, DevOps, Linux

Description: Learn how to pass through GPUs to Podman containers for hardware-accelerated workloads including machine learning, video processing, and scientific computing.

---

> GPU passthrough in Podman unlocks the full power of your hardware inside containers, enabling accelerated computing without the overhead of virtualization.

Running GPU-accelerated workloads inside containers has become essential for modern development workflows. Whether you are training machine learning models, rendering video, or running scientific simulations, having direct access to the GPU from within a container can dramatically improve performance. Podman, a daemonless container engine, provides several mechanisms to pass GPU devices into containers. This guide covers the core concepts, setup steps, and practical examples for GPU passthrough with Podman.

---

## Understanding GPU Passthrough

GPU passthrough allows a container to directly access the host's GPU hardware. Unlike CPU-based emulation, passthrough gives the container near-native performance by mapping the GPU device files and driver stack into the container's namespace.

Two common approaches to GPU passthrough in Podman are:

1. **Device file mapping** - Passing `/dev/dri/*` or `/dev/nvidia*` device files directly into the container.
2. **CDI (Container Device Interface)** - A standardized specification for describing how devices should be made available to containers.

Before diving in, ensure your host system has the appropriate GPU drivers installed.

## Prerequisites

You need a Linux host with the GPU drivers properly installed. Verify your GPU is recognized by the system:

```bash
# Check for available GPU devices

ls -la /dev/dri/
# Example output:
# drwxr-xr-x  3 root root       120 Mar 18 08:00 .
# crw-rw----+ 1 root video  226,   0 Mar 18 08:00 card0
# crw-rw----+ 1 root render 226, 128 Mar 18 08:00 renderD128

# For NVIDIA GPUs, also check:
ls -la /dev/nvidia*
# Example output:
# crw-rw-rw- 1 root root 195,   0 Mar 18 08:00 /dev/nvidia0
# crw-rw-rw- 1 root root 195, 255 Mar 18 08:00 /dev/nvidiactl
# crw-rw-rw- 1 root root 195, 254 Mar 18 08:00 /dev/nvidia-modeset
# crw-rw-rw- 1 root root 509,   0 Mar 18 08:00 /dev/nvidia-uvm
```

Install Podman if it is not already present:

```bash
# On Fedora/RHEL/CentOS
sudo dnf install -y podman

# On Ubuntu/Debian
sudo apt-get install -y podman

# Verify installation
podman --version
```

## Passing GPU Devices with the --device Flag

The most straightforward method is using the `--device` flag to map GPU device files into the container.

### Intel and AMD GPUs (DRI Devices)

For Intel GPUs and AMD graphics or video workloads that use the Direct Rendering Infrastructure:

```bash
# Pass the entire /dev/dri directory to the container
podman run --rm -it \
  --device /dev/dri \
  fedora:latest \
  bash -c "ls -la /dev/dri/"
```

You can also pass specific device nodes if you only need the render node:

```bash
# Pass only the render node for workloads that do not need the full DRI device set
podman run --rm -it \
  --device /dev/dri/renderD128 \
  my-compute-image:latest \
  python3 run_inference.py
```

For AMD compute workloads that use ROCm, pass both `/dev/kfd` and `/dev/dri`:

```bash
# AMD ROCm workloads need both /dev/kfd and /dev/dri
podman run --rm -it \
  --device /dev/kfd \
  --device /dev/dri \
  rocm/dev-ubuntu-22.04:7.1.1-complete \
  rocminfo
```

### NVIDIA GPUs

For NVIDIA GPUs, direct device mapping exposes the character devices, but CDI via the NVIDIA Container Toolkit is usually the more reliable option for real workloads:

```bash
# Directly expose NVIDIA device nodes
podman run --rm -it \
  --device /dev/nvidia0 \
  --device /dev/nvidiactl \
  --device /dev/nvidia-uvm \
  ubuntu:22.04 \
  bash -c "ls -la /dev/nvidia*"
```

### Multi-GPU Systems

If your system has multiple GPUs, you can selectively pass specific GPUs:

```bash
# Pass only the first GPU (index 0)
podman run --rm -it \
  --device /dev/nvidia0 \
  --device /dev/nvidiactl \
  --device /dev/nvidia-uvm \
  ubuntu:22.04 \
  bash -c "ls -la /dev/nvidia*"

# Pass both GPUs on a dual-GPU system
podman run --rm -it \
  --device /dev/nvidia0 \
  --device /dev/nvidia1 \
  --device /dev/nvidiactl \
  --device /dev/nvidia-uvm \
  ubuntu:22.04 \
  bash -c "ls -la /dev/nvidia*"
```

## Using the NVIDIA Container Toolkit with Podman

The NVIDIA Container Toolkit provides a more integrated experience by automatically handling device mapping and driver library mounting. For Podman, NVIDIA recommends using CDI, and the `nvidia-container-toolkit-base` package is sufficient for CDI-only setups.

```bash
# Install the NVIDIA Container Toolkit base package
# On Fedora/RHEL-like systems:
curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | \
  sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo
sudo dnf install -y nvidia-container-toolkit-base

# On Ubuntu/Debian:
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit-base

# On NVIDIA Container Toolkit v1.18.0 and later, the CDI spec is generated
# automatically at /var/run/cdi/nvidia.yaml. Verify that CDI devices are visible:
nvidia-ctk cdi list

# If you need to regenerate the CDI spec:
sudo systemctl restart nvidia-cdi-refresh.service
```

If your system still has `/usr/share/containers/oci/hooks.d/oci-nvidia-hook.json`, remove it or avoid setting `NVIDIA_VISIBLE_DEVICES` so it does not conflict with CDI.

Once the CDI spec is generated, you can use the `--device` flag with CDI identifiers:

```bash
# Run a container with all NVIDIA GPUs using CDI
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  ubuntu \
  nvidia-smi -L

# Run with a specific GPU using CDI
podman run --rm -it \
  --device nvidia.com/gpu=0 \
  --security-opt=label=disable \
  ubuntu \
  nvidia-smi -L
```

## Security Considerations

When passing GPUs through to containers, keep these security practices in mind:

```bash
# Rootless containers that rely on group access need supplementary groups preserved
podman run --rm -it \
  --device /dev/dri \
  --group-add keep-groups \
  my-gpu-image:latest \
  python3 my_script.py

# On SELinux systems using direct device mapping, allow containers to access
# device nodes from inside the container
sudo setsebool -P container_use_devices=true
```

For rootless Podman, the user running the container must have permission to access the GPU device files. If access is granted through group membership only, use `--group-add keep-groups` when launching the container; Podman documents this as available with the `crun` OCI runtime. Add the user to the appropriate group:

```bash
# For Intel/AMD GPUs (DRI devices)
sudo usermod -aG video $USER
sudo usermod -aG render $USER

# Log out and back in for group changes to take effect
```

## Verifying GPU Access Inside the Container

Once your container is running, verify that the GPU is accessible:

```bash
# For NVIDIA GPUs - run nvidia-smi
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  ubuntu \
  nvidia-smi -L

# For Intel GPUs - confirm that the DRI device nodes are visible
podman run --rm -it \
  --device /dev/dri \
  fedora:latest \
  bash -c "ls -la /dev/dri/"

# For AMD ROCm workloads - check with rocminfo
podman run --rm -it \
  --device /dev/kfd \
  --device /dev/dri \
  rocm/dev-ubuntu-22.04:7.1.1-complete \
  rocminfo
```

## Troubleshooting Common Issues

If the GPU is not visible inside the container, check these common problems:

```bash
# Check if the device files exist on the host
ls -la /dev/dri/ /dev/nvidia* 2>/dev/null

# Verify the user has permission to access GPU devices
groups $USER
# Should include 'video' and/or 'render'

# Check if SELinux is blocking access (on Fedora/RHEL)
sudo ausearch -m avc -ts recent | grep nvidia
# If SELinux is blocking, create a policy or set permissive mode for testing
sudo setsebool -P container_use_devices=true

# Check that NVIDIA CDI devices are registered
nvidia-ctk cdi list
# If CDI devices are missing, regenerate the CDI spec
sudo systemctl restart nvidia-cdi-refresh.service

# For rootless podman, check subuid/subgid mapping
podman unshare cat /proc/self/uid_map
```

## Conclusion

GPU passthrough with Podman is a powerful capability that brings hardware acceleration into containerized workflows. By using device file mapping or the CDI specification, you can give containers direct access to GPU resources with minimal overhead. Start with direct device mapping for simple DRI-based setups, and use the NVIDIA Container Toolkit and CDI for NVIDIA workloads or when you need automated device discovery and configuration. With rootless support and strong security defaults, Podman makes GPU-accelerated containers both accessible and secure.
