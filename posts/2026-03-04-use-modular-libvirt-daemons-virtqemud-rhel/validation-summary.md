# Validation Summary: How to Use Modular libvirt Daemons (virtqemud) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- libvirt modular daemons
- virtqemud
- virtproxyd
- libvirtd
- KVM/QEMU virtualization
- systemd service and socket units
- virsh and virt-admin

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Optimizing libvirt daemons": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/optimizing-virtual-machine-performance-in-rhel_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing virtualization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- libvirt documentation, "Libvirt Daemons": https://libvirt.org/daemons.html
- libvirt virtqemud manual page: https://www.libvirt.org/manpages/virtqemud.html
- libvirt virt-admin manual page: https://libvirt.org/manpages/virt-admin.html
- libvirt knowledge base, "Debug Logs": https://libvirt.org/kbase/debuglogs.html

## Issues Found
- The remote connection setup enabled only `virtproxyd`, `virtproxyd-ro`, and `virtproxyd-admin` sockets. Red Hat and upstream libvirt document that hosts previously using TLS remote access also need `virtproxyd-tls.socket`. Added a `listen_tls` check and TLS socket commands.
- The modular daemon enablement used `enable --now` for all modular sockets. This is valid systemd syntax, but Red Hat documents enable and start as separate steps, with services started by socket activation. Split the commands to match the documented flow more closely.
- The revert section disabled modular services but did not stop any currently running modular service units. Added `systemctl stop virt${drv}d.service` and `systemctl stop virtproxyd.service` before re-enabling monolithic `libvirtd`.

## Review Notes
The main architectural claims are correct for RHEL 9: fresh RHEL 9 installations use modular libvirt daemons by default, RHEL 8 upgrades can retain monolithic `libvirtd`, and Red Hat recommends switching to modular daemons because `libvirtd` is deprecated and planned to become unsupported in a future major RHEL release. The logging examples align with upstream libvirt debug logging guidance for `virt-admin` and `virtqemud:///system`.
