# How to Configure PCI Passthrough for VMs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, PCI Passthrough, Virtualization

Description: Learn how to configure PCI passthrough on Ubuntu to give KVM virtual machines direct access to physical hardware like GPUs, NVMe drives, and network cards.

---

PCI passthrough (using VFIO) assigns a physical PCIe device directly to a virtual machine. The VM interacts with the hardware as if it were installed in a physical machine - no virtualization layer for that device. This is the approach used for GPU passthrough for gaming VMs or workstation VMs that need direct GPU access, and for assigning NVMe storage or high-performance NICs directly to VMs.

## Understanding VFIO

VFIO (Virtual Function I/O) is the kernel framework that enables safe user-space access to PCI devices. It uses the IOMMU to isolate the device's DMA operations, preventing a compromised VM from accessing host memory.

The passthrough process:
1. Enable IOMMU in the kernel
2. Unbind the device from its native driver
3. Bind it to the `vfio-pci` driver
4. Assign it to the VM via libvirt

## Step 1: Enable IOMMU

```bash
# Check CPU virtualization and IOMMU capability
dmesg | grep -e DMAR -e IOMMU -e AMD-Vi

# Enable IOMMU in GRUB
sudo nano /etc/default/grub
```

For Intel CPUs:
```text
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash intel_iommu=on iommu=pt"
```

For AMD CPUs:
```text
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash amd_iommu=on iommu=pt"
```

```bash
sudo update-grub
sudo reboot

# Verify after reboot
dmesg | grep -i "IOMMU enabled"
```

## Step 2: Identify the Target Device

```bash
# List all PCI devices
lspci -nn

# Find your GPU
lspci -nn | grep -i "VGA\|3D\|Display"
# Example output:
# 01:00.0 VGA compatible controller [0300]: NVIDIA Corporation GP104 [GeForce GTX 1080] [10de:1b80]
# 01:00.1 Audio device [0403]: NVIDIA Corporation GP104 High Definition Audio [10de:10f0]

# Find your NVMe drive
lspci -nn | grep -i "NVM\|Non-Volatile"

# Get detailed info including IOMMU group
for dev in /sys/kernel/iommu_groups/*/devices/*; do
    group=$(echo "$dev" | sed 's/.*iommu_groups\/\([0-9]*\).*/\1/')
    addr=$(basename "$dev")
    name=$(lspci -n -s "$addr" | awk '{print $3}')
    desc=$(lspci -s "$addr" | sed 's/^[^ ]* //')
    echo "Group $group: $addr [$name] $desc"
done | sort -n
```

## Step 3: Check IOMMU Groups

Devices in the same IOMMU group must all be passed through to the same VM. If a GPU shares a group with other devices, you need to pass them all through together.

```bash
# Check which IOMMU group your device is in
# Using GPU address 01:00.0 as example
ls /sys/bus/pci/devices/0000:01:00.0/iommu_group/devices/

# List all devices in the same IOMMU group
for dev in $(ls /sys/bus/pci/devices/0000:01:00.0/iommu_group/devices/); do
    echo "$dev: $(lspci -s ${dev##*:} | head -1)"
done
```

If the GPU's PCIe root port or bridge is in the same IOMMU group, enable ACS (Access Control Services) to separate them:

```bash
# Install the ACS override patch (use only if needed)
# Add to GRUB_CMDLINE_LINUX_DEFAULT:
pcie_acs_override=downstream,multifunction
```

## Step 4: Bind the Device to vfio-pci

### Method 1: At Boot Time (Recommended)

Note the device's vendor:device IDs from the `lspci -nn` output:

```bash
# Example: NVIDIA GPU IDs: 10de:1b80 and 10de:10f0

# Load VFIO modules
sudo modprobe vfio
sudo modprobe vfio-pci
sudo modprobe vfio_iommu_type1

# Make modules load at boot
cat << 'EOF' | sudo tee /etc/modules-load.d/vfio.conf
vfio
vfio-pci
vfio_iommu_type1
EOF

# Bind device IDs to vfio-pci at boot
# Replace with your actual vendor:device IDs
cat << 'EOF' | sudo tee /etc/modprobe.d/vfio.conf
options vfio-pci ids=10de:1b80,10de:10f0
# Disable the native driver for the device:
softdep nouveau pre: vfio-pci
softdep nvidia pre: vfio-pci
EOF

sudo update-initramfs -u
sudo reboot
```

### Method 2: Using a Script at Boot

```bash
sudo nano /usr/local/bin/vfio-bind.sh
```

```bash
#!/bin/bash
# Bind specific PCI devices to vfio-pci driver
# Usage: List device addresses to bind

# Devices to pass through (PCIe addresses)
DEVICES=(
    "0000:01:00.0"  # GPU
    "0000:01:00.1"  # GPU Audio
)

for DEVICE in "${DEVICES[@]}"; do
    echo "Binding $DEVICE to vfio-pci"

    # Find current driver
    CURRENT_DRIVER=$(readlink /sys/bus/pci/devices/$DEVICE/driver | xargs basename 2>/dev/null || echo "none")
    echo "  Current driver: $CURRENT_DRIVER"

    # Unbind from current driver
    if [ -e "/sys/bus/pci/devices/$DEVICE/driver/unbind" ]; then
        echo "$DEVICE" > /sys/bus/pci/devices/$DEVICE/driver/unbind
    fi

    # Get vendor and device IDs
    VENDOR=$(cat /sys/bus/pci/devices/$DEVICE/vendor)
    DEVICE_ID=$(cat /sys/bus/pci/devices/$DEVICE/device)

    # Register with vfio-pci
    echo "$VENDOR $DEVICE_ID" > /sys/bus/pci/drivers/vfio-pci/new_id 2>/dev/null || true

    # Bind to vfio-pci
    echo "$DEVICE" > /sys/bus/pci/drivers/vfio-pci/bind 2>/dev/null || true

    echo "  Done: $(ls /sys/bus/pci/devices/$DEVICE/driver/ | head -1)"
done
```

```bash
sudo chmod +x /usr/local/bin/vfio-bind.sh
```

## Step 5: Verify vfio-pci is Bound

```bash
# Check device is bound to vfio-pci
ls -la /sys/bus/pci/devices/0000:01:00.0/driver
# Should show: -> ../../../bus/pci/drivers/vfio-pci

# List VFIO devices
ls /dev/vfio/
# Should show numbers like: 0  1  2  vfio
```

## Step 6: Configure the VM for Passthrough

```bash
# Edit VM XML
virsh edit myvm
```

Add the passthrough devices in the `<devices>` section:

```xml
<!-- For GPU passthrough -->
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x01' slot='0x00' function='0x0'/>
  </source>
  <address type='pci' domain='0x0000' bus='0x00' slot='0x05' function='0x0'/>
</hostdev>

<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x01' slot='0x00' function='0x1'/>
  </source>
  <address type='pci' domain='0x0000' bus='0x00' slot='0x06' function='0x0'/>
</hostdev>
```

For GPU passthrough, also configure the display:

```xml
<!-- Use VNC or SPICE for initial access, then switch to GPU output -->
<graphics type='vnc' port='-1' autoport='yes'/>

<!-- Hide KVM hypervisor from GPU (helps with NVIDIA drivers) -->
<features>
  <hyperv>
    <relaxed state='on'/>
    <vapic state='on'/>
    <spinlocks state='on' retries='8191'/>
    <vendor_id state='on' value='randomid'/>
  </hyperv>
  <kvm>
    <hidden state='on'/>
  </kvm>
  <ioapic driver='kvm'/>
</features>
```

Also update the CPU configuration:

```xml
<cpu mode='host-passthrough' check='none' migratable='off'>
  <topology sockets='1' dies='1' cores='4' threads='2'/>
</cpu>
```

## Step 7: Adding the Device Through virsh

```bash
# Add device using virsh
cat > /tmp/pci-device.xml << 'EOF'
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x01' slot='0x00' function='0x0'/>
  </source>
</hostdev>
EOF

virsh attach-device myvm /tmp/pci-device.xml --persistent
```

## Verifying Passthrough Inside the VM

```bash
# Start the VM and connect
virsh start myvm
virsh console myvm

# Inside VM - check for the device
lspci | grep -i "NVIDIA\|NVMe"
# Should show your passed-through device

# For GPU - install NVIDIA drivers normally
sudo apt install nvidia-driver-535

# For NVMe - it should appear as a regular block device
lsblk
```

## Troubleshooting Passthrough Issues

**"Failed to set iommu for container" error:**

```bash
# IOMMU is not enabled or not working
dmesg | grep -i iommu
# Must see "IOMMU enabled" or "Adding to iommu group"
```

**NVIDIA Error 43 in guest (Error Code 43):**

This is NVIDIA's hypervisor detection. Add the KVM hidden feature shown above:

```xml
<kvm>
  <hidden state='on'/>
</kvm>
```

**Device still in use by host driver:**

```bash
# Force unbind
echo "0000:01:00.0" | sudo tee /sys/bus/pci/devices/0000:01:00.0/driver/unbind

# Bind to vfio-pci
echo "0000:01:00.0" | sudo tee /sys/bus/pci/drivers/vfio-pci/bind
```

**IOMMU group contains too many devices:**

Add the ACS override to GRUB options:

```bash
# Only use this if you understand the security implications
pcie_acs_override=downstream,multifunction
```

PCI passthrough requires more careful setup than most KVM features, but delivers hardware performance that software virtualization cannot match. Once configured, the passed-through device behaves like native hardware from the VM's perspective.
