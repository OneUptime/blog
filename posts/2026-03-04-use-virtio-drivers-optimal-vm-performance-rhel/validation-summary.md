# Validation Summary: How to Use virtio Drivers for Optimal VM Performance on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM/QEMU virtualization
- libvirt and virsh
- virt-install
- virtio-blk and virtio-scsi storage
- virtio-net networking
- virtio-balloon memory management
- fio storage benchmarking

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing virtual devices - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-devices_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Configuring and managing virtualization - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- libvirt Domain XML format - https://libvirt.org/formatdomain.html
- libvirt virsh command reference - https://www.libvirt.org/manpages/virsh.html
- virt-install manual page - https://manpages.debian.org/trixie/virt-install/virt-install.1.en.html
- fio manual page - https://manpages.debian.org/testing/fio/fio.1.en.html
- QEMU virtio-blk and virtio-scsi configuration guidance - https://www.qemu.org/2021/01/19/virtio-blk-scsi-configuration/

## Issues Found
No technical issues found.

## Review Notes
The post's main guidance matches RHEL 9 documentation: virtio devices are recommended where possible, virtio-blk and virtio-scsi are valid paravirtualized storage options, virtio-scsi provides more complete SCSI support and better disk scalability, libvirt commonly auto-adds a virtio memory balloon device, and the shown virsh attach-disk flags are valid. The virt-install option `--os-variant` is still accepted as an alias, though current virt-install documentation presents `--osinfo` as the preferred naming style.
