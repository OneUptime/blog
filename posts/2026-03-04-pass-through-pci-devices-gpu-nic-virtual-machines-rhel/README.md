# How to Pass Through PCI Devices (GPU, NIC) to Virtual Machines on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, PCI Passthrough, GPU, VFIO, Virtualization, Linux

Description: Learn how to pass through PCI devices like GPUs and NICs to KVM virtual machines on RHEL using VFIO for direct hardware access and native performance.

---

PCI passthrough assigns a physical PCI device (GPU, NIC, NVMe controller, etc.) directly to a virtual machine. The VM gets exclusive access to the hardware with near-native performance. RHEL uses the VFIO (Virtual Function I/O) framework for this.

## Prerequisites

- IOMMU enabled in BIOS (VT-d for Intel, AMD-Vi for AMD)
- The PCI device must be in its own IOMMU group (or the group must be safe to pass through entirely)

## Enabling IOMMU

```bash
# Enable IOMMU in kernel parameters
sudo grubby --update-kernel=ALL --args="intel_iommu=on iommu=pt"
# For AMD: amd_iommu=on iommu=pt

# Reboot
sudo systemctl reboot

# Verify IOMMU is enabled
dmesg | grep -i "IOMMU enabled"
```

## Identifying the PCI Device

```bash
# List all PCI devices
lspci -nn

# Find the device you want to pass through
# Example: GPU
lspci -nn | grep -i "vga\|nvidia\|amd"
# Output: 01:00.0 VGA compatible controller [0300]: NVIDIA Corporation [10de:1b80]

# Note the PCI address (01:00.0) and vendor:device IDs (10de:1b80)

# Check the IOMMU group
find /sys/kernel/iommu_groups/ -type l | sort -V | grep "01:00"
```

## Binding the Device to VFIO

```bash
# Unbind the device from its current driver
echo "0000:01:00.0" | sudo tee /sys/bus/pci/devices/0000:01:00.0/driver/unbind

# Load the vfio-pci driver
sudo modprobe vfio-pci

# Bind the device to vfio-pci using vendor:device IDs
echo "10de 1b80" | sudo tee /sys/bus/pci/drivers/vfio-pci/new_id
```

## Making VFIO Binding Persistent

```bash
# Configure vfio-pci to claim the device at boot
sudo tee /etc/modprobe.d/vfio-pci.conf << 'EOF'
options vfio-pci ids=10de:1b80
EOF

# Ensure vfio-pci loads early
sudo tee /etc/modules-load.d/vfio-pci.conf << 'EOF'
vfio-pci
EOF

# Rebuild initramfs
sudo dracut -f
```

## Attaching the PCI Device to a VM

```bash
# Create the hostdev XML
cat << 'EOF' > /tmp/pci-passthrough.xml
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x01' slot='0x00' function='0x0'/>
  </source>
</hostdev>
EOF

# Attach to a VM (VM must be shut down for initial attachment)
sudo virsh attach-device rhel9-vm /tmp/pci-passthrough.xml --config

# Start the VM
sudo virsh start rhel9-vm
```

## Using virt-install with PCI Passthrough

```bash
# Pass through a device during VM creation
sudo virt-install \
  --name gpu-vm \
  --memory 8192 --vcpus 4 \
  --disk size=50 \
  --host-device 01:00.0 \
  --cdrom /var/lib/libvirt/images/rhel-9.4-dvd.iso \
  --os-variant rhel9.4 \
  --graphics vnc \
  --boot uefi
```

## Verifying Inside the Guest

```bash
# Inside the VM, the device should appear as a native PCI device
lspci | grep -i nvidia

# Install appropriate drivers in the guest
# The device has full hardware capabilities
```

## Troubleshooting

```bash
# Check IOMMU groups
for d in /sys/kernel/iommu_groups/*/devices/*; do
    echo "Group $(basename $(dirname $(dirname $d))): $(lspci -nns $(basename $d))"
done

# Check if vfio-pci bound successfully
lspci -k -s 01:00.0 | grep "Kernel driver"
# Should show: Kernel driver in use: vfio-pci
```

PCI passthrough provides the best performance but prevents live migration and ties the VM to specific hardware. The device is exclusively owned by the VM and unavailable to the host or other VMs.
