# How to Understand Feature Support and Limitations in RHEL 9 Virtualization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Virtualization, Support, Feature, Linux

Description: Learn about supported features, known limitations, and compatibility considerations for KVM virtualization on RHEL 9.

---

RHEL 9 KVM virtualization provides a comprehensive set of features, but understanding what is supported, what has limitations, and what is unsupported helps you make informed decisions about your virtualization architecture.

## Supported Machine Types

RHEL 9 supports architecture-specific machine types:

- **q35** (recommended on AMD64 and Intel 64) - Modern machine type with PCIe, AHCI, and better device support
- **i440fx** - Older x86 machine types are still supported only for certain RHEL 7.6 and later variants; RHEL 7.5-based and earlier machine types are unsupported

Always use q35 for new VMs:

```bash
sudo virt-install --machine=q35 ...
```

## Maximum VM Limits

| Resource | Maximum |
|----------|---------|
| vCPUs per VM | 4096 on AMD64 and Intel 64 with RHEL 9.6 or later; 710 on RHEL 9.5 and earlier |
| Memory per VM | 16 TB on AMD64 and Intel 64 |
| Virtual disks per VM | Depends on bus type |
| VMs per host | Limited by host resources |
| virtio-blk disks | 28 |
| virtio-scsi disks | Thousands |

## Supported Guest Operating Systems

RHEL 9 KVM supports:

- RHEL 7, 8, 9
- CentOS Stream 8, 9
- Windows Server 2016, 2019, 2022
- Windows 10, 11
- SUSE Linux Enterprise 12, 15
- Ubuntu (various LTS versions)

Check the full compatibility matrix in Red Hat documentation.

## Supported Features

### Fully Supported

- Live migration between compatible hosts
- External VM snapshots on RHEL 9.4 or later when support requirements are met
- CPU hot-add on supported architectures and memory hot-plug with virtio-mem
- PCI device passthrough
- SR-IOV
- UEFI boot with Secure Boot
- virtio paravirtualized drivers
- Cockpit web management
- Memory ballooning
- vhost-net for network acceleration

### Technology Preview

Some features are available but not fully supported:

- Nested KVM virtualization
- Intel SGX for VMs
- AMD SEV, SEV-ES, and SEV-SNP for VMs

Check the release notes for the current list.

## Known Limitations

### Live Migration

- Requires compatible CPU features on source and destination
- VM disk images normally use shared storage unless using a supported migration mode that copies storage
- PCI passthrough devices prevent live migration
- Large memory VMs take longer to migrate

### Snapshots

- Red Hat supports VM snapshots only when they are external snapshots
- External snapshots require RHEL 9.4 or later, file-based storage, and supported snapshot options
- Internal snapshots are deprecated and should not be used in production environments

### CPU

- Guest vCPUs cannot exceed host physical CPUs for optimal performance
- CPU feature mismatch between hosts affects migration

### Memory

- Memory hot-unplug requires virtio-mem and guest OS support
- Memory hot-add requires virtio-mem and guest OS support

### Storage

- Moving a VM disk to another location while the VM is running on a single host is not supported
- iSCSI multipath requires careful configuration

## Deprecated Features in RHEL 9

- virt-manager (use Cockpit instead)
- libvirtd (use modular libvirt daemons instead)
- qcow2-v2 disk image format (use qcow2-v3 instead)
- Virtual floppy devices

## Getting Support Information

```bash
# Check RHEL virtualization capabilities

sudo virt-host-validate

# Check libvirt version
virsh version

# Check QEMU capabilities
virsh domcapabilities
```

## Summary

RHEL 9 virtualization provides a robust feature set with clear support boundaries. Use q35 machine type, UEFI firmware, and virtio drivers for new VMs. Be aware of live migration requirements, snapshot limitations, and deprecated features. Check Red Hat documentation for the latest support matrix and technology preview status.
