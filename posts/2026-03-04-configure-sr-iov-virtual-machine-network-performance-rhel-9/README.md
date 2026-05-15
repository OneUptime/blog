# How to Configure SR-IOV for Virtual Machine Network Performance on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, SR-IOV, Networking, Performance, Virtualization, Linux

Description: Learn how to configure SR-IOV on RHEL 9 to provide near-native network performance to KVM virtual machines through hardware-accelerated I/O.

---

SR-IOV (Single Root I/O Virtualization) allows a single physical network adapter to present itself as multiple virtual functions (VFs) that can be passed directly to VMs. This bypasses the software-based virtual switch, delivering near-native network performance with reduced CPU overhead.

## Prerequisites

- A network adapter that supports SR-IOV (Intel X520, X710, Mellanox ConnectX, etc.)
- IOMMU enabled in BIOS/UEFI (Intel VT-d or AMD-Vi)
- RHEL 9 with KVM installed

## Enabling IOMMU

Add the IOMMU kernel parameter:

For Intel:

```bash
sudo grubby --update-kernel=ALL --args="intel_iommu=on iommu=pt"
```

For AMD:

```bash
sudo grubby --update-kernel=ALL --args="iommu=pt"
```

Reboot:

```bash
sudo reboot
```

Verify:

```bash
dmesg | grep -i iommu
```

## Enabling Virtual Functions

Check if the NIC supports SR-IOV:

```bash
lspci -v | grep -A 10 "Ethernet" | grep "SR-IOV"
```

Find the maximum number of VFs:

```bash
cat /sys/class/net/ens1f0/device/sriov_totalvfs
```

Create VFs:

```bash
echo 8 | sudo tee /sys/class/net/ens1f0/device/sriov_numvfs
```

Verify VFs were created:

```bash
lspci | grep "Virtual Function"
ip link show ens1f0
```

## Making VFs Persistent

Create a udev rule:

```bash
sudo tee /etc/udev/rules.d/ens1f0-sriov.rules << 'RULE'
ACTION=="add", SUBSYSTEM=="net", ENV{ID_NET_DRIVER}=="ixgbe", ATTR{device/sriov_numvfs}="8"
RULE
```

## Assigning a VF to a VM

Find the VF PCI address:

```bash
lspci | grep "Virtual Function"
```

Example output:

```text
03:10.0 Ethernet controller: Intel Corporation 82599 Ethernet Controller Virtual Function
```

### Using virsh

```bash
sudo virsh nodedev-list | grep pci
sudo virsh nodedev-dumpxml pci_0000_03_10_0
```

Attach to VM:

```bash
sudo virsh attach-interface vmname hostdev 0000:03:10.0 --mac 52:54:00:00:00:10 --managed --live --config
```

For a shut down VM, omit `--live`.

### Using virt-install

```bash
sudo virt-install \
    --name sriov-vm \
    --memory 4096 \
    --vcpus 4 \
    --disk path=/var/lib/libvirt/images/rhel9-vm.qcow2 \
    --os-variant rhel9.3 \
    --host-device pci_0000_03_10_0 \
    --import
```

## Setting VF MAC Address

```bash
sudo ip link set ens1f0 vf 0 mac 52:54:00:00:00:10
```

## Setting VF VLAN

```bash
sudo ip link set ens1f0 vf 0 vlan 100
```

## Performance Comparison

| Method | Throughput | CPU Overhead | Latency |
|--------|-----------|--------------|---------|
| virtio (software) | ~9.5 Gbps | High | Higher |
| SR-IOV VF | ~9.9 Gbps | Very low | Near-native |
| macvtap | ~9.0 Gbps | Medium | Medium |

## Monitoring VF Status

```bash
ip link show ens1f0
```

Shows VF information including assigned MAC, VLAN, and link state.

## Limitations

- VMs with SR-IOV VFs cannot be live-migrated (the VF is hardware-bound)
- Limited number of VFs per physical function
- Requires IOMMU support
- Less flexible than software-based networking

## Summary

SR-IOV on RHEL 9 provides near-native network performance for KVM virtual machines by bypassing the virtual switch layer. Enable IOMMU, create virtual functions on the physical NIC, and assign them to VMs through PCI passthrough. While SR-IOV sacrifices live migration capability, the performance benefits make it ideal for network-intensive workloads.
