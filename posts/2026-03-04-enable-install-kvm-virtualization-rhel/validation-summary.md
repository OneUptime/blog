# Validation Summary: How to Enable and Install KVM Virtualization on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- KVM
- QEMU
- libvirt
- virsh
- virt-install
- virt-host-validate
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Enabling virtualization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_enabling-virtualization-in-rhel-9_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 8 documentation, "Getting started with virtualization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/configuring_and_managing_virtualization/index
- Red Hat Enterprise Linux 9 documentation, "Optimizing libvirt daemons": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/optimizing-virtual-machine-performance-in-rhel_monitoring-and-managing-system-status-and-performance
- libvirt virsh manual page: https://www.libvirt.org/manpages/virsh.html
- libvirt storage management documentation: https://libvirt.org/storage.html
- libvirt connection authentication documentation: https://libvirt.org/auth.html

## Issues Found
- The post treated RHEL virtualization setup as a single `libvirtd` workflow. Fresh RHEL 9 hosts use modular libvirt daemons by default, while RHEL 8 and some upgraded RHEL 9 hosts use `libvirtd`. Updated the service commands to show the correct modular socket workflow and the legacy `libvirtd` workflow.
- The package installation section used `dnf group install "Virtualization Host"`, which is not the command shown in current Red Hat RHEL 9 virtualization setup documentation. Replaced it with the documented package installation command and added the RHEL 8 virtualization module command.
- The hardware virtualization requirement was written as if Intel VT-x or AMD-V applied to all RHEL architectures. Scoped that statement to x86_64 systems.
- The `virt-host-validate` expectation said all checks should show `PASS`. Red Hat documentation shows that `WARN` results can be expected for tunable features and non-KVM checks can report `FAIL`. Updated the text to require KVM/QEMU PASS results and review of WARN/FAIL output.
- The default network and storage comments were too absolute. Adjusted them to account for libvirt package/default configuration and systems where the storage pool name differs.
- The `libvirt` group guidance was too broad. Clarified that it applies when the host uses group-based libvirt access.

## Review Notes
The commands are now accurate for the RHEL 8 and RHEL 9 flows covered by the post. RHEL 10 documentation names the default system storage pool differently in some contexts, so the storage section now tells readers to use the pool name reported by `virsh pool-list --all` if it is not `default`.
