# How to Pass Through PCI Devices (GPU, NIC) to Virtual Machines on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, PCI Passthrough, GPU, Virtualization, VFIO, Linux

Description: Learn how to pass PCI devices like GPUs and network cards directly to KVM virtual machines on RHEL 9 using VFIO for near-native hardware performance.

---

PCI passthrough assigns a physical PCI device directly to a virtual machine, giving the VM exclusive access to the hardware. This is essential for GPU computing, hardware-accelerated workloads, and specialized network adapters that need native driver support inside the VM.

## Prerequisites

- IOMMU support (Intel VT-d or AMD-Vi) enabled in BIOS
- Device must be in its own IOMMU group (or all devices in the group must be passed through)
- VFIO kernel modules

## Enabling IOMMU

For Intel:

```bash
sudo grubby --update-kernel=ALL --args="intel_iommu=on iommu=pt"
```

For AMD:

```bash
sudo grubby --update-kernel=ALL --args="amd_iommu=on iommu=pt"
```

Reboot and verify:

```bash
dmesg | grep -i iommu
```

## Identifying the Device

Find the PCI device:

```bash
lspci -nn | grep -i nvidia
lspci -nn | grep -i ethernet
```

Example output:

```text
01:00.0 VGA compatible controller [0300]: NVIDIA Corporation [10de:2204]
01:00.1 Audio device [0403]: NVIDIA Corporation [10de:1aef]
```

Note the PCI address (01:00.0) and device ID (10de:2204).

## Checking IOMMU Groups

```bash
for d in /sys/kernel/iommu_groups/*/devices/*; do
    n=${d#*/iommu_groups/*}; n=${n%%/*}
    echo "IOMMU Group $n: $(lspci -nns ${d##*/})"
done | sort -V
```

All devices in the same IOMMU group must be passed through together (or isolated).

## Binding Device to VFIO

### Unbind from Current Driver

```bash
echo "0000:01:00.0" | sudo tee /sys/bus/pci/devices/0000:01:00.0/driver/unbind
```

### Load VFIO Modules

```bash
sudo modprobe vfio-pci
```

### Bind to vfio-pci

```bash
echo "10de 2204" | sudo tee /sys/bus/pci/drivers/vfio-pci/new_id
```

### Making It Persistent

Create a modprobe configuration:

```bash
sudo tee /etc/modprobe.d/vfio.conf << 'MODCONF'
options vfio-pci ids=10de:2204,10de:1aef
MODCONF
```

Load vfio-pci early:

```bash
sudo tee /etc/dracut.conf.d/vfio.conf << 'DRACUT'
add_drivers+=" vfio vfio_iommu_type1 vfio_pci "
DRACUT
sudo dracut -f
```

## Attaching Device to a VM

### Using virsh

List available devices:

```bash
sudo virsh nodedev-list --cap pci | grep 01_00
sudo virsh nodedev-dumpxml pci_0000_01_00_0
```

Attach:

```bash
cat > /tmp/gpu-passthrough.xml << 'XMLEOF'
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x01' slot='0x00' function='0x0'/>
  </source>
</hostdev>
XMLEOF

sudo virsh attach-device vmname /tmp/gpu-passthrough.xml --persistent
```

### Using virt-install

```bash
sudo virt-install \
    --name gpu-vm \
    --memory 16384 \
    --vcpus 8 \
    --disk size=100 \
    --os-variant rhel9.3 \
    --host-device pci_0000_01_00_0 \
    --host-device pci_0000_01_00_1 \
    --boot uefi
```

## GPU Passthrough Considerations

For NVIDIA GPUs:

- Pass both the GPU (VGA) and its audio device
- Use UEFI boot for the VM
- Some NVIDIA drivers detect VM environments; use hidden state:

```xml
<features>
  <kvm>
    <hidden state='on'/>
  </kvm>
</features>
```

## Verifying Passthrough Inside the VM

Inside the guest:

```bash
lspci | grep -i nvidia
```

The device should appear as if it were physical hardware.

## Limitations

- The device is exclusively owned by the VM
- Live migration is not possible with passed-through devices
- Not all devices support passthrough cleanly
- IOMMU group isolation may require ACS override patches

## Summary

PCI passthrough on RHEL 9 provides near-native hardware access for VMs by assigning physical devices through VFIO. Enable IOMMU, bind devices to the vfio-pci driver, and attach them to VMs using virsh or virt-install. This is essential for GPU computing, high-performance networking, and specialized hardware workloads, though it sacrifices live migration capability.
