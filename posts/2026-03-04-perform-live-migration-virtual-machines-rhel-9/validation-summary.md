# Validation Summary: How to Perform Live Migration of Virtual Machines on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM/QEMU virtualization
- libvirt and virsh
- VM live migration
- Shared storage with NFS, iSCSI, Ceph, or GFS2
- SSH and TCP libvirt connections

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing virtualization, Chapter 12: Migrating virtual machines: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- Red Hat Enterprise Linux 9 Configuring and managing virtualization, Sharing virtual machine disk images with other hosts: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- Red Hat Enterprise Linux 9 Configuring and managing virtualization, Verifying host CPU compatibility for virtual machine migration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- Red Hat Enterprise Linux 9 Monitoring and managing system status and performance, Optimizing libvirt daemons: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/optimizing-virtual-machine-performance-in-rhel_monitoring-and-managing-system-status-and-performance
- libvirt virsh command reference: https://www.libvirt.org/manpages/virsh.html
- libvirt migration documentation: https://www.libvirt.org/migration.html

## Issues Found
- The post described live migration as "zero downtime" and said storage and network connections are transferred seamlessly. RHEL documentation describes live migration as keeping the VM running, but the final switchover can pause the VM for a configured maximum downtime. I changed the wording to "minimal downtime" and clarified that memory and device state are transferred while disk images remain accessible through shared storage or a non-shared storage migration option.
- The libvirt TCP configuration only showed `/etc/libvirt/libvirtd.conf`. Fresh RHEL 9 installations use modular libvirt daemons by default, and Red Hat documents enabling `virtqemud.socket` for SSH and `virtproxyd-tcp.socket` for TCP. I added the RHEL 9 socket commands and kept the `libvirtd.conf` snippet only for upgraded hosts that still use monolithic `libvirtd`.
- The `--live` option was described as "no downtime." I changed it to "without shutting down the VM" to avoid overstating the guarantee.
- The CPU incompatibility troubleshooting section suggested `virsh migrate --live --unsafe` for CPU differences. libvirt documents `--unsafe` as forcing migrations that may otherwise be considered unsafe, such as storage/cache safety concerns; Red Hat recommends calculating a common CPU baseline for CPU compatibility. I replaced the unsafe migration command with `virsh hypervisor-cpu-baseline` guidance and a baseline CPU XML example.

## Review Notes
The virsh migration commands, `--persistent`, `--undefinesource`, `--offline`, `domjobinfo`, `migrate-setspeed`, and `migrate-setmaxdowntime` usage were consistent with Red Hat and libvirt documentation. The local environment did not have `virsh` installed, so command verification relied on official documentation rather than local `--help` output.
