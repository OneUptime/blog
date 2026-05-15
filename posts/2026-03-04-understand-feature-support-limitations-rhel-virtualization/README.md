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

Resource Maximums (RHEL 9)

Key resource limits for KVM on RHEL 9:

```bash
# Maximum vCPUs per VM on AMD64/Intel 64:
#   - RHEL 9.5 and earlier: 710
#   - RHEL 9.6 and later: 4096
# Maximum memory per VM: 16 TB
# Maximum virtual disks per VM: depends on device type, controller, and PCI topology
#   - IDE is limited to 4 virtualized devices
#   - virtio-scsi is preferred for larger disk counts
# Maximum VMs per host: limited by available resources
# Maximum virtual NICs per VM: limited by available PCI device slots and topology

# Check your host's maximum supported vCPUs
virsh capabilities | grep -A2 '<vcpu'

# Check available memory
free -h
```

## Supported Guest Operating Systems

```bash
# List known operating system variants that virt-install supports
osinfo-query os | grep -E "rhel|win|centos|fedora|ubuntu"

# osinfo data helps select installation defaults; it is not the Red Hat support matrix.
# On AMD64 and Intel 64 RHEL 9 KVM hosts, Red Hat's certified guest list includes:
# - RHEL 7, 8, and 9
# - RHEL 10 on RHEL 9.6 and later hosts
# - Windows 10 and 11
# - Windows Server 2016, 2019, and 2022
# - Windows Server 2025 on RHEL 9.4 and later hosts
# Guests that are not listed are handled under Red Hat's third-party software support policy.
```

## Feature Support Matrix

```bash
# Check which features are supported on your host
sudo virt-host-validate qemu

# Supported features include:
# - Live migration (between compatible hosts)
# - External snapshots on RHEL 9.4 and later, when the support requirements are met
# - SR-IOV devices on supported architectures; SR-IOV InfiniBand networking is unsupported
# - USB passthrough on supported architectures
# - PCI passthrough
# - virtio devices
# - UEFI and Secure Boot where available for the host architecture
# - Nested virtualization in the limited supported Windows with WSL2 case; otherwise technology preview in most environments
```

## Known Limitations

```bash
# Some features have specific requirements or limitations:

# 1. Live migration requires:
#    - Source and destination hosts that use supported RHEL versions and machine types
#    - CPU features compatible with the destination host
#    - VM disk images accessible from both hosts, or a supported storage-copy migration option

# 2. Snapshots:
#    - Red Hat supports VM snapshots on RHEL only with external snapshots
#    - External snapshots require RHEL 9.4 or later, file-based storage, and supported creation options
#    - Internal snapshots are deprecated in RHEL 9 and should not be used in production

# 3. Check for deprecated features
sudo journalctl -u virtqemud -u libvirtd | grep -i "deprecat"
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
