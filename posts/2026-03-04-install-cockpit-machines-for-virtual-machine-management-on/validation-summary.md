# Validation Summary: How to Install Cockpit-Machines for Virtual Machine Management on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Cockpit / RHEL web console
- cockpit-machines
- KVM, QEMU, and libvirt
- systemd
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing virtual machines in the web console, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-machines-in-the-web-console_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- Red Hat Enterprise Linux 9 documentation: Enabling virtualization, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_enabling-virtualization-in-rhel-9_configuring-and-managing-virtualization

## Issues Found
- The original package installation command used the placeholder `sudo dnf install -y <package-name>`, which would not install Cockpit Machines. Replaced it with `sudo dnf install -y cockpit cockpit-machines qemu-kvm libvirt virt-install virt-viewer` based on Red Hat documentation for the RHEL web console add-on and virtualization packages.
- The original configuration section referenced a non-existent generic `/etc/<service>/config.conf` file and `<service-name>` service. Replaced it with the documented `cockpit.socket` enablement command and the RHEL 9 libvirt modular socket start command.
- The original service management and verification commands used `<service-name>` placeholders. Replaced them with checks for `cockpit.socket`, `virtqemud.socket`, `virt-host-validate`, and Cockpit logs.
- The original troubleshooting commands used placeholder package and service names. Replaced them with `journalctl -u cockpit.socket`, `rpm -q cockpit-machines`, and `virt-host-validate`.
- Fixed the description grammar from "on install" to "on installing."

## Review Notes
The post now covers the basic setup accurately for RHEL 9. Future improvements could add version-specific notes for non-x86 architectures or production networking/storage choices, but those are beyond the current post scope.
