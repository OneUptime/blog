# Validation Summary: How to Set Up KVM/QEMU Virtualization on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- KVM
- QEMU
- libvirt
- virsh
- virt-install
- virt-manager
- virt-clone
- Netplan
- qemu-img

## Sources Consulted
- Ubuntu Server documentation: Libvirt - https://ubuntu.com/server/docs/how-to/virtualisation/libvirt/
- Ubuntu Server documentation: Virtual Machine Manager - https://ubuntu.com/server/docs/how-to/virtualisation/virtual-machine-manager/
- libvirt virsh manual - https://www.libvirt.org/manpages/virsh.html
- libvirt Network XML format - https://libvirt.org/formatnetwork.html
- libvirt Domain XML format - https://libvirt.org/formatdomain.html
- Ubuntu virt-install man page - https://manpages.ubuntu.com/manpages/jammy/man1/virt-install.1.html
- Netplan YAML configuration reference - https://netplan.readthedocs.io/en/latest/netplan-yaml/
- QEMU qemu-img documentation - https://qemu-project.gitlab.io/qemu/tools/qemu-img.html

## Issues Found
- The `LIBVIRT_DEFAULT_URI` export appeared after several `virsh` commands it was intended to affect, and the comment misspelled libvirt as "libvert". I moved the export before those checks and corrected the spelling.
- The "Resource Management" section was missing the markdown heading marker. I changed it to `## Resource Management`.
- The CPU pinning instructions said to add `<cputune>` to the `<vcpu>` section. libvirt documents `<cputune>` as a domain-level element, so I changed the instruction to add it to the domain XML.

## Review Notes
- The commands and configuration snippets are broadly accurate for Ubuntu 20.04, 22.04, and 24.04. Some examples, such as bridge interface names, ISO paths, OS variants, storage paths, and live migration targets, still need to be adapted to the reader's host.
- The qemu-img resize note correctly says the VM must be off; users must also resize guest partitions/filesystems after growing a disk before the new space is usable.
