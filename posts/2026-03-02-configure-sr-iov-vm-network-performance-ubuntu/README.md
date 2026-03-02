# How to Configure SR-IOV for VM Network Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, SR-IOV, Networking, Performance

Description: Learn how to configure SR-IOV on Ubuntu to provide near-native network performance for KVM virtual machines using hardware virtual functions.

---

SR-IOV (Single Root I/O Virtualization) allows a single physical network adapter to present itself as multiple virtual PCIe devices. Each virtual function (VF) can be assigned directly to a VM, bypassing the software network stack entirely. The result is near-native network performance with latencies and throughput comparable to a dedicated physical NIC.

## Understanding SR-IOV Architecture

A typical SR-IOV setup involves:
- **Physical Function (PF):** The real PCIe network adapter visible to the host OS
- **Virtual Functions (VFs):** Lightweight PCIe functions created from the PF, each assignable to a VM

Traffic between a VF and the network bypasses the host kernel networking stack, going directly between the VM and the NIC hardware through the IOMMU. This eliminates the overhead of software switching and virtio processing.

**Requirements:**
- SR-IOV capable NIC (Intel X710, X550, Mellanox ConnectX-4/5/6, etc.)
- CPU and motherboard with VT-d (Intel) or AMD-Vi support
- IOMMU enabled in BIOS and kernel
- Supported kernel drivers

## Enabling IOMMU

```bash
# Check if IOMMU is enabled
dmesg | grep -e DMAR -e IOMMU

# Enable IOMMU in GRUB
sudo nano /etc/default/grub
```

For Intel CPUs:

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash intel_iommu=on iommu=pt"
```

For AMD CPUs:

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash amd_iommu=on iommu=pt"
```

The `iommu=pt` option enables "pass-through mode" which improves performance for devices not being passed through.

```bash
# Update GRUB and reboot
sudo update-grub
sudo reboot

# After reboot, verify IOMMU is active
dmesg | grep -e DMAR -e IOMMU | head -10
# Should show: IOMMU enabled
```

## Identifying SR-IOV Capable NICs

```bash
# List network adapters with their PCIe IDs
lspci | grep -i ethernet

# Check if a specific adapter supports SR-IOV
# Replace 04:00.0 with your NIC's PCIe address
lspci -v -s 04:00.0 | grep -i "Single Root"

# Check sysfs for VF capability
cat /sys/bus/pci/devices/0000:04:00.0/sriov_totalvfs
# Non-zero output means SR-IOV is supported
```

## Loading Required Kernel Modules

Different NICs use different drivers:

```bash
# Intel X710/X722 series
lsmod | grep i40e

# Intel 82599/X540/X550 series
lsmod | grep ixgbe

# Mellanox NICs
lsmod | grep mlx5_core

# Load the appropriate module if not loaded
sudo modprobe i40e   # or ixgbe, mlx5_core, etc.
```

## Creating Virtual Functions

```bash
# Find your PF interface name
ip link show

# Enable VFs using sysfs (replace enp4s0f0 with your NIC name)
echo 4 | sudo tee /sys/class/net/enp4s0f0/device/sriov_numvfs

# Verify VFs were created
ip link show enp4s0f0
# Should show vf 0, vf 1, vf 2, vf 3 with MAC addresses

# Also check with lspci
lspci | grep "Virtual Function"
```

### Making VF Creation Persistent

Create a systemd service or use udev rules:

```bash
sudo nano /etc/systemd/system/sriov-setup.service
```

```ini
[Unit]
Description=Configure SR-IOV Virtual Functions
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/sriov-setup.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo nano /usr/local/bin/sriov-setup.sh
```

```bash
#!/bin/bash
# SR-IOV setup script - run at boot

# Number of VFs to create
NUM_VFS=4
# Physical function interface
PF_INTERFACE="enp4s0f0"

# Wait for interface to be ready
for i in {1..10}; do
    if [ -f "/sys/class/net/$PF_INTERFACE/device/sriov_numvfs" ]; then
        break
    fi
    sleep 1
done

# Create virtual functions
echo "$NUM_VFS" > "/sys/class/net/$PF_INTERFACE/device/sriov_numvfs"

# Set VF trust mode for better performance
for vf_num in $(seq 0 $((NUM_VFS-1))); do
    ip link set "$PF_INTERFACE" vf "$vf_num" trust on 2>/dev/null || true
    ip link set "$PF_INTERFACE" vf "$vf_num" spoofchk off 2>/dev/null || true
done

echo "SR-IOV: Created $NUM_VFS VFs on $PF_INTERFACE"
```

```bash
sudo chmod +x /usr/local/bin/sriov-setup.sh
sudo systemctl enable sriov-setup.service
sudo systemctl start sriov-setup.service
```

## Configuring VFs

```bash
# Set MAC address for a specific VF
sudo ip link set enp4s0f0 vf 0 mac 52:54:00:11:22:33

# Set VLAN for a VF
sudo ip link set enp4s0f0 vf 0 vlan 100

# Enable VF trust (allows VF to set its own MAC/VLAN)
sudo ip link set enp4s0f0 vf 0 trust on

# Disable spoof checking (may be needed for some setups)
sudo ip link set enp4s0f0 vf 0 spoofchk off

# Set VF bandwidth limit (in Mbps)
sudo ip link set enp4s0f0 vf 0 max_tx_rate 1000

# Show VF configuration
ip link show enp4s0f0
```

## Finding VF PCIe Addresses

You need the PCIe address of each VF to assign them to VMs:

```bash
# List VF PCIe addresses
ls /sys/class/net/enp4s0f0/device/virtfn*
# Output: virtfn0 -> ../0000:04:10.0
#         virtfn1 -> ../0000:04:10.2
#         virtfn2 -> ../0000:04:10.4
#         virtfn3 -> ../0000:04:10.6

# Get the PCIe address of VF0
readlink /sys/class/net/enp4s0f0/device/virtfn0
# Output: ../0000:04:10.0
```

## Assigning VFs to VMs

### Method 1: Using libvirt Host Device Passthrough

```bash
# Find the PCI device in libvirt
virsh nodedev-list | grep pci_0000_04

# Get device details (use your actual address)
virsh nodedev-dumpxml pci_0000_04_10_0
```

Create device XML for assignment:

```bash
cat > /tmp/vf-device.xml << 'EOF'
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x04' slot='0x10' function='0x0'/>
  </source>
</hostdev>
EOF

# Attach VF to VM
virsh attach-device myvm /tmp/vf-device.xml --live --persistent
```

### Method 2: Using libvirt SR-IOV Network Interface

```bash
cat > /tmp/sriov-interface.xml << 'EOF'
<interface type='hostdev' managed='yes'>
  <driver name='vfio'/>
  <source>
    <address type='pci' domain='0x0000' bus='0x04' slot='0x10' function='0x0'/>
  </source>
  <mac address='52:54:00:11:22:33'/>
  <vlan>
    <tag id='100'/>
  </vlan>
</interface>
EOF

virsh attach-device myvm /tmp/sriov-interface.xml --live --persistent
```

## Installing VFIO for PCI Passthrough

```bash
# VFIO is required for VF assignment
sudo modprobe vfio-pci

# Make it load at boot
echo "vfio-pci" | sudo tee /etc/modules-load.d/vfio-pci.conf

# Verify VFIO is loaded
lsmod | grep vfio
```

## Verifying SR-IOV Performance

Inside the VM with an assigned VF:

```bash
# Check interface type in guest
lspci | grep Ethernet
# Should show the VF adapter (e.g., Intel 82599 Virtual Function)

# Test network performance
# Install iperf3 on both server and client
sudo apt install iperf3

# On server VM:
iperf3 -s

# On client VM:
iperf3 -c <server-ip> -t 30 -P 4

# With SR-IOV, expect near line-rate throughput
# Without SR-IOV (virtio), expect ~10-20% overhead
```

## Comparing SR-IOV vs virtio Performance

```bash
# Check CPU usage during network load
# With SR-IOV: minimal CPU overhead in guest and host
# With virtio: noticeable CPU consumption for packet processing

# Monitor with:
top -d1 -p $(pgrep -d, qemu)

# Also check interrupt distribution
cat /proc/interrupts | grep eth
```

## Troubleshooting SR-IOV

**VFs not created after setting sriov_numvfs:**

```bash
dmesg | tail -20   # Check for driver errors
# Common cause: IOMMU not properly enabled
# Verify: dmesg | grep -i iommu
```

**"Failed to set up VFIO" error:**

```bash
# Verify VFIO modules are loaded
lsmod | grep vfio

# Check that IOMMU groups are correct
find /sys/kernel/iommu_groups/ -type l | head -10
```

**VM crashes after VF assignment:**

```bash
# Check IOMMU group isolation
# All devices in same IOMMU group must be assigned to same VM
ls /sys/kernel/iommu_groups/<group_number>/devices/
```

SR-IOV provides the highest possible network performance for VMs but requires specific hardware and careful configuration. For high-throughput applications like network appliances, storage gateways, or latency-sensitive financial workloads, the performance gains justify the additional complexity.
