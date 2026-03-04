# How to Enable and Configure SR-IOV Network Virtual Functions on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SR-IOV, Networking, Virtualization, VF, Performance

Description: Learn how to enable and configure SR-IOV (Single Root I/O Virtualization) virtual functions on RHEL for near-native network performance in virtual machines.

---

SR-IOV allows a single physical NIC to present multiple virtual functions (VFs) to the OS, each appearing as an independent network device. VFs can be passed directly to VMs, bypassing the hypervisor's virtual switch for near-native performance.

## Prerequisites

SR-IOV requires hardware support (NIC and CPU) and must be enabled in the BIOS/UEFI:

```bash
# Verify IOMMU is enabled
dmesg | grep -i iommu

# Check if the NIC supports SR-IOV
lspci -v -s $(lspci | grep Ethernet | head -1 | awk '{print $1}') | grep -i "sr-iov"
```

## Enabling IOMMU

```bash
# For Intel CPUs, add intel_iommu=on to kernel parameters
sudo grubby --update-kernel=ALL --args="intel_iommu=on iommu=pt"

# For AMD CPUs
sudo grubby --update-kernel=ALL --args="amd_iommu=on iommu=pt"

# Reboot to apply
sudo reboot
```

## Creating Virtual Functions

```bash
# Check maximum VFs supported
cat /sys/class/net/ens192/device/sriov_totalvfs

# Create 4 virtual functions
echo 4 | sudo tee /sys/class/net/ens192/device/sriov_numvfs

# Verify VFs were created
lspci | grep "Virtual Function"
ip link show ens192
```

## Making VFs Persistent

```bash
# Create a udev rule for persistent VF creation
cat << 'UDEV' | sudo tee /etc/udev/rules.d/99-sriov.rules
ACTION=="add", SUBSYSTEM=="net", ENV{ID_NET_DRIVER}=="ixgbe", \
  ATTR{device/sriov_numvfs}="4"
UDEV

# Or use a systemd service
cat << 'SERVICE' | sudo tee /etc/systemd/system/sriov-vfs.service
[Unit]
Description=Create SR-IOV Virtual Functions
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'echo 4 > /sys/class/net/ens192/device/sriov_numvfs'

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl enable sriov-vfs
```

## Configuring VF Properties

```bash
# Set MAC address on a VF
sudo ip link set ens192 vf 0 mac 00:11:22:33:44:55

# Set VLAN on a VF
sudo ip link set ens192 vf 0 vlan 100

# Set rate limiting (in Mbps)
sudo ip link set ens192 vf 0 max_tx_rate 1000

# Enable/disable spoofcheck
sudo ip link set ens192 vf 0 spoofchk on

# View VF configuration
ip link show ens192
```

## Assigning VFs to VMs (libvirt)

```xml
<!-- Add to VM XML configuration -->
<interface type='hostdev' managed='yes'>
  <source>
    <address type='pci' domain='0x0000' bus='0x03' slot='0x10' function='0x0'/>
  </source>
</interface>
```

```bash
# Attach VF to a running VM
virsh attach-interface myvm hostdev 0000:03:10.0 --managed
```

SR-IOV VFs provide significantly lower latency and higher throughput than virtio or emulated networking. They are recommended for network-intensive VM workloads such as NFV and high-frequency trading.
