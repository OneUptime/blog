# How to Understand Feature Support and Limitations in RHEL Virtualization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Virtualization, Compatibility, Support, Linux

Description: Learn about the supported features, limitations, and compatibility guidelines for KVM virtualization on RHEL, including guest OS support and resource maximums.

---

RHEL virtualization with KVM has specific support boundaries for guest operating systems, resource limits, and features. Understanding these limits helps you design reliable virtualization environments within Red Hat's support scope.

## Checking Supported Configurations

```bash
# Validate your host meets virtualization requirements
sudo virt-host-validate

# Check the KVM and libvirt versions
rpm -q qemu-kvm libvirt
virsh version
```

## Resource Maximums (RHEL 9)

Key resource limits for KVM on RHEL 9:

```bash
# Maximum vCPUs per VM: 710 (depends on host CPU)
# Maximum memory per VM: 16 TB
# Maximum virtual disks per VM: varies by bus type
#   - virtio-blk: up to 28 disks
#   - virtio-scsi: up to 508 disks
# Maximum VMs per host: limited by available resources
# Maximum virtual NICs per VM: 28 (virtio)

# Check your host's maximum supported vCPUs
virsh capabilities | grep -A2 '<vcpu'

# Check available memory
free -h
```

## Supported Guest Operating Systems

```bash
# List known operating system variants that virt-install supports
osinfo-query os | grep -E "rhel|win|centos|fedora|ubuntu"

# RHEL supports these guest types:
# - RHEL 7, 8, 9 (fully supported)
# - Windows Server 2016, 2019, 2022 (supported with virtio drivers)
# - CentOS Stream
# - Fedora (recent versions)
# - Select SUSE and Ubuntu versions
```

## Feature Support Matrix

```bash
# Check which features are supported on your host
sudo virt-host-validate qemu

# Supported features include:
# - Live migration (between compatible hosts)
# - Snapshots (internal and external)
# - SR-IOV passthrough
# - USB passthrough
# - PCI passthrough
# - virtio devices
# - UEFI and Secure Boot
# - Nested virtualization (tech preview)
```

## Known Limitations

```bash
# Some features have specific requirements or limitations:

# 1. Live migration requires:
#    - Same or compatible CPU models
#    - Shared storage accessible from both hosts
#    - Same libvirt and QEMU versions (recommended)

# 2. Snapshots:
#    - Internal snapshots are slower but simpler
#    - External snapshots require manual block commit to merge

# 3. Check for deprecated features
sudo journalctl -u libvirtd | grep -i "deprecat"
```

## Checking CPU Model Compatibility

```bash
# List supported CPU models
virsh cpu-models x86_64

# Check compatibility between two hosts for migration
virsh cpu-compare /path/to/cpu-definition.xml

# Show the host CPU baseline
virsh cpu-baseline <(virsh capabilities)
```

## Windows Guest Considerations

```bash
# Windows guests need virtio drivers for best performance
# Download virtio-win ISO from Red Hat
# Attach it as a secondary CDROM during installation

# Check if virtio-win package is available
sudo dnf list virtio-win
sudo dnf install -y virtio-win

# The ISO is available at:
ls /usr/share/virtio-win/
```

Always check the Red Hat Customer Portal for the latest certified guest OS list and feature support matrix. Running unsupported configurations may work but will not receive assistance from Red Hat support.
