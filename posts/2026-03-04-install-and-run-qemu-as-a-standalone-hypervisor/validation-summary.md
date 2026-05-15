# Validation Summary: How to Install and Run QEMU as a Standalone Hypervisor on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- QEMU
- KVM
- libvirt
- virt-install
- virsh
- firewalld
- TuneD

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing virtualization - Introducing virtualization in RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/introducing-virtualization-in-rhel_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9: Configuring and managing virtualization - Enabling virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_enabling-virtualization-in-rhel-9_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9: Configuring and managing virtualization - Creating virtual machines: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_creating-virtual-machines_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9: Configuring and managing virtualization - Diagnosing virtual machine problems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/diagnosing-virtual-machine-problems_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9: Configuring and managing virtualization - Optimizing virtual machine performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/optimizing-virtual-machine-performance-in-rhel_configuring-and-managing-virtualization

## Issues Found
- The original post used placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, which would not work on RHEL. Replaced them with supported RHEL virtualization packages, service sockets, and `/etc/libvirt/virtqemud.conf`.
- The original post suggested a generic standalone service flow. Red Hat documents QEMU on RHEL as part of the KVM/libvirt virtualization stack and recommends using libvirt instead of direct `qemu-*` commands, so the setup now uses `qemu-kvm`, `libvirt`, `virt-install`, `virt-viewer`, `virsh`, and `virt-host-validate`.
- The dependency installation included `epel-release` and `Development Tools`, which are not required by Red Hat's documented QEMU/KVM virtualization setup. Removed those commands.
- The original firewall command used a placeholder firewalld service name. Replaced it with a documented VNC port example and clarified that basic default NAT networking usually does not require an additional firewall rule.
- The original validation and troubleshooting commands used non-existent generic service tests. Replaced them with `virt-host-validate`, `virsh list --all`, `virsh net-list --all`, and relevant libvirt daemon logs.
- The original performance tuning section monitored a placeholder service. Replaced it with Red Hat's documented `virtual-host` TuneD profile for virtualization hosts.

## Review Notes
The title still uses "standalone hypervisor," but the body now clarifies that on RHEL, QEMU is normally operated through KVM and libvirt rather than direct standalone `qemu-*` invocation. A future editorial pass could retitle the post to "How to Install and Run QEMU/KVM Virtualization on RHEL" for better precision.
