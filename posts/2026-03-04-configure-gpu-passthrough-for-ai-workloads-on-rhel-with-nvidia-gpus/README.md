# How to Configure GPU Passthrough for AI Workloads on RHEL with NVIDIA GPUs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GPU, NVIDIA, Passthrough, AI, Virtualization

Description: Configure NVIDIA GPU passthrough on RHEL using VFIO and KVM to dedicate physical GPUs to virtual machines running AI and machine learning workloads.

---

GPU passthrough allows a virtual machine to directly access a physical NVIDIA GPU with near-native performance. This is essential for running AI training and inference workloads inside VMs on RHEL.

## Prerequisites

- RHEL with KVM/libvirt installed
- NVIDIA GPU (Tesla, A100, H100, or similar)
- CPU with IOMMU support (Intel VT-d or AMD-Vi)
- BIOS/UEFI with IOMMU and SR-IOV enabled

## Enable IOMMU in the Kernel

```bash
# For Intel CPUs, add intel_iommu=on to kernel parameters
sudo grubby --update-kernel=ALL --args="intel_iommu=on iommu=pt"

# For AMD CPUs
sudo grubby --update-kernel=ALL --args="amd_iommu=on iommu=pt"

# Reboot to apply
sudo reboot
```

## Verify IOMMU is Active

```bash
# Check IOMMU groups
sudo dmesg | grep -i iommu

# List IOMMU groups and their devices
for g in /sys/kernel/iommu_groups/*/devices/*; do
    echo "IOMMU Group $(basename $(dirname $(dirname $g))): $(lspci -nns $(basename $g))"
done
```

## Identify the NVIDIA GPU

```bash
# Find the GPU PCI address and device IDs
lspci -nn | grep -i nvidia
# Example output: 41:00.0 3D controller [0302]: NVIDIA Corporation A100 [10de:20b2] (rev a1)

# Note the vendor:device IDs (10de:20b2) and the PCI address (41:00.0)
```

## Bind the GPU to VFIO

```bash
# Load the vfio-pci module
sudo modprobe vfio-pci

# Create a modprobe config to bind the GPU to vfio at boot
# Include both the GPU and its audio device if present
echo "options vfio-pci ids=10de:20b2,10de:1aef" | sudo tee /etc/modprobe.d/vfio.conf

# Blacklist the nouveau and nvidia drivers on the host
echo "blacklist nouveau" | sudo tee /etc/modprobe.d/blacklist-gpu.conf
echo "blacklist nvidia" | sudo tee -a /etc/modprobe.d/blacklist-gpu.conf

# Regenerate initramfs
sudo dracut -f

# Reboot
sudo reboot
```

## Verify VFIO Binding

```bash
# Check that the GPU is bound to vfio-pci
lspci -k -s 41:00.0
# Kernel driver in use: vfio-pci
```

## Attach the GPU to a VM

Using virsh to add the GPU to an existing VM:

```bash
# Detach the GPU from the host (if not already bound to vfio)
sudo virsh nodedev-detach pci_0000_41_00_0

# Edit the VM definition to add the GPU
sudo virsh edit ai-vm
```

Add this to the VM's XML within the `<devices>` section:

```xml
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x41' slot='0x00' function='0x0'/>
  </source>
</hostdev>
```

## Start the VM and Install NVIDIA Drivers

```bash
# Start the VM
sudo virsh start ai-vm

# Inside the VM, install NVIDIA drivers
sudo dnf install -y kernel-devel kernel-headers
sudo dnf config-manager --add-repo https://developer.download.nvidia.com/compute/cuda/repos/rhel9/x86_64/cuda-rhel9.repo
sudo dnf install -y cuda-drivers

# Verify the GPU is visible
nvidia-smi
```

## Verify Performance

```bash
# Inside the VM, run a GPU benchmark
nvidia-smi -q | grep "Product Name"
# Should show the full GPU model with no virtualization overhead
```

GPU passthrough on RHEL gives AI workloads direct access to NVIDIA hardware, providing the performance needed for training and inference without leaving the virtualized environment.
