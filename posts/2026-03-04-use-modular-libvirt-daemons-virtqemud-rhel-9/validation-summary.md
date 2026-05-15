# Validation Summary: How to Use Modular libvirt Daemons (virtqemud) on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- libvirt modular daemons
- virtqemud
- virtproxyd
- KVM/QEMU virtualization
- systemd services and sockets
- virsh
- journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Types of libvirt daemons" and "Enabling modular libvirt daemons": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/optimizing-virtual-machine-performance-in-rhel_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Generating libvirt debug logs": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/diagnosing-virtual-machine-problems_configuring-and-managing-virtualization
- Upstream libvirt documentation, "Libvirt Daemons": https://libvirt.org/daemons.html
- Upstream libvirt virtqemud man page: https://libvirt.org/manpages/virtqemud.html
- Upstream libvirt remote support documentation: https://libvirt.org/remote.html
- Upstream libvirt QEMU driver documentation: https://libvirt.org/drvqemu.html
- Upstream libvirt source template for daemon configuration: https://gitlab.com/libvirt/libvirt/-/raw/master/src/remote/libvirtd.conf.in

## Issues Found
No technical issues found.

## Review Notes
The logging configuration shown is syntactically valid, but upstream libvirt strongly discourages broad use of `log_level` for routine debugging and Red Hat's current RHEL 9 documentation emphasizes targeted `log_filters` and `log_outputs` when collecting debug logs. The post's switch-over commands align with Red Hat's documented modular daemon migration process, including the recommendation to shut down VMs first.
