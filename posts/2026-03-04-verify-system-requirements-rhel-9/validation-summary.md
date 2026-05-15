# Validation Summary: How to Verify System Requirements Before Installing RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux CPU architecture checks
- Linux memory and disk inspection commands
- PCI hardware, network, storage, and GPU discovery
- UEFI, Legacy BIOS, and Secure Boot
- KVM/libvirt, VMware, and Hyper-V virtualization

## Sources Consulted
- Red Hat Documentation: RHEL 9 system requirements and supported architectures, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/system-requirements-and-supported-architectures_rhel-installer
- Red Hat Documentation: RHEL 9.0 release notes architectures, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/architectures
- Red Hat Customer Portal: Red Hat Enterprise Linux Technology Capabilities and Limits, https://access.redhat.com/articles/rhel-limits
- Red Hat Ecosystem Catalog hardware certification, https://catalog.redhat.com/hardware
- Microsoft Learn: Supported CentOS and Red Hat Enterprise Linux virtual machines on Hyper-V, https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-centos-and-red-hat-enterprise-linux-virtual-machines-on-hyper-v
- Local command help for `lscpu`, `lsblk`, and `ethtool`

## Issues Found
- The requirements section referred broadly to "RHEL" while the architecture baseline, Fedora 34 lineage, kernel 5.14, and memory values are specific to RHEL 9. Updated the wording to say "RHEL 9" where needed.
- The HTTP, HTTPS, and FTP network installation RAM row used a broad "3 GiB to 4 GiB" range. Replaced it with Red Hat's exact RHEL 9 values: 3 GiB for s390x, 3.5 GiB for x86_64, and 4 GiB for aarch64 and ppc64le.
- The disk table labeled "Minimal install" as the 10 GB minimum. Red Hat documents 10 GiB as the minimum available disk space for installing RHEL 9 generally, so the row now says "Any RHEL 9 install."
- The Hyper-V guidance said Windows Server 2019 or later. Microsoft documents RHEL VM support, including Generation 2 UEFI boot, on Windows Server 2016 and later, so the line now says Windows Server 2016 or later.

## Review Notes
The shell commands in the post use valid common Linux utilities and options. The `ethtool -i eno1` example assumes the interface is named `eno1`; users may need to substitute their actual interface name.
