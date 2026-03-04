# How to Configure Virtual Machine Boot Order and Firmware (UEFI/BIOS) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, UEFI, BIOS, Boot Order, Virtualization, Linux

Description: Learn how to configure boot order and select between UEFI and BIOS firmware for KVM virtual machines on RHEL, including Secure Boot support.

---

KVM virtual machines on RHEL can use either traditional BIOS (SeaBIOS) or UEFI (OVMF) firmware. UEFI is required for Secure Boot, GPT disk layouts larger than 2TB, and some modern operating systems. You can also control the boot device order.

## Checking Current Firmware Type

```bash
# View the firmware configuration of a VM
sudo virsh dumpxml rhel9-vm | grep -A5 '<os>'

# BIOS firmware (default):
# <os>
#   <type arch='x86_64' machine='pc-q35'>hvm</type>
# </os>

# UEFI firmware:
# <os>
#   <type arch='x86_64' machine='q35'>hvm</type>
#   <loader readonly='yes' type='pflash'>/usr/share/OVMF/OVMF_CODE.secboot.fd</loader>
#   <nvram>/var/lib/libvirt/qemu/nvram/rhel9-vm_VARS.fd</nvram>
# </os>
```

## Installing UEFI Firmware Packages

```bash
# Install the OVMF UEFI firmware for x86_64 VMs
sudo dnf install -y edk2-ovmf

# Verify the firmware files are available
ls /usr/share/OVMF/
```

## Creating a UEFI VM

```bash
# Create a new VM with UEFI firmware
sudo virt-install \
  --name rhel9-uefi \
  --memory 4096 \
  --vcpus 2 \
  --disk size=20 \
  --cdrom /var/lib/libvirt/images/rhel-9.4-x86_64-dvd.iso \
  --os-variant rhel9.4 \
  --network network=default \
  --boot uefi \
  --graphics vnc
```

## Creating a UEFI VM with Secure Boot

```bash
# Create a VM with UEFI Secure Boot enabled
sudo virt-install \
  --name rhel9-secureboot \
  --memory 4096 \
  --vcpus 2 \
  --disk size=20 \
  --cdrom /var/lib/libvirt/images/rhel-9.4-x86_64-dvd.iso \
  --os-variant rhel9.4 \
  --network network=default \
  --boot uefi,loader.secure=yes \
  --graphics vnc
```

## Configuring Boot Order

```bash
# Set boot order: disk first, then cdrom, then network
sudo virsh edit rhel9-vm

# Modify the <os> section:
# <os>
#   <type arch='x86_64'>hvm</type>
#   <boot dev='hd'/>
#   <boot dev='cdrom'/>
#   <boot dev='network'/>
# </os>
```

## Per-Device Boot Order

For more granular control, use per-device boot order:

```bash
# Edit the VM XML
sudo virsh edit rhel9-vm

# Add boot order to individual devices:
# <disk type='file' device='disk'>
#   <boot order='1'/>
#   ...
# </disk>
# <interface type='network'>
#   <boot order='2'/>
#   ...
# </interface>
# <disk type='file' device='cdrom'>
#   <boot order='3'/>
#   ...
# </disk>

# Note: remove <boot dev='...'/> from <os> when using per-device order
```

## Converting BIOS VM to UEFI

```bash
# This requires reinstalling the guest OS
# 1. Back up data from the existing VM
# 2. Delete the old VM
sudo virsh undefine rhel9-vm

# 3. Create a new VM with UEFI pointing to the installation media
# The guest OS must be reinstalled with UEFI partitioning (GPT + ESP)
```

UEFI firmware is recommended for new VMs on RHEL. It supports Secure Boot, modern partition layouts, and is required by some operating systems. Existing BIOS-based VMs cannot be converted to UEFI without reinstalling the guest OS.
