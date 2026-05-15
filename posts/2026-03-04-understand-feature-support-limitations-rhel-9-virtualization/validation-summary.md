# Validation Summary: How to Understand Feature Support and Limitations in RHEL 9 Virtualization

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM
- QEMU
- libvirt and virsh
- virt-install
- Cockpit web console
- VM snapshots and live migration
- virtio devices and virtio-mem

## Sources Consulted
- Red Hat Documentation: Feature support and limitations in RHEL 9 virtualization - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_feature-support-and-limitations-in-rhel-9-virtualization_configuring-and-managing-virtualization
- Red Hat Customer Portal: Virtualization limits for Red Hat Enterprise Linux with KVM - https://access.redhat.com/articles/rhel-kvm-limits
- Red Hat Documentation: Saving and restoring virtual machine state by using snapshots - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/creating-virtual-machine-snapshots_configuring-and-managing-virtualization
- Red Hat Documentation: Migrating virtual machines - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/migrating-virtual-machines_configuring-and-managing-virtualization
- Red Hat Documentation: Optimizing virtual machine performance in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/optimizing-virtual-machine-performance-in-rhel_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9.7 Release Notes: Technology Previews and deprecated functionalities - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/9.7_release_notes/index

## Issues Found
- The i440fx statement was too specific about RHEL 7.6-and-later variants. Red Hat documents the unsupported boundary as `pc-i440fx-rhel7.5.0` and earlier, so the wording was changed to avoid an unsupported blanket claim.
- The memory limit table only described AMD64 and Intel 64 while the post discusses RHEL 9 virtualization more generally. The table now notes that ARM 64 and IBM Z have architecture-specific limits.
- The guest operating system section presented a broad fixed list, including CentOS Stream and Ubuntu, as directly supported. Red Hat support depends on the certified guest OS matrix, so the wording now points readers to certified guest OS support and avoids unsupported distribution-specific claims.
- The live migration section stated that PCI passthrough devices prevent live migration. Red Hat documents exceptions for specific supported devices, such as Mellanox CX-7 VF and NVIDIA vGPU scenarios, so the wording was narrowed.
- The CPU section said guest vCPUs cannot exceed host physical CPUs for optimal performance. vCPU overcommitment is possible but can affect performance, so the wording now reflects that.

## Review Notes
The commands shown are syntactically plausible for RHEL virtualization tooling. `virt-install --machine=q35`, `virt-host-validate`, `virsh version`, and `virsh domcapabilities` align with Red Hat's documented tooling, though real output depends on the host virtualization packages and privileges.
