# How to Understand Feature Support and Limitations in RHEL 9 Virtualization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Virtualization, Support, Features, Linux

Description: Learn about supported features, known limitations, and compatibility considerations for KVM virtualization on RHEL 9.

---

RHEL 9 KVM virtualization provides a comprehensive set of features, but understanding what is supported, what has limitations, and what is unsupported helps you make informed decisions about your virtualization architecture.

## Supported Machine Types

RHEL 9 supports two machine types:

- **q35** (recommended) - Modern machine type with PCIe, AHCI, and better device support
- **i440fx** - Legacy machine type, being phased out

Always use q35 for new VMs:

```bash
sudo virt-install --machine q35 ...
```

## Maximum VM Limits

| Resource | Maximum |
|----------|---------|
| vCPUs per VM | 710 |
| Memory per VM | 12 TB |
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
- VM snapshots (internal and external)
- CPU and memory hot-add
- PCI device passthrough
- SR-IOV
- UEFI boot with Secure Boot
- virtio paravirtualized drivers
- Cockpit web management
- Memory ballooning
- vhost-net for network acceleration

### Technology Preview

Some features are available but not fully supported:

- virtiofs (shared file system)
- Intel SGX for VMs
- AMD SEV (Secure Encrypted Virtualization)

Check the release notes for the current list.

## Known Limitations

### Live Migration

- Requires compatible CPU features on source and destination
- VM disk images must be on shared storage
- PCI passthrough devices prevent live migration
- Large memory VMs take longer to migrate

### Snapshots

- Internal snapshots have performance overhead
- Raw format disks do not support internal snapshots
- External snapshots require manual management

### CPU

- Guest vCPUs cannot exceed host physical CPUs for optimal performance
- CPU feature mismatch between hosts affects migration

### Memory

- Memory hot-remove is not supported
- Memory hot-add requires guest OS support

### Storage

- Live storage migration has limitations with certain configurations
- iSCSI multipath requires careful configuration

## Deprecated Features in RHEL 9

- virt-manager (use Cockpit instead)
- virtio-transitional devices (use virtio non-transitional)
- Legacy BIOS boot for new VMs (UEFI recommended)

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
