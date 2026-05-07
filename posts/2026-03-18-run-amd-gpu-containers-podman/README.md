# How to Run AMD GPU Containers with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, AMD, GPU, ROCm, Container, Linux

Description: A step-by-step guide to running AMD GPU-accelerated containers with Podman, covering AMDGPU driver setup, ROCm configuration, and practical compute examples.

---

> AMD GPUs offer a compelling open-source alternative for GPU computing in containers, and Podman makes it simple to pass through AMD hardware with just a few device mappings.

AMD has made significant strides in the GPU computing space with its ROCm (Radeon Open Compute) platform. For teams looking for an open-source GPU computing stack or those already running AMD hardware, containerizing ROCm workloads with Podman provides a clean and reproducible environment. This guide covers everything from driver setup to running machine learning workloads on AMD GPUs inside Podman containers.

---

## Prerequisites

### Supported Hardware

AMD GPU compute support through ROCm is available on specific GPU models. Check the ROCm documentation for the latest supported hardware list, but generally the following are supported:

- AMD Instinct series (MI100, MI210, MI250, MI300)
- Selected AMD Radeon RX 7000 series GPUs (limited ROCm support)
- Selected AMD Radeon Pro series GPUs

### Verify Your AMD GPU

```bash
# Check if your AMD GPU is detected

lspci | grep -i amd
# Example output:
# 03:00.0 VGA compatible controller: Advanced Micro Devices, Inc. [AMD/ATI] Navi 21 [Radeon RX 6800]

# Check the kernel driver in use
lspci -k | grep -A 3 -i amd
# Should show "Kernel driver in use: amdgpu"
```

### Install the AMDGPU Driver and ROCm

```bash
# On Ubuntu 22.04
# Add the AMDGPU repository
sudo apt-get update
wget https://repo.radeon.com/amdgpu-install/6.0/ubuntu/jammy/amdgpu-install_6.0.60000-1_all.deb
sudo apt-get install -y ./amdgpu-install_6.0.60000-1_all.deb

# Install the AMDGPU driver with ROCm support
sudo amdgpu-install --usecase=rocm

# On RHEL 9.3
sudo yum install -y https://repo.radeon.com/amdgpu-install/6.0/rhel/9.3/amdgpu-install-6.0.60000-1.el9.noarch.rpm
sudo amdgpu-install --usecase=rocm

# Reboot after installation
sudo reboot
```

### Configure User Permissions

```bash
# Add your user to the render and video groups
sudo usermod -aG render $USER
sudo usermod -aG video $USER

# Log out and back in for group changes to take effect
# Verify group membership
groups $USER
# Should include: render video
```

## Understanding AMD GPU Device Files

AMD GPUs expose themselves through the DRI (Direct Rendering Infrastructure) subsystem:

```bash
# List DRI devices
ls -la /dev/dri/
# Example output:
# crw-rw----+ 1 root video  226,   0 Mar 18 08:00 card0
# crw-rw----+ 1 root render 226, 128 Mar 18 08:00 renderD128

# Check the KFD (Kernel Fusion Driver) device for compute
ls -la /dev/kfd
# Example output:
# crw-rw---- 1 root render 234, 0 Mar 18 08:00 /dev/kfd
```

The key device files for AMD GPU compute are:
- `/dev/kfd` - The KFD (Kernel Fusion Driver) device, required for GPU compute
- `/dev/dri/renderD128` - The render node for GPU access
- `/dev/dri/card0` - The full GPU device node (needed for some workloads)

## Running AMD GPU Containers with Podman

### Basic GPU Access

```bash
# Pass AMD GPU devices to a container
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --group-add keep-groups \
  rocm/dev-ubuntu-22.04:6.0 \
  rocm-smi

# Expected output shows your AMD GPU details
```

### Verify ROCm Inside the Container

```bash
# Run rocminfo to get detailed GPU information
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --group-add keep-groups \
  rocm/dev-ubuntu-22.04:6.0 \
  rocminfo

# Run clinfo for OpenCL device information
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --group-add keep-groups \
  rocm/dev-ubuntu-22.04:6.0 \
  clinfo
```

## Choosing the Right ROCm Container Image

AMD provides several container images for different use cases:

```bash
# Base ROCm development image with compilers and libraries
podman pull rocm/dev-ubuntu-22.04:6.0

# ROCm with PyTorch pre-installed
podman pull rocm/pytorch:rocm6.0_ubuntu22.04_py3.10_pytorch_2.1.1

# ROCm with TensorFlow pre-installed
podman pull rocm/tensorflow:rocm6.0-tf2.15-dev

# Minimal ROCm runtime (smaller image for deployment)
podman pull rocm/rocm-terminal:6.0
```

## Running a PyTorch Workload on AMD GPU

```bash
# Create a test script
mkdir -p /tmp/amd-gpu-demo
cat > /tmp/amd-gpu-demo/test_amd_gpu.py << 'EOF'
import torch

# Check ROCm/HIP availability (PyTorch uses CUDA API names for ROCm too)
print(f"ROCm (via HIP) available: {torch.cuda.is_available()}")
print(f"Number of GPUs: {torch.cuda.device_count()}")

if torch.cuda.is_available():
    print(f"GPU Name: {torch.cuda.get_device_name(0)}")

    # Allocate a tensor on the GPU
    device = torch.device("cuda")
    x = torch.randn(1000, 1000, device=device)
    y = torch.randn(1000, 1000, device=device)

    # Perform matrix multiplication on GPU
    import time
    start = time.time()
    for i in range(100):
        z = torch.matmul(x, y)
    torch.cuda.synchronize()
    elapsed = time.time() - start

    print(f"100 matrix multiplications (1000x1000): {elapsed:.3f} seconds")
    print(f"GPU memory allocated: {torch.cuda.memory_allocated(0) / 1024**2:.1f} MB")
    print("AMD GPU compute is working correctly!")
else:
    print("ERROR: No GPU detected. Check device passthrough.")
EOF

# Run the test on AMD GPU
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --group-add keep-groups \
  -v /tmp/amd-gpu-demo:/workspace:Z \
  rocm/pytorch:rocm6.0_ubuntu22.04_py3.10_pytorch_2.1.1 \
  python3 /workspace/test_amd_gpu.py
```

## Running OpenCL Workloads

AMD GPUs also support OpenCL, which is useful for cross-vendor compute code:

```bash
# Create an OpenCL test program
mkdir -p /tmp/opencl-demo
cat > /tmp/opencl-demo/test_opencl.py << 'EOF'
import pyopencl as cl
import numpy as np

# Get available platforms and devices
platforms = cl.get_platforms()
for platform in platforms:
    print(f"Platform: {platform.name}")
    devices = platform.get_devices()
    for device in devices:
        print(f"  Device: {device.name}")
        print(f"  Type: {cl.device_type.to_string(device.type)}")
        print(f"  Global Memory: {device.global_mem_size / 1024**3:.1f} GB")
        print(f"  Max Compute Units: {device.max_compute_units}")

# Simple vector addition on GPU
context = cl.create_some_context(interactive=False)
queue = cl.CommandQueue(context)

# Create input arrays
a = np.random.randn(1000000).astype(np.float32)
b = np.random.randn(1000000).astype(np.float32)

# Create buffers
a_buf = cl.Buffer(context, cl.mem_flags.READ_ONLY | cl.mem_flags.COPY_HOST_PTR, hostbuf=a)
b_buf = cl.Buffer(context, cl.mem_flags.READ_ONLY | cl.mem_flags.COPY_HOST_PTR, hostbuf=b)
c_buf = cl.Buffer(context, cl.mem_flags.WRITE_ONLY, a.nbytes)

# Build and run kernel
program = cl.Program(context, """
__kernel void vector_add(__global const float *a,
                         __global const float *b,
                         __global float *c) {
    int i = get_global_id(0);
    c[i] = a[i] + b[i];
}
""").build()

program.vector_add(queue, a.shape, None, a_buf, b_buf, c_buf)
c = np.empty_like(a)
cl.enqueue_copy(queue, c, c_buf)

print(f"\nVector addition result verified: {np.allclose(c, a + b)}")
EOF

# Run the OpenCL workload
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --group-add keep-groups \
  -v /tmp/opencl-demo:/workspace:Z \
  rocm/dev-ubuntu-22.04:6.0 \
  bash -c "pip install pyopencl && python3 /workspace/test_opencl.py"
```

## Multi-GPU Configurations

For systems with multiple AMD GPUs, you can control which GPUs are visible to the container:

```bash
# List all AMD GPUs on the system
ls /dev/dri/render*
# Example: renderD128 renderD129

# Pass specific render nodes for multi-GPU control
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri/renderD128:/dev/dri/renderD128 \
  --group-add keep-groups \
  rocm/dev-ubuntu-22.04:6.0 \
  rocm-smi

# Use ROCR_VISIBLE_DEVICES to control GPU visibility (recommended on Linux)
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --group-add keep-groups \
  -e ROCR_VISIBLE_DEVICES=0 \
  rocm/pytorch:rocm6.0_ubuntu22.04_py3.10_pytorch_2.1.1 \
  python3 -c "import torch; print(f'Visible GPUs: {torch.cuda.device_count()}')"
```

## Monitoring AMD GPU Usage

```bash
# Monitor GPU usage from the host
watch -n 1 rocm-smi

# Get detailed GPU metrics
rocm-smi --showuse
rocm-smi --showmeminfo vram

# Inside a container
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --group-add keep-groups \
  rocm/dev-ubuntu-22.04:6.0 \
  rocm-smi --showuse
```

## Security and Rootless Considerations

```bash
# Rootless podman works with AMD GPUs if the user has correct group membership
# and the container keeps the user's supplementary groups
# Verify permissions
id | grep -o 'render\|video'

# If running rootless and getting permission errors,
# check the device file permissions
ls -la /dev/kfd /dev/dri/renderD128

# The render group should have rw access
# crw-rw---- 1 root render 234, 0 ... /dev/kfd
# crw-rw----+ 1 root render 226, 128 ... /dev/dri/renderD128

# Preserve supplementary groups for rootless containers
podman run --rm --group-add keep-groups \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  rocm/dev-ubuntu-22.04:6.0 rocminfo
```

## Troubleshooting

```bash
# Error: "Failed to open /dev/kfd"
# Ensure the amdgpu driver is loaded
lsmod | grep amdgpu
# If not loaded:
sudo modprobe amdgpu

# Error: "Permission denied" on /dev/kfd
# Add user to render group and preserve supplementary groups
sudo usermod -aG render $USER
# Log out and back in, then use --group-add keep-groups with rootless podman

# Check if ROCm can see your GPU
/opt/rocm/bin/rocminfo 2>&1 | head -30

# Check dmesg for GPU errors
sudo dmesg | grep -i amdgpu | tail -20

# Verify the correct ROCm version matches your GPU
apt list --installed 2>/dev/null | grep rocm
# or
dnf list installed | grep rocm
```

## Conclusion

Running AMD GPU containers with Podman is well-supported through the standard Linux DRI device interface and the ROCm platform. By passing `/dev/kfd` and `/dev/dri` into your containers, you get access to AMD GPU compute capabilities. The ROCm ecosystem provides pre-built container images for popular frameworks like PyTorch and TensorFlow, making it straightforward to run GPU-accelerated workloads. With proper user group configuration and supplementary group handling, rootless Podman works with AMD GPUs, giving you secure and isolated GPU computing without root privileges.
