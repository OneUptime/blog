# How to Configure Virtual Machine Boot Order and Firmware (UEFI/BIOS) on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, UEFI, BIOS, Boot, Virtualization, Linux

Description: Learn how to configure UEFI and BIOS firmware settings and boot order for KVM virtual machines on RHEL 9.

---

KVM virtual machines on RHEL 9 can boot using either traditional BIOS or UEFI firmware. The choice affects Secure Boot capabilities, disk partitioning (GPT vs MBR), and compatibility with guest operating systems. You can also configure the boot device order to control how VMs start.

## BIOS vs UEFI

| Feature | BIOS (SeaBIOS) | UEFI (OVMF) |
|---------|---------------|--------------|
| Disk scheme | MBR | GPT |
| Max disk size | 2 TB | 9.4 ZB |
| Secure Boot | No | Yes |
| Boot speed | Fast | Faster |
| Default | Yes | No |

## Creating a UEFI VM

Install UEFI firmware:

```bash
sudo dnf install edk2-ovmf
```

Create a VM with UEFI:

```bash
sudo virt-install \
    --name uefi-vm \
    --memory 2048 \
    --vcpus 2 \
    --disk size=20 \
    --cdrom /var/lib/libvirt/images/rhel9.iso \
    --os-variant rhel9.3 \
    --boot uefi
```

### Enabling Secure Boot

```bash
sudo virt-install \
    --name secureboot-vm \
    --memory 2048 \
    --vcpus 2 \
    --disk size=20 \
    --cdrom /var/lib/libvirt/images/rhel9.iso \
    --os-variant rhel9.3 \
    --boot uefi,firmware.feature0.name=secure-boot,firmware.feature0.enabled=yes
```

## Configuring Boot Order

### Setting Boot Devices in XML

```bash
sudo virsh edit vmname
```

```xml
<os>
  <type arch='x86_64' machine='q35'>hvm</type>
  <boot dev='hd'/>
  <boot dev='cdrom'/>
  <boot dev='network'/>
</os>
```

Boot order: hard disk first, then CD-ROM, then network (PXE).

### Per-Device Boot Order

For more granular control:

```xml
<os>
  <type arch='x86_64' machine='q35'>hvm</type>
</os>
...
<disk type='file' device='disk'>
  <boot order='1'/>
  ...
</disk>
<disk type='file' device='cdrom'>
  <boot order='3'/>
  ...
</disk>
<interface type='network'>
  <boot order='2'/>
  ...
</interface>
```

### Temporary Boot from CD-ROM

Boot once from CD-ROM without changing the permanent configuration:

```bash
sudo virsh start vmname --boot cdrom
```

## Converting BIOS to UEFI

This is not a simple conversion. You typically need to:

1. Create a new UEFI VM
2. Attach the old disk as a secondary
3. Reinstall the OS or migrate data

Direct conversion is not supported because BIOS uses MBR partitioning while UEFI requires GPT.

## Checking Current Firmware

```bash
sudo virsh dumpxml vmname | grep -A5 '<os>'
```

BIOS:

```xml
<os>
  <type arch='x86_64' machine='pc-q35-rhel9.2.0'>hvm</type>
</os>
```

UEFI:

```xml
<os firmware='efi'>
  <type arch='x86_64' machine='q35'>hvm</type>
</os>
```

## Summary

KVM VMs on RHEL 9 support both BIOS and UEFI firmware. Use UEFI for Secure Boot, GPT partitioning, and modern OS requirements. Configure boot order through VM XML either globally or per-device. Install the edk2-ovmf package for UEFI support and use `--boot uefi` with virt-install for new VMs.
