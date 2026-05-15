# Validation Summary: How to Set Up Nested Virtualization on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM
- libvirt and virsh
- virt-install
- Nested virtualization
- Linux kernel KVM modules

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Creating nested virtual machines": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/creating-nested-virtual-machines_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation, "Enabling virtualization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_enabling-virtualization-in-rhel-9_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation, "Optimizing libvirt daemons": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_and_managing_virtualization/recommended-features-in-rhel-9-virtualization_feature-support-and-limitations-in-rhel-9-virtualization

## Issues Found
- The introduction did not mention RHEL 9 support limitations. Added that most Linux-in-Linux nested virtualization environments on RHEL 9 are Technology Preview, matching Red Hat's support documentation.
- The AMD nested parameter comment only listed `1` and `0`. Updated it to include `Y` and `N`, which Red Hat documents as possible return values.
- The verification command after enabling nesting always used `kvm_intel`. Clarified that AMD systems should use `kvm_amd`.
- The CPU XML suggested `host-model` for migration compatibility, but Red Hat's nested virtualization procedure uses `host-passthrough` or a custom CPU model with explicit `vmx` or `svm`. Replaced the `host-model` suggestion with Red Hat-style custom CPU examples.
- The KVM installation instructions used `dnf group install "Virtualization Host"` and enabled `libvirtd`. Updated this to the RHEL 9 documented packages and modular libvirt socket startup commands.
- The performance section claimed a specific 20-40% performance reduction and labeled a CPU model check as measuring overhead. Reworded this to a workload-dependent performance reduction and clarified what the command actually verifies.

## Review Notes
The remaining commands are broadly consistent with Red Hat's documented nested virtualization flow. The exact `virt-install --os-variant rhel9.4` value depends on the installed `libosinfo` database, so users on older hosts may need to update `osinfo-db` or choose the closest available RHEL 9 variant.
