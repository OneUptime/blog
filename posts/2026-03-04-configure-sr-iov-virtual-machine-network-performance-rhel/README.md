# How to Configure SR-IOV for Virtual Machine Network Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, SR-IOV, Networking, Performance, Virtualization, Linux

Description: Learn how to configure SR-IOV (Single Root I/O Virtualization) on RHEL to provide near-native network performance for KVM virtual machines by passing virtual functions directly to guests.

---

SR-IOV allows a single physical network adapter to present itself as multiple virtual network devices called Virtual Functions (VFs). Each VF can be assigned directly to a VM, bypassing the software bridge and achieving near-native network performance with lower CPU overhead.

## Prerequisites

- A network adapter that supports SR-IOV (Intel X520, X710, Mellanox ConnectX, etc.)
- IOMMU enabled in BIOS and kernel
- VT-d (Intel) or AMD-Vi enabled in BIOS

## Enabling IOMMU

```bash
# Check if IOMMU is currently enabled
dmesg | grep -i iommu

# Enable IOMMU in the kernel boot parameters
sudo grubby --update-kernel=ALL --args="intel_iommu=on iommu=pt"
# For AMD systems: amd_iommu=on iommu=pt

# Reboot to apply
sudo systemctl reboot

# Verify IOMMU is active after reboot
dmesg | grep -i "IOMMU enabled"
```

## Creating Virtual Functions

```bash
# Check if the NIC supports SR-IOV
lspci | grep -i ethernet
# Note the PCI address (e.g., 03:00.0)

# Check the maximum number of VFs supported
cat /sys/class/net/ens3f0/device/sriov_totalvfs

# Create VFs (e.g., 4 virtual functions)
echo 4 | sudo tee /sys/class/net/ens3f0/device/sriov_numvfs

# Verify VFs were created
lspci | grep "Virtual Function"
ip link show ens3f0
```

## Making VFs Persistent Across Reboots

```bash
# Create a udev rule or systemd service
sudo tee /etc/systemd/system/sriov-vfs.service << 'EOF'
[Unit]
Description=Create SR-IOV Virtual Functions
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'echo 4 > /sys/class/net/ens3f0/device/sriov_numvfs'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable sriov-vfs.service
```

## Assigning a VF to a Virtual Machine

```bash
# Find the PCI address of a VF
lspci | grep "Virtual Function"
# Example output: 03:10.0 Ethernet controller: Intel Virtual Function

# Create a hostdev XML for the VF
cat << 'EOF' > /tmp/sriov-vf.xml
<interface type='hostdev' managed='yes'>
  <source>
    <address type='pci' domain='0x0000' bus='0x03' slot='0x10' function='0x0'/>
  </source>
</interface>
EOF

# Attach the VF to a VM
sudo virsh attach-device rhel9-vm /tmp/sriov-vf.xml --live --config
```

## Verifying SR-IOV in the Guest

```bash
# Inside the VM, check the network interface
ip addr show

# The VF appears as a regular network interface (e.g., ens5)
# Run a bandwidth test to verify performance
iperf3 -c server-ip
```

## Troubleshooting

```bash
# Check if VFs are properly created
ip link show ens3f0 | grep vf

# Verify IOMMU groups
find /sys/kernel/iommu_groups/ -type l | sort -V

# Check for errors
dmesg | grep -i "sriov\|vf\|iommu"
```

SR-IOV provides the best network performance for VMs but sacrifices live migration capability since the VF is tied to physical hardware. Use SR-IOV for latency-sensitive workloads like databases and use virtio for VMs that need live migration.
