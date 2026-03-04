# How to Enable and Configure SR-IOV Virtual Functions on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SR-IOV, Virtualization, Networking, Performance

Description: Enable and configure SR-IOV (Single Root I/O Virtualization) virtual functions on RHEL to provide near-native network performance to virtual machines.

---

SR-IOV allows a single physical network adapter to present multiple virtual functions (VFs) that can be directly assigned to virtual machines. This bypasses the software-based virtual switch, providing near-native network performance with lower CPU overhead.

## Prerequisites

```bash
# Verify the NIC supports SR-IOV
lspci -v | grep -A10 "Ethernet" | grep "SR-IOV"

# Check if IOMMU is enabled (required for VF passthrough)
dmesg | grep -i iommu
# Should show: DMAR: IOMMU enabled

# If IOMMU is not enabled, add it to the kernel command line
sudo grubby --update-kernel=ALL --args="intel_iommu=on"
# For AMD: sudo grubby --update-kernel=ALL --args="amd_iommu=on"
sudo reboot
```

## Enabling SR-IOV Virtual Functions

```bash
# Find the PCI address of your NIC
lspci | grep Ethernet
# Example: 03:00.0 Ethernet controller: Intel Corporation 82599ES

# Check the maximum number of VFs supported
cat /sys/class/net/ens3f0/device/sriov_totalvfs

# Enable VFs (example: create 4 virtual functions)
echo 4 | sudo tee /sys/class/net/ens3f0/device/sriov_numvfs

# Verify VFs were created
lspci | grep "Virtual Function"
ip link show ens3f0
# You should see vf entries in the output
```

## Making VF Creation Persistent

```bash
# Create a udev rule to set VFs at boot
sudo tee /etc/udev/rules.d/99-sriov.rules << 'UDEV'
ACTION=="add", SUBSYSTEM=="net", ENV{ID_NET_DRIVER}=="ixgbe", ATTR{device/sriov_numvfs}="4"
UDEV

# Or use a systemd service for more control
sudo tee /etc/systemd/system/sriov-vfs.service << 'SERVICE'
[Unit]
Description=Enable SR-IOV Virtual Functions
After=network-pre.target
Before=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'echo 4 > /sys/class/net/ens3f0/device/sriov_numvfs'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl enable sriov-vfs.service
```

## Configuring VF Properties

```bash
# Set the MAC address for a VF
sudo ip link set ens3f0 vf 0 mac 00:11:22:33:44:55

# Assign a VLAN to a VF
sudo ip link set ens3f0 vf 0 vlan 100

# Set the link state
sudo ip link set ens3f0 vf 0 state enable

# Set a rate limit on a VF (in Mbps)
sudo ip link set ens3f0 vf 0 max_tx_rate 1000

# Enable spoofcheck (security)
sudo ip link set ens3f0 vf 0 spoofchk on

# View VF configuration
ip link show ens3f0
```

## Assigning a VF to a Virtual Machine (libvirt)

```bash
# Find the PCI address of the VF
lspci | grep "Virtual Function"
# Example: 03:10.0 Ethernet controller: Intel Corporation 82599 Ethernet ...

# Get the full PCI address for the XML
virsh nodedev-list | grep pci | grep 03_10

# Create a device XML for the VF
cat > /tmp/vf-device.xml << 'XML'
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x03' slot='0x10' function='0x0'/>
  </source>
</hostdev>
XML

# Attach the VF to a running VM
virsh attach-device myvm /tmp/vf-device.xml --live --config
```

## Verifying Inside the VM

```bash
# Inside the VM, the VF appears as a regular NIC
ip link show
# It should show the assigned MAC address

# Test performance
iperf3 -c server -t 30
# Expect near line-rate performance with minimal CPU usage
```

SR-IOV is ideal for network-intensive workloads where virtual switch overhead is unacceptable. It requires hardware support and IOMMU, but provides the best network performance for VMs.
