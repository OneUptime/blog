# Validation Summary: How to Understand Feature Support and Limitations in RHEL Virtualization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM virtualization
- libvirt and virsh
- virt-host-validate
- libosinfo and osinfo-query
- Windows virtio drivers
- VM snapshots and live migration

## Sources Consulted
- Red Hat Documentation: Feature support and limitations in RHEL 9 virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_feature-support-and-limitations-in-rhel-9-virtualization_configuring-and-managing-virtualization
- Red Hat Customer Portal: Virtualization limits for Red Hat Enterprise Linux with KVM: https://access.redhat.com/articles/rhel-kvm-limits
- Red Hat Customer Portal: Certified Hypervisors and Guest Operating Systems in Red Hat OpenStack Platform, Red Hat Virtualization, Red Hat OpenShift Virtualization and Red Hat Enterprise Linux with KVM: https://access.redhat.com/articles/certified-hypervisors
- Red Hat Documentation: Creating nested virtual machines in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/creating-nested-virtual-machines_configuring-and-managing-virtualization
- Red Hat Documentation: Support limitations for virtual machine snapshots in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/creating-virtual-machine-snapshots_configuring-and-managing-virtualization
- Red Hat Documentation: Migrating virtual machines in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/migrating-virtual-machines_configuring-and-managing-virtualization
- libvirt virsh manual: https://www.libvirt.org/manpages/virsh.html
- libvirt virt-host-validate manual: https://libvirt.org/manpages/virt-host-validate.html
- Red Hat Customer Portal: KVM Paravirtualized virtio Drivers: https://access.redhat.com/articles/2488201

## Issues Found
- The supported guest OS list did not include minor-version caveats for newer guests. Updated the list to state that RHEL 10 requires a RHEL 9.6 or later KVM host and Windows Server 2025 requires a RHEL 9.4 or later KVM host on AMD64/Intel 64, matching Red Hat's certified guest matrix.
- The live migration requirements were simplified too much and implied that matching libvirt and QEMU versions are a requirement. Updated the bullets to reflect Red Hat's documented requirements: supported source and destination host versions and machine types, CPU feature compatibility, and shared storage or a supported storage-copy migration option.

## Review Notes
The resource limits, snapshot limitations, nested virtualization caveat, virt-host-validate usage, virsh CPU commands, and virtio-win guidance were checked against official Red Hat and libvirt documentation and are technically valid. The resource limits are version-specific and should be rechecked if Red Hat updates supported KVM limits for future RHEL 9 minor releases.
