# How to Set Up Virtual GPU (vGPU) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VGPU, Virtualization, KVM, NVIDIA

Description: Guide to setting up NVIDIA vGPU technology on Ubuntu to share a physical GPU across multiple virtual machines, covering licensing, host configuration, and guest VM setup.

---

Virtual GPU (vGPU) technology allows a single physical GPU to be shared across multiple virtual machines, with each VM getting a dedicated slice of GPU resources. This is fundamentally different from GPU passthrough, where one VM gets the entire GPU. vGPU is primarily an NVIDIA enterprise feature (requiring specific Quadro/Tesla/Ampere-class GPUs), though there are open-source alternatives for AMD through SR-IOV.

## Understanding vGPU Types

NVIDIA vGPU comes in several profiles:

- **vCS (Compute Server)**: For compute workloads, no display
- **vWS (Workstation)**: For graphics-intensive workloads requiring certified drivers
- **vPC (Virtual PC)**: For knowledge workers, virtual desktops
- **vDWS (Data Center Workstation)**: Combines compute and display

Supported hardware includes: NVIDIA A-series (A10, A16, A30, A40, A100), T4, RTX 6000 Ada, and older Tesla/Quadro cards. Consumer GPUs (GeForce series) do not support vGPU.

## Prerequisites

- A supported NVIDIA GPU installed in the server
- NVIDIA vGPU software license (from NVIDIA or through cloud marketplace)
- Ubuntu 20.04 or 22.04 server
- KVM/QEMU installed
- IOMMU enabled (same as GPU passthrough)

## Host Setup: Installing NVIDIA vGPU Manager

Download the NVIDIA vGPU Software Manager from NVIDIA's licensing portal (requires an NVIDIA account with vGPU license):

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential dkms linux-headers-$(uname -r)

# Extract the downloaded package
# (Example filename - actual name varies by version)
unzip NVIDIA-GRID-Linux-KVM-535.161.07-537.70.zip

# Install the host driver (vGPU Manager)
sudo sh NVIDIA-Linux-x86_64-535.161.07-vgpu-kvm.run --dkms

# Verify the vGPU manager loaded
nvidia-smi vgpu
```

If `nvidia-smi vgpu` returns a table showing available vGPU types, the host manager is installed correctly.

## Enabling SR-IOV (for Supported Cards)

Some NVIDIA cards (A-series) support SR-IOV which creates virtual functions directly:

```bash
# Enable SR-IOV in GRUB if not already done
sudo nano /etc/default/grub
# Add: intel_iommu=on iommu=pt (or amd_iommu=on)

sudo update-grub
sudo reboot

# After reboot, enable VFs for your GPU
# Replace 0000:01:00.0 with your GPU's PCI address
echo 8 | sudo tee /sys/bus/pci/devices/0000:01:00.0/sriov_numvfs

# Verify VFs created
lspci | grep NVIDIA
```

## Listing Available vGPU Types

```bash
# List all vGPU types supported by your GPU
nvidia-smi vgpu -s

# Detailed view with memory and capabilities
nvidia-smi vgpu --supported-vgpu

# Check active vGPUs
nvidia-smi vgpu -q
```

A typical output shows profiles like `GRID A100-40C` (40GB compute), `GRID A100-10C` (10GB compute), etc. The number indicates GPU memory allocated to each VM.

## Creating a VM with vGPU

### Method 1: Using virt-manager with mdev (Mediated Device)

Create a mediated device from the GPU:

```bash
# List available mdev types
ls /sys/class/mdev_bus/0000:01:00.0/mdev_supported_types/

# Create a vGPU instance (replace TYPE with actual type directory name)
# Example: nvidia-105 might be GRID A100-10C
sudo sh -c 'echo "$(uuidgen)" > /sys/class/mdev_bus/0000:01:00.0/mdev_supported_types/nvidia-105/create'

# List created mdev devices
ls /sys/bus/mdev/devices/
```

Then add the mdev device to your VM XML:

```xml
<hostdev mode='subsystem' type='mdev' managed='no' model='vfio-pci'>
  <source>
    <address uuid='YOUR-UUID-HERE'/>
  </source>
</hostdev>
```

### Method 2: Using libvirt nodedev-create

```bash
# Create an XML definition for the mdev
cat > /tmp/mdev.xml << 'EOF'
<device>
  <parent>pci_0000_01_00_0</parent>
  <capability type='mdev'>
    <type id='nvidia-105'/>
  </capability>
</device>
EOF

# Create the mdev via libvirt
sudo virsh nodedev-create /tmp/mdev.xml
```

## Making vGPU Instances Persistent Across Reboots

Mediated devices created manually don't survive reboots. Use a systemd service or vGPU manager configuration:

```bash
# Create a script to recreate mdev devices at boot
sudo tee /usr/local/bin/create-vgpu.sh << 'EOF'
#!/bin/bash
# Wait for GPU to be ready
sleep 5

# Create vGPU instances
UUID1=$(uuidgen)
UUID2=$(uuidgen)

echo "$UUID1" > /sys/class/mdev_bus/0000:01:00.0/mdev_supported_types/nvidia-105/create
echo "$UUID2" > /sys/class/mdev_bus/0000:01:00.0/mdev_supported_types/nvidia-105/create

echo "Created vGPU instances: $UUID1, $UUID2"
EOF

sudo chmod +x /usr/local/bin/create-vgpu.sh

# Create systemd service
sudo tee /etc/systemd/system/vgpu-setup.service << 'EOF'
[Unit]
Description=Create NVIDIA vGPU instances
After=nvidia-vgpu-mgr.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/create-vgpu.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable vgpu-setup.service
```

## Guest VM Configuration

Inside each VM, install the vGPU guest driver:

```bash
# On the guest (Ubuntu example):
# Download the guest driver from NVIDIA licensing portal
# The guest driver package is separate from the host manager

sudo sh NVIDIA-Linux-x86_64-535.161.07-grid.run

# Verify installation
nvidia-smi
```

### Setting Up the vGPU License Client

Each VM needs to check out a license from an NVIDIA license server:

```bash
# Inside the guest VM, configure the license server
sudo mkdir -p /etc/nvidia
sudo tee /etc/nvidia/gridd.conf << 'EOF'
ServerAddress=your-license-server.example.com
ServerPort=7070
FeatureType=1
EnableUI=FALSE
EOF

# Start the license daemon
sudo systemctl enable --now nvidia-gridd

# Check license status
nvidia-smi -q | grep "License Status"
```

## Open-Source Alternative: SR-IOV with AMD GPUs

AMD's newer GPUs support SR-IOV natively without proprietary vGPU software, though this requires specific GPU models and kernel patches:

```bash
# Check if your AMD GPU supports SR-IOV
lspci -vvv | grep -i "single root"

# Enable SR-IOV VFs
echo 2 | sudo tee /sys/bus/pci/devices/0000:03:00.0/sriov_numvfs

# Each VF appears as a separate PCIe device that can be passed to a VM
lspci | grep AMD
```

## Monitoring vGPU Usage

```bash
# Monitor vGPU instances
watch -n 2 nvidia-smi vgpu -q

# Show per-process GPU usage across VMs
nvidia-smi vgpu -a

# Get utilization statistics
nvidia-smi vgpu --query-vgpu-stats=timestamp,vgpu_name,utilization.gpu,utilization.memory --format=csv,noheader
```

## Troubleshooting

### "No vGPU devices found" after installing the manager

```bash
# Ensure the vgpu-mgr module loaded
lsmod | grep nvidia

# Restart the vGPU manager service
sudo systemctl restart nvidia-vgpu-mgr

# Check service logs
journalctl -u nvidia-vgpu-mgr -n 50
```

### VM fails to start with mdev device

```bash
# Verify the mdev UUID still exists
ls /sys/bus/mdev/devices/

# Check if mdev type is available
ls /sys/class/mdev_bus/0000:01:00.0/mdev_supported_types/

# Check libvirt logs
sudo journalctl -u libvirtd | tail -30
```

### License not acquired in guest

Ensure network connectivity between the guest and license server, check firewall rules allow port 7070, and verify the license server has available seats for your vGPU profile.

vGPU setup is complex but enables efficient GPU resource sharing across many VMs, which is particularly valuable in VDI environments and cloud deployments where raw hardware efficiency matters.
