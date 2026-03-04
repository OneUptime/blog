# How to Enable and Configure SR-IOV Network Virtual Functions on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking

Description: Step-by-step guide on enable and configure sr-iov network virtual functions on rhel 9 with practical examples and commands.

---

SR-IOV (Single Root I/O Virtualization) provides hardware-level network virtual functions on RHEL 9 for high-performance networking.

## Verify SR-IOV Support

```bash
lspci -v | grep -i "single root"
# Or check specific NIC
lspci -s 03:00.0 -v | grep -i "SR-IOV"
```

## Enable SR-IOV in BIOS

Ensure VT-d (Intel) or AMD-Vi is enabled in BIOS settings.

## Enable IOMMU

```bash
sudo grubby --update-kernel=ALL --args="intel_iommu=on iommu=pt"
sudo reboot
```

## Verify IOMMU

```bash
dmesg | grep -i iommu
```

## Create Virtual Functions

```bash
# Check current VFs
cat /sys/class/net/eth0/device/sriov_numvfs

# Create VFs
echo 4 | sudo tee /sys/class/net/eth0/device/sriov_numvfs
```

## Make VF Creation Persistent

```bash
sudo tee /etc/udev/rules.d/99-sriov.rules <<EOF
ACTION=="add", SUBSYSTEM=="net", ENV{ID_NET_DRIVER}=="ixgbe", ATTR{device/sriov_numvfs}="4"
EOF
```

## Verify Virtual Functions

```bash
lspci | grep "Virtual Function"
ip link show eth0
```

## Assign VFs to Virtual Machines

```bash
# Detach VF from host
sudo virsh nodedev-detach pci_0000_03_02_0

# Attach to VM
sudo virsh attach-interface --domain vm1 --type hostdev \
  --source 03:02.0 --model virtio --config
```

## Configure VF MAC Address and VLAN

```bash
sudo ip link set eth0 vf 0 mac 52:54:00:12:34:56
sudo ip link set eth0 vf 0 vlan 100
```

## Conclusion

SR-IOV on RHEL 9 provides near-native network performance for virtual machines by bypassing the hypervisor for data plane traffic. Use it for workloads requiring high throughput and low latency in virtualized environments.

