# Validation Summary: How to Create a Virtual Machine Using the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- cockpit-machines
- KVM / QEMU
- libvirt
- firewalld
- virsh

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- Red Hat Enterprise Linux 9 documentation: Enabling virtualization - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_enabling-virtualization-in-rhel-9_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Creating virtual machines - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_creating-virtual-machines_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Managing virtual machines in the web console - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-machines-in-the-web-console_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Saving and restoring virtual machine state by using snapshots - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/creating-virtual-machine-snapshots_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9.5 release notes: Deprecated functionality - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/deprecated-functionalities

## Issues Found
- The post started `libvirtd` directly. In RHEL 9, the monolithic `libvirtd` daemon is deprecated, and fresh RHEL 9 installations use modular libvirt daemons by default. Updated the command to enable and start the modular libvirt sockets shown in Red Hat's RHEL 9 virtualization documentation.
- The post stated that Cockpit provides VM snapshots without qualification. Red Hat documents web-console snapshot creation for RHEL 9.4 or later and file-based VM storage. Updated the bullet to include those prerequisites.

## Review Notes
The remaining commands and claims align with Red Hat's RHEL 9 documentation: `cockpit.socket` runs the web console, port 9090 is opened with the `cockpit` firewalld service, the `cockpit-machines` add-on provides the Virtual Machines page, and VMs created through Cockpit are managed through the same libvirt backend visible to `virsh`.
