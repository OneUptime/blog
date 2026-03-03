# How to Pass-Through PCI Devices to Talos Linux VMs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, PCI Passthrough, Virtualization, Kubernetes, IOMMU

Description: A practical guide to configuring PCI device passthrough for Talos Linux virtual machines, including IOMMU setup, device binding, and Kubernetes integration.

---

PCI passthrough lets you give a virtual machine direct access to physical hardware on the host. This is useful when you need bare-metal performance for specific devices like network cards, storage controllers, or specialized accelerators. With Talos Linux, PCI passthrough opens up interesting possibilities - you can run a Kubernetes cluster on VMs while still getting native-speed access to hardware like high-speed NICs, NVMe drives, or FPGA boards.

This guide walks through the process of configuring PCI passthrough for Talos Linux VMs, covering IOMMU setup, device isolation, and making the passed-through devices available to workloads running on your cluster.

## How PCI Passthrough Works

At a high level, PCI passthrough uses a technology called IOMMU (Input/Output Memory Management Unit) to map physical device memory addresses directly to the virtual machine's memory space. On Intel systems this is called VT-d, and on AMD systems it is called AMD-Vi.

When you pass a PCI device through to a VM, the hypervisor unbinds the device from the host OS and assigns it exclusively to the guest. The guest then sees the device as if it were physically attached, with no emulation overhead.

## Prerequisites

Before starting, you need:

- A CPU and motherboard that support IOMMU (VT-d or AMD-Vi)
- IOMMU enabled in BIOS/UEFI
- A Linux-based hypervisor (KVM/QEMU, Proxmox, etc.)
- The PCI device you want to pass through
- `talosctl` installed on your workstation

## Step 1: Enable IOMMU on the Host

First, enable IOMMU in your BIOS/UEFI settings. The exact location varies by motherboard manufacturer, but look for options labeled "VT-d," "AMD-Vi," or "IOMMU."

Next, add the IOMMU kernel parameter on your host system:

```bash
# For Intel CPUs, add to GRUB_CMDLINE_LINUX in /etc/default/grub
GRUB_CMDLINE_LINUX="intel_iommu=on iommu=pt"

# For AMD CPUs
GRUB_CMDLINE_LINUX="amd_iommu=on iommu=pt"

# Rebuild grub config
sudo update-grub

# Reboot the host
sudo reboot
```

The `iommu=pt` parameter enables passthrough mode, which improves performance for devices that are not being passed through by skipping IOMMU translation for them.

After rebooting, verify that IOMMU is active:

```bash
# Check IOMMU is enabled
dmesg | grep -i iommu

# You should see lines like:
# DMAR: IOMMU enabled
# or
# AMD-Vi: AMD IOMMUv2 loaded
```

## Step 2: Identify IOMMU Groups

PCI devices are organized into IOMMU groups. All devices in the same group must be passed through together. This is a hardware constraint you cannot work around (without ACS override patches, which are not recommended for production).

```bash
# List all IOMMU groups and their devices
for g in /sys/kernel/iommu_groups/*/devices/*; do
  echo "IOMMU Group $(basename $(dirname $(dirname $g))):"
  lspci -nns $(basename $g)
done
```

Find your target device in the output and note the IOMMU group number and the device IDs. For example:

```text
IOMMU Group 14:
  03:00.0 Ethernet controller [0200]: Intel Corporation I350 Gigabit Network Connection [8086:1521] (rev 01)
  03:00.1 Ethernet controller [0200]: Intel Corporation I350 Gigabit Network Connection [8086:1521] (rev 01)
```

In this case, both ports of the Intel I350 NIC are in the same IOMMU group, so both must be passed through.

## Step 3: Bind Devices to VFIO

The VFIO (Virtual Function I/O) driver is what enables safe PCI passthrough. You need to bind your target devices to the VFIO driver instead of their native drivers.

```bash
# Load the VFIO modules
sudo modprobe vfio
sudo modprobe vfio-pci

# Create a modprobe config to bind devices at boot
# Use the vendor:device ID from the lspci output
echo "options vfio-pci ids=8086:1521" | sudo tee /etc/modprobe.d/vfio.conf

# Ensure vfio-pci loads before the native driver
echo "vfio-pci" | sudo tee /etc/modules-load.d/vfio-pci.conf

# Rebuild initramfs
sudo update-initramfs -u
```

After rebooting, verify the devices are bound to VFIO:

```bash
# Check the driver in use
lspci -nnk -s 03:00.0
# Should show: Kernel driver in use: vfio-pci
```

## Step 4: Configure QEMU/KVM for Passthrough

With the device bound to VFIO, you can now attach it to a Talos Linux VM:

```bash
# Start a Talos VM with PCI passthrough
qemu-system-x86_64 \
  -enable-kvm \
  -cpu host \
  -smp 4 \
  -m 4096 \
  -drive file=talos-node.qcow2,format=qcow2,if=virtio \
  -device vfio-pci,host=03:00.0 \
  -device vfio-pci,host=03:00.1 \
  -cdrom metal-amd64.iso \
  -boot d
```

The `-device vfio-pci,host=03:00.0` line tells QEMU to pass the physical PCI device at address 03:00.0 directly to the VM.

## Step 5: Passthrough on Proxmox

If you are using Proxmox, the process is a bit more streamlined through its configuration tools:

```bash
# Edit the VM config to add PCI passthrough
qm set 100 --hostpci0 03:00.0,03:00.1

# If the device requires a specific ROM, you can specify it
qm set 100 --hostpci0 03:00.0,rombar=1

# Set the machine type to q35 for better IOMMU support
qm set 100 --machine q35
```

The q35 machine type provides a more modern chipset emulation that handles IOMMU groups better than the default i440fx type.

## Step 6: Verify the Device Inside Talos

Once the Talos VM boots with the passed-through device, you can verify that it sees the hardware:

```bash
# List PCI devices visible to the Talos node
talosctl -n <NODE_IP> get hardwareaddresses

# Check kernel messages for device detection
talosctl -n <NODE_IP> dmesg | grep -i "03:00"
```

The device should appear with its native driver loaded inside Talos. For example, an Intel I350 NIC would show up with the `igb` driver.

## Using Passed-Through Devices in Kubernetes

Once the device is visible inside the Talos node, you can make it available to Kubernetes pods using device plugins. For network devices, tools like Multus CNI allow pods to attach directly to the passed-through NIC:

```yaml
# Example NetworkAttachmentDefinition for a passed-through NIC
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: direct-nic
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "type": "host-device",
      "device": "eth1",
      "ipam": {
        "type": "static",
        "addresses": [
          {"address": "192.168.1.100/24"}
        ]
      }
    }
```

For other types of devices like storage controllers or accelerators, the Kubernetes device plugin framework handles advertising the devices to the scheduler.

## Troubleshooting

If the VM fails to start with VFIO errors, check that all devices in the IOMMU group are unbound from their native drivers. A single device still using its native driver can prevent passthrough for the entire group.

If the device appears inside the VM but does not function correctly, make sure the Talos image includes the necessary kernel module. You may need to build a custom Talos image with the required driver using Talos's system extensions.

If you see IOMMU fault messages in the host kernel logs, this usually indicates that the IOMMU group isolation is not clean. Try using a different PCI slot on the motherboard, as some slots share IOMMU groups with chipset devices.

## Wrapping Up

PCI passthrough gives Talos Linux VMs direct access to physical hardware, combining the flexibility of virtualization with the performance of bare metal. While the setup requires some host-level configuration, once it is working, the passed-through devices behave exactly as they would on a physical machine. This makes it possible to run high-performance networking, storage, and accelerator workloads on a virtualized Talos cluster without sacrificing throughput.
