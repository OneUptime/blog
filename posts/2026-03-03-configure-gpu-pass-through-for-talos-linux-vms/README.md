# How to Configure GPU Pass-Through for Talos Linux VMs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GPU Passthrough, NVIDIA, Kubernetes, Machine Learning

Description: Learn how to configure GPU passthrough for Talos Linux virtual machines to run GPU-accelerated workloads like machine learning and video processing on Kubernetes.

---

GPU-accelerated workloads are everywhere now. Machine learning training, inference serving, video transcoding, and scientific computing all benefit from having direct GPU access. If you are running Talos Linux in a virtualized environment, GPU passthrough lets your VMs talk directly to the physical GPU without any emulation overhead. This means your Kubernetes pods can use the full power of the GPU just as if they were running on bare metal.

This guide covers the complete process of setting up GPU passthrough for Talos Linux VMs, from host configuration through to running GPU workloads in Kubernetes pods.

## Why GPU Passthrough Instead of vGPU?

There are two main approaches to sharing GPUs with VMs: full passthrough and vGPU. With full passthrough, one VM gets exclusive access to the entire GPU. With vGPU (available on certain NVIDIA data center GPUs), the GPU is partitioned and shared among multiple VMs.

For most Talos Linux setups, full passthrough is the simpler option. It does not require special vGPU licensing, works with consumer GPUs, and provides the best performance since there is no sharing overhead.

## Prerequisites

You will need:

- A dedicated GPU for passthrough (separate from the one driving your display)
- A host system with IOMMU support (Intel VT-d or AMD-Vi)
- NVIDIA GPU with drivers available for the Talos kernel version
- KVM/QEMU or Proxmox as your hypervisor
- `talosctl` installed locally

## Step 1: Enable IOMMU on the Host

Start by enabling IOMMU in your BIOS and kernel parameters:

```bash
# For Intel CPUs - edit /etc/default/grub
GRUB_CMDLINE_LINUX="intel_iommu=on iommu=pt"

# For AMD CPUs
GRUB_CMDLINE_LINUX="amd_iommu=on iommu=pt"

# Update grub and reboot
sudo update-grub
sudo reboot
```

Verify IOMMU is active after reboot:

```bash
dmesg | grep -e DMAR -e IOMMU
```

## Step 2: Identify the GPU and Its IOMMU Group

Find your GPU's PCI address and its IOMMU group members:

```bash
# Find the GPU
lspci -nn | grep -i nvidia

# Example output:
# 01:00.0 VGA compatible controller [0300]: NVIDIA Corporation GA102 [GeForce RTX 3090] [10de:2204]
# 01:00.1 Audio device [0403]: NVIDIA Corporation GA102 High Definition Audio Controller [10de:1aef]
```

Note that NVIDIA GPUs typically have two functions: the GPU itself and an audio controller. Both need to be passed through since they share the same IOMMU group.

```bash
# Check the IOMMU group
ls /sys/bus/pci/devices/0000:01:00.0/iommu_group/devices/
# Should list both 01:00.0 and 01:00.1
```

## Step 3: Bind the GPU to VFIO

Prevent the host from loading NVIDIA drivers for the GPU you want to pass through:

```bash
# Blacklist the nvidia driver for the passthrough GPU
echo "softdep nouveau pre: vfio-pci" | sudo tee /etc/modprobe.d/nvidia-passthrough.conf
echo "softdep nvidia pre: vfio-pci" | sudo tee -a /etc/modprobe.d/nvidia-passthrough.conf

# Bind the GPU to VFIO using vendor:device IDs
echo "options vfio-pci ids=10de:2204,10de:1aef" | sudo tee /etc/modprobe.d/vfio.conf

# Load VFIO modules early
cat <<EOF | sudo tee /etc/modules-load.d/vfio-pci.conf
vfio
vfio_iommu_type1
vfio_pci
EOF

# Rebuild initramfs and reboot
sudo update-initramfs -u
sudo reboot
```

After rebooting, confirm the GPU is bound to VFIO:

```bash
lspci -nnk -s 01:00
# Both devices should show "Kernel driver in use: vfio-pci"
```

## Step 4: Configure the VM for GPU Passthrough

Create a Talos Linux VM with the GPU attached. The q35 machine type and OVMF (UEFI) firmware are recommended for GPU passthrough:

```bash
# Start a Talos VM with GPU passthrough via QEMU
qemu-system-x86_64 \
  -enable-kvm \
  -machine q35,accel=kvm \
  -cpu host,kvm=off \
  -smp 8 \
  -m 16384 \
  -bios /usr/share/ovmf/OVMF.fd \
  -drive file=talos-gpu.qcow2,format=qcow2,if=virtio \
  -device vfio-pci,host=01:00.0,multifunction=on \
  -device vfio-pci,host=01:00.1 \
  -cdrom metal-amd64.iso \
  -boot d \
  -vga none \
  -nographic
```

A few important flags here:

- `kvm=off` on the CPU hides the KVM hypervisor signature, which prevents some NVIDIA drivers from refusing to load in a VM
- `-vga none` disables the emulated VGA device so it does not conflict with the passed-through GPU
- The q35 machine type provides better PCIe emulation

For Proxmox, the configuration is simpler:

```bash
# Add GPU passthrough to a Proxmox VM
qm set 100 --hostpci0 01:00,pcie=1,x-vga=1
qm set 100 --machine q35
qm set 100 --bios ovmf
```

## Step 5: Build a Talos Image with NVIDIA Drivers

Talos Linux does not include NVIDIA drivers by default. You need to build a custom Talos image that includes the NVIDIA system extensions:

```bash
# Generate a custom Talos image with NVIDIA extensions
# First, create an image profile
cat <<EOF > gpu-profile.yaml
arch: amd64
platform: metal
secureboot: false
version: v1.7.0
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/nvidia-container-toolkit
      - siderolabs/nvidia-open-gpu-kernel-modules
      - siderolabs/nvidia-fabricmanager
EOF

# Build the image using the Talos Image Factory
# Or use the factory URL directly in your machine config
```

Alternatively, you can reference the extensions in your machine configuration:

```yaml
# Machine config snippet for NVIDIA extensions
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/nvidia-container-toolkit:latest
      - image: ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules:latest
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
      - name: nvidia_drm
      - name: nvidia_modeset
```

## Step 6: Apply Configuration and Verify

Generate and apply the Talos machine configuration:

```bash
# Generate configs
talosctl gen config gpu-cluster https://<CP_IP>:6443

# Edit controlplane.yaml to add the NVIDIA extensions and kernel modules
# Then apply
talosctl apply-config --insecure --nodes <CP_IP> --file controlplane.yaml
```

After the node boots, verify that the GPU is detected:

```bash
# Check for NVIDIA kernel modules
talosctl -n <NODE_IP> dmesg | grep -i nvidia

# List PCI devices
talosctl -n <NODE_IP> read /proc/bus/pci/devices
```

## Step 7: Install the NVIDIA Device Plugin in Kubernetes

With the drivers loaded in Talos, deploy the NVIDIA device plugin to Kubernetes so pods can request GPU resources:

```bash
# Get the kubeconfig
talosctl kubeconfig .

# Deploy the NVIDIA device plugin
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/main/deployments/static/nvidia-device-plugin.yml
```

Verify the GPU is available as a schedulable resource:

```bash
# Check that the node reports GPU capacity
kubectl describe node <NODE_NAME> | grep nvidia.com/gpu
# Should show something like: nvidia.com/gpu: 1
```

## Step 8: Run a GPU Workload

Test the setup with a simple GPU pod:

```yaml
# gpu-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  containers:
    - name: cuda-test
      image: nvidia/cuda:12.0-base
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
  restartPolicy: Never
```

```bash
kubectl apply -f gpu-test.yaml
kubectl logs gpu-test
# Should show nvidia-smi output with your GPU listed
```

## Performance Considerations

GPU passthrough provides near-native performance because the VM communicates directly with the GPU hardware. However, there are a few things to keep in mind:

- Allocate enough host memory for the GPU's BAR space. High-end GPUs can require 16 GB or more of BAR space mapped into the VM's address space.
- Use hugepages on the host for better memory performance. Add `hugepagesz=1G hugepages=32` to your kernel parameters.
- Make sure the VM has enough vCPUs to keep the GPU fed with work. A GPU sitting idle while waiting for CPU-bound preprocessing is a waste.

## Troubleshooting

If the VM fails to start with VFIO errors, check that both the GPU and its audio controller are bound to VFIO. Missing one device from the IOMMU group will cause the passthrough to fail.

If the NVIDIA driver fails to load inside Talos, make sure you are using the correct extension version that matches your GPU generation. Older GPUs may need the proprietary driver extension instead of the open-source one.

If `nvidia-smi` works but Kubernetes does not see the GPU, check that the NVIDIA device plugin pod is running and its logs do not show errors.

## Wrapping Up

GPU passthrough for Talos Linux VMs gives you the best of both worlds: the operational simplicity of a virtualized, API-driven OS with the raw performance of direct GPU access. Whether you are running ML training jobs, inference endpoints, or video processing pipelines, this setup delivers the performance you need while keeping your infrastructure manageable through Kubernetes.
