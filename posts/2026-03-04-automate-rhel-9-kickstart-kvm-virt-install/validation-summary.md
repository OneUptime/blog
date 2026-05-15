# Validation Summary: How to Automate RHEL Deployments Using Kickstart on KVM with virt-install

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM
- QEMU
- libvirt
- virt-install
- Kickstart / Anaconda
- virsh
- Bash scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Enabling virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_enabling-virtualization-in-rhel-9_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Creating virtual machines by using the command line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_creating-virtual-machines_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Modular libvirt daemons: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/optimizing-virtual-machine-performance-in-rhel_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Kickstart commands and options reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/kickstart-commands-and-options-reference_rhel-installer
- Anaconda documentation: Boot options and `inst.ks`: https://anaconda-installer.readthedocs.io/en/latest/user-guide/boot-options.html
- virt-install manual page: https://manpages.debian.org/testing/virt-install/virt-install.1.en.html
- libvirt default network documentation: https://wiki.libvirt.org/Networking.html

## Issues Found
- The package installation command used `@virtualization-host-environment`, while current RHEL 9 documentation shows installing the relevant packages directly. Changed the command to install `qemu-kvm`, `libvirt`, `virt-install`, `virt-viewer`, and `libvirt-daemon-config-network`.
- The setup steps started `libvirtd`, but fresh RHEL 9 installs use modular libvirt daemons by default and Red Hat recommends modular daemons over the deprecated monolithic daemon. Changed the service setup to enable and start modular libvirt sockets.
- The Kickstart network line pinned the NIC to `enp1s0`, which is not guaranteed across VM hardware layouts. Changed it to `--device=link` so Anaconda uses the first linked interface.
- The Kickstart example omitted an explicit `bootloader` command. Added `bootloader --location=mbr --boot-drive=vda` for the target virtual disk.
- The `%post` script ran `dnf update -y` unconditionally, which can fail on unregistered RHEL systems or systems without configured update repositories. Changed it to `dnf update -y || true` and clarified that updates happen only when repositories are available.
- The `virt-install` examples used older `--ram` and `--os-variant` options. Updated them to the current documented `--memory` and `--osinfo` options.
- The examples used `--noautoconsole` without `--wait=-1`. The `virt-install` manual notes that `--noautoconsole` exits quickly, and multi-stage installs can be shut off after the install phase if `virt-install` does not remain running. Added `--wait=-1`.
- The batch script claimed parallel installs because of `--noautoconsole`, but adding `--wait=-1` requires explicit backgrounding to keep parallel behavior. Added `&` to each `virt-install` invocation and a final `wait`.
- The OS value lookup command used `osinfo-query os`; this can still work when `libosinfo-bin` is installed, but Red Hat documents `virt-install --osinfo list` for `--osinfo` values. Updated the example.

## Review Notes
The post uses RHEL 9.4 image names and `rhel9.4` OS info values. Those are version-specific examples and remain plausible, but future maintenance should update them if the post is intended to track the latest RHEL 9 minor release.
