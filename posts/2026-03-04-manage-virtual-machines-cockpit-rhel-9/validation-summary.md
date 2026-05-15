# Validation Summary: How to Manage Virtual Machines Using the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- KVM and QEMU
- libvirt and virsh
- virt-install and virt-viewer
- VM storage, networking, snapshots, migration, and monitoring

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and Managing Virtualization: Enabling virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_enabling-virtualization-in-rhel-9_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 Configuring and Managing Virtualization: Managing virtual machines in the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-machines-in-the-web-console_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 Configuring and Managing Virtualization: Creating virtual machines: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_creating-virtual-machines_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 Configuring and Managing Virtualization: VM snapshots: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/creating-virtual-machine-snapshots_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 Configuring and Managing Virtualization: VM networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/configuring-virtual-machine-network-connections_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 Configuring and Managing Virtualization: VM migration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/migrating-virtual-machines_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 release notes: deprecated libvirtd daemon: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.1_release_notes/deprecated_functionality
- libvirt virsh command reference: https://www.libvirt.org/manpages/virsh.html
- libvirt guest migration documentation: https://www.libvirt.org/migration.html
- QEMU qemu-img documentation: https://qemu.readthedocs.io/en/master/tools/qemu-img.html

## Issues Found
- The prerequisites used `@virtualization-host-environment` and enabled `libvirtd`. RHEL 9 documentation installs `qemu-kvm libvirt virt-install virt-viewer`, starts modular libvirt sockets, and notes that monolithic `libvirtd` is deprecated. Updated the commands accordingly and added Cockpit socket enablement.
- The KVM verification step used `lsmod | grep kvm`. Replaced it with `virt-host-validate`, which is the Red Hat documented validation command for virtualization hosts.
- The snapshot section said Cockpit creates internal snapshots. RHEL 9 supports snapshots only when they are external, with specific requirements such as RHEL 9.4 or later and file-based VM storage. Updated the explanation and adjusted the CLI snapshot example to create a disk-only external snapshot.
- The monitoring snippet used `virt-top`, which is not part of the Red Hat-documented RHEL 9 virtualization workflow consulted for this review. Removed it and kept the supported `virsh domstats` example.
- The migration section claimed Cockpit does not support live migration. Current RHEL 9 documentation includes live migration through the web console. Updated the text and added `--persistent` to the CLI migration example to match Red Hat's documented migration examples.

## Review Notes
Most commands and explanations were otherwise consistent with current libvirt, QEMU, and RHEL 9 documentation. Some UI labels in Cockpit can vary slightly by RHEL minor release, but the described workflows are valid.
